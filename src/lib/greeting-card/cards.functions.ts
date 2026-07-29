import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CardTextDesign, GreetingMode } from "./types";

export const USER_CARD_BUCKET = "user-greeting-cards";
export const USER_DRAFT_BUCKET = "user-card-drafts";

export type GenerateCardResult =
  | { ok: true; cardId: string; imageUrl: string; storagePath: string }
  | { ok: false; errorCode: string; errorMessage: string };

/**
 * Generates the artwork with the existing image engine, stores it in the
 * user's own private folder and creates the card record straight away, so the
 * person never has to save anything by hand.
 */
export const generateCardImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; keywords?: string[]; greetingText?: string; greetingMode?: GreetingMode }) => {
    const prompt = String(input?.prompt ?? "").trim();
    if (prompt.length < 3) throw new Error("prompt_too_short");
    return {
      prompt: prompt.slice(0, 1000),
      keywords: Array.isArray(input?.keywords)
        ? input.keywords.filter((k) => typeof k === "string").slice(0, 30).map((k) => k.slice(0, 60))
        : [],
      greetingText: String(input?.greetingText ?? "").slice(0, 4000),
      greetingMode: input?.greetingMode === "keywords" ? ("keywords" as const) : ("manual" as const),
    };
  })
  .handler(async ({ data, context }): Promise<GenerateCardResult> => {
    const { runModel, ReplicateError, PRIMARY_MODEL, FALLBACK_MODEL } = await import(
      "@/lib/replicate/replicate.server"
    );
    const { toEnglishImagePrompt } = await import("./prompt-translate.server");

    // The person writes in their own language; the engine always receives English.
    const enginePrompt = await toEnglishImagePrompt(data.prompt);

    let imageSource: string | null = null;
    let lastError = { code: "generation_failed", message: "Image generation failed." };

    for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        const { imageUrl } = await runModel(model, enginePrompt);
        imageSource = imageUrl;
        break;
      } catch (err) {
        if (err instanceof ReplicateError) {
          lastError = { code: err.code, message: err.message };
          if (err.code === "missing_token" || err.code === "invalid_token" || err.code === "insufficient_credit") {
            break;
          }
        } else {
          lastError = { code: "unknown", message: err instanceof Error ? err.message : "Unexpected error." };
        }
      }
    }

    if (!imageSource) return { ok: false, errorCode: lastError.code, errorMessage: lastError.message };

    const res = await fetch(imageSource);
    if (!res.ok) {
      return { ok: false, errorCode: "download_failed", errorMessage: `Could not download the artwork (${res.status}).` };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const storagePath = `${context.userId}/${crypto.randomUUID()}.webp`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage
      .from(USER_CARD_BUCKET)
      .upload(storagePath, bytes, { contentType: "image/webp", upsert: false });
    if (upload.error) {
      return { ok: false, errorCode: "storage_failed", errorMessage: upload.error.message };
    }

    const { data: row, error } = await context.supabase
      .from("user_greeting_cards")
      .insert({
        user_id: context.userId,
        status: "preview",
        prompt: data.prompt,
        keywords: data.keywords,
        greeting_mode: data.greetingMode,
        greeting_text: data.greetingText,
        storage_bucket: USER_CARD_BUCKET,
        storage_path: storagePath,
      })
      .select("id")
      .single();
    if (error || !row) {
      await supabaseAdmin.storage.from(USER_CARD_BUCKET).remove([storagePath]);
      return { ok: false, errorCode: "db_failed", errorMessage: error?.message ?? "Could not save the card." };
    }

    const signed = await supabaseAdmin.storage.from(USER_CARD_BUCKET).createSignedUrl(storagePath, 60 * 60 * 24);
    return {
      ok: true,
      cardId: row.id,
      storagePath,
      imageUrl: signed.data?.signedUrl ?? "",
    };
  });

/** Writes the greeting, styling and final status onto an existing card. */
export const saveCardDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      cardId: string;
      greetingText: string;
      greetingMode: GreetingMode;
      keywords: string[];
      prompt: string;
      textDesign: CardTextDesign;
      finalize?: boolean;
    }) => {
      if (!input?.cardId) throw new Error("cardId is required");
      return {
        cardId: input.cardId,
        greetingText: String(input.greetingText ?? "").slice(0, 4000),
        greetingMode: input.greetingMode === "keywords" ? ("keywords" as const) : ("manual" as const),
        keywords: Array.isArray(input.keywords) ? input.keywords.slice(0, 30) : [],
        prompt: String(input.prompt ?? "").slice(0, 1000),
        textDesign: input.textDesign,
        finalize: input.finalize !== false,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_greeting_cards")
      .update({
        greeting_text: data.greetingText,
        greeting_mode: data.greetingMode,
        keywords: data.keywords,
        prompt: data.prompt,
        text_design: JSON.parse(JSON.stringify(data.textDesign)),
        status: data.finalize ? "saved" : "preview",
      })
      .eq("id", data.cardId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * The person rejected the card: it leaves their account for good and is moved
 * into the administrator-only "User Drafts" area, in its own storage folder.
 */
export const rejectCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    if (!input?.cardId) throw new Error("cardId is required");
    return { cardId: input.cardId };
  })
  .handler(async ({ data, context }) => {
    const { data: card, error } = await context.supabase
      .from("user_greeting_cards")
      .select("id, user_id, prompt, keywords, greeting_text, storage_path")
      .eq("id", data.cardId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!card) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const draftPath = `${context.userId}/${card.storage_path.split("/").pop() ?? `${card.id}.webp`}`;

    const download = await supabaseAdmin.storage.from(USER_CARD_BUCKET).download(card.storage_path);
    if (download.data) {
      const bytes = new Uint8Array(await download.data.arrayBuffer());
      await supabaseAdmin.storage
        .from(USER_DRAFT_BUCKET)
        .upload(draftPath, bytes, { contentType: "image/webp", upsert: true });
    }

    await supabaseAdmin.from("user_card_drafts").insert({
      user_id: card.user_id,
      user_email: (context.claims as { email?: string } | null)?.email ?? null,
      prompt: card.prompt,
      keywords: card.keywords ?? [],
      greeting_text: card.greeting_text ?? "",
      storage_bucket: USER_DRAFT_BUCKET,
      storage_path: draftPath,
      source_card_id: card.id,
    });

    await supabaseAdmin.storage.from(USER_CARD_BUCKET).remove([card.storage_path]);
    await supabaseAdmin.from("user_greeting_cards").delete().eq("id", card.id);

    return { ok: true as const };
  });

/** Deletes one of the person's own saved cards, image included. */
export const deleteOwnCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => {
    if (!input?.cardId) throw new Error("cardId is required");
    return { cardId: input.cardId };
  })
  .handler(async ({ data, context }) => {
    const { data: card } = await context.supabase
      .from("user_greeting_cards")
      .select("id, storage_path")
      .eq("id", data.cardId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!card) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(USER_CARD_BUCKET).remove([card.storage_path]);
    await context.supabase.from("user_greeting_cards").delete().eq("id", card.id).eq("user_id", context.userId);
    return { ok: true as const };
  });

export type OwnCardRow = {
  id: string;
  status: string;
  prompt: string;
  keywords: string[];
  greeting_mode: string;
  greeting_text: string;
  storage_bucket: string;
  storage_path: string;
  text_design: Record<string, number | string | boolean | null>;
  created_at: string;
  image_url: string | null;
};

/** Lists the person's own cards with fresh signed image links. */
export const listOwnCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string } | undefined) => ({ status: input?.status }))
  .handler(async ({ data, context }): Promise<OwnCardRow[]> => {
    let query = context.supabase
      .from("user_greeting_cards")
      .select("id, status, prompt, keywords, greeting_mode, greeting_text, storage_bucket, storage_path, text_design, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all(
      (rows ?? []).map(async (r) => {
        const signed = await supabaseAdmin.storage
          .from(r.storage_bucket)
          .createSignedUrl(r.storage_path, 60 * 60 * 12);
        return {
          ...r,
          keywords: r.keywords ?? [],
          text_design: (r.text_design ?? {}) as OwnCardRow["text_design"],
          image_url: signed.data?.signedUrl ?? null,
        } satisfies OwnCardRow;
      }),
    );
  });

/** Writes a greeting from the person's keywords. Always editable afterwards. */
export const composeGreetingFromKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keywords: string[]; language: string; occasion?: string }) => ({
    keywords: (Array.isArray(input?.keywords) ? input.keywords : [])
      .filter((k) => typeof k === "string" && k.trim())
      .slice(0, 20)
      .map((k) => k.trim().slice(0, 60)),
    language: String(input?.language ?? "en").slice(0, 5),
    occasion: String(input?.occasion ?? "").slice(0, 120),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; text: string; errorMessage?: string }> => {
    if (data.keywords.length === 0) return { ok: false, text: "", errorMessage: "no_keywords" };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, text: "", errorMessage: "service_unavailable" };

    const languageNames: Record<string, string> = {
      en: "English", ru: "Russian", de: "German", uk: "Ukrainian", fr: "French", pl: "Polish",
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You write warm, elegant greeting-card wishes for Project Joy. Return only the greeting itself: 2 to 5 short lines, no quotes, no explanations, no hashtags, no mention of tools or technology.",
          },
          {
            role: "user",
            content: `Write a greeting in ${languageNames[data.language] ?? "English"} based on these keywords: ${data.keywords.join(", ")}.${
              data.occasion ? ` Occasion: ${data.occasion}.` : ""
            }`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Greeting composition failed [${res.status}]: ${body.slice(0, 400)}`);
      return { ok: false, text: "", errorMessage: res.status === 429 ? "rate_limited" : "service_unavailable" };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false, text: "", errorMessage: "service_unavailable" };
    return { ok: true, text };
  });