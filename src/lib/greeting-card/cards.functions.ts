import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CardTextDesign, GreetingMode } from "./types";

export const USER_CARD_BUCKET = "user-greeting-cards";
export const USER_DRAFT_BUCKET = "user-card-drafts";

/** Every column the account UI needs to render and re-edit a card. */
const CARD_COLUMNS =
  "id, status, prompt, keywords, greeting_mode, greeting_text, storage_bucket, storage_path, text_design, created_at, title, language, share_slug, is_shared, final_storage_path, view_count";

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
  .inputValidator(
    (input: {
      prompt: string;
      keywords?: string[];
      greetingText?: string;
      greetingMode?: GreetingMode;
      sessionKey?: string;
      replaceCardId?: string;
    }) => {
      const prompt = String(input?.prompt ?? "").trim();
      if (prompt.length < 3) throw new Error("prompt_too_short");
      return {
        prompt: prompt.slice(0, 1000),
        keywords: Array.isArray(input?.keywords)
          ? input.keywords
              .filter((k) => typeof k === "string")
              .slice(0, 30)
              .map((k) => k.slice(0, 60))
          : [],
        greetingText: String(input?.greetingText ?? "").slice(0, 4000),
        greetingMode:
          input?.greetingMode === "keywords" ? ("keywords" as const) : ("manual" as const),
        sessionKey: String(input?.sessionKey ?? "").slice(0, 64),
        replaceCardId: String(input?.replaceCardId ?? "").slice(0, 60),
      };
    },
  )
  .handler(async ({ data, context }): Promise<GenerateCardResult> => {
    const { runModel, ReplicateError, PRIMARY_MODEL, FALLBACK_MODEL } =
      await import("@/lib/replicate/replicate.server");
    const { toEnglishImagePrompt } = await import("./prompt-translate.server");
    const { attemptState } = await import("./attempts");

    // Every card creation carries its own attempt budget: five free ones, plus
    // five for each package the person paid for.
    let attemptRowId: string | null = null;
    let attemptsUsed = 0;
    if (data.sessionKey) {
      const { data: row } = await context.supabase
        .from("user_card_attempt_sessions")
        .select("id, attempts_used, extra_packs")
        .eq("user_id", context.userId)
        .eq("session_key", data.sessionKey)
        .maybeSingle();
      const state = attemptState(row?.attempts_used ?? 0, row?.extra_packs ?? 0);
      if (state.remaining <= 0) {
        return {
          ok: false,
          errorCode: "attempt_limit",
          errorMessage: "All generation attempts for this card have been used.",
        };
      }
      attemptRowId = row?.id ?? null;
      attemptsUsed = state.used;
    }

    // The person writes in their own language; the engine always receives English.
    const enginePrompt = await toEnglishImagePrompt(data.prompt);

    let imageSource: string | null = null;
    let imageBytes: Uint8Array | null = null;
    let imageContentType = "image/webp";
    let imageExtension = "webp";
    let lastError = { code: "generation_failed", message: "Image generation failed." };

    // The administrator decides in the Admin Panel which engine leads and
    // whether a backup may take over after a genuine technical failure.
    const { generatorOrder, withGeneratorSlot } =
      await import("@/lib/admin/generators/runtime.server");
    const MODEL_BY_KEY: Record<string, string> = {
      flux_schnell: PRIMARY_MODEL,
      flux_dev: FALLBACK_MODEL,
      flux_1_1_pro: "black-forest-labs/flux-1.1-pro",
    };
    // OpenAI image engines run through the shared gateway adapter, not Replicate.
    const GPT_BY_KEY: Record<string, { model: string; quality: "low" | "medium" | "high" }> = {
      gpt_image_1_mini: { model: "openai/gpt-image-1-mini", quality: "medium" },
    };
    const order = await generatorOrder("greeting_cards.image", [
      ...Object.keys(MODEL_BY_KEY),
      ...Object.keys(GPT_BY_KEY),
    ]);
    const chosen = order.length ? order : ["flux_schnell"];

    for (const key of chosen) {
      const gpt = GPT_BY_KEY[key];
      if (gpt) {
        try {
          const { renderGptImage } = await import("@/lib/ai/gpt-image.server");
          const rendered = await withGeneratorSlot(key, () =>
            renderGptImage({ model: gpt.model, quality: gpt.quality, prompt: enginePrompt }),
          );
          imageBytes = rendered.bytes;
          imageContentType = rendered.contentType;
          imageExtension = rendered.fileExtension;
          break;
        } catch (err) {
          const { GptImageError, isTerminalGptImageCode } =
            await import("@/lib/ai/gpt-image.server");
          if (err instanceof GptImageError) {
            lastError = { code: err.code, message: err.message };
            if (isTerminalGptImageCode(err.code)) break;
          } else {
            lastError = {
              code: "unknown",
              message: err instanceof Error ? err.message : "Unexpected error.",
            };
          }
          continue;
        }
      }
      const model = MODEL_BY_KEY[key];
      if (!model) continue;
      try {
        const { imageUrl } = await withGeneratorSlot(key, () => runModel(model, enginePrompt));
        imageSource = imageUrl;
        break;
      } catch (err) {
        if (err instanceof ReplicateError) {
          lastError = { code: err.code, message: err.message };
          if (
            err.code === "missing_token" ||
            err.code === "invalid_token" ||
            err.code === "insufficient_credit"
          ) {
            break;
          }
        } else {
          lastError = {
            code: "unknown",
            message: err instanceof Error ? err.message : "Unexpected error.",
          };
        }
      }
    }

    if (!imageSource && !imageBytes)
      return { ok: false, errorCode: lastError.code, errorMessage: lastError.message };

    let bytes: Uint8Array;
    if (imageBytes) {
      bytes = imageBytes;
    } else {
      const res = await fetch(imageSource!);
      if (!res.ok) {
        return {
          ok: false,
          errorCode: "download_failed",
          errorMessage: `Could not download the artwork (${res.status}).`,
        };
      }
      bytes = new Uint8Array(await res.arrayBuffer());
    }
    const storagePath = `${context.userId}/${crypto.randomUUID()}.${imageExtension}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upload = await supabaseAdmin.storage
      .from(USER_CARD_BUCKET)
      .upload(storagePath, bytes, { contentType: imageContentType, upsert: false });
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
      return {
        ok: false,
        errorCode: "db_failed",
        errorMessage: error?.message ?? "Could not save the card.",
      };
    }

    const signed = await supabaseAdmin.storage
      .from(USER_CARD_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24);

    // Only a genuinely successful generation costs an attempt.
    if (data.sessionKey) {
      if (attemptRowId) {
        await context.supabase
          .from("user_card_attempt_sessions")
          .update({ attempts_used: attemptsUsed + 1, updated_at: new Date().toISOString() })
          .eq("id", attemptRowId);
      } else {
        await context.supabase.from("user_card_attempt_sessions").insert({
          user_id: context.userId,
          session_key: data.sessionKey,
          attempts_used: 1,
        });
      }
    }

    // The previous version leaves the account only now, once the new one is
    // safely stored, so a failed attempt never loses the current card.
    if (data.replaceCardId && data.replaceCardId !== row.id) {
      const { moveCardToDrafts } = await import("./reject.server");
      try {
        await moveCardToDrafts(
          data.replaceCardId,
          context.userId,
          (context.claims as { email?: string } | null)?.email ?? null,
        );
      } catch {
        // The new card is already in place; the old one stays untouched.
      }
    }

    return {
      ok: true,
      cardId: row.id,
      storagePath,
      imageUrl: signed.data?.signedUrl ?? "",
    };
  });

/**
 * The person downloaded or sent the finished card: the order is complete. The
 * card leaves the workflow and the personal account for good, while the public
 * link the recipient received keeps working.
 */
export const markCardDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; channel?: string }) => {
    if (!input?.cardId) throw new Error("cardId is required");
    return {
      cardId: String(input.cardId).slice(0, 60),
      channel: String(input?.channel ?? "").slice(0, 40) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_greeting_cards")
      .update({ delivered_at: new Date().toISOString(), status: "delivered" })
      .eq("id", data.cardId)
      .eq("user_id", context.userId)
      .is("delivered_at", null);
    if (error) throw new Error(error.message);
    await context.supabase.from("user_card_events").insert({
      card_id: data.cardId,
      owner_user_id: context.userId,
      event_type: "delivered",
      channel: data.channel,
    });
    return { ok: true as const };
  });

/**
 * Saves (or re-saves) the whole editable project of one card: greeting, all
 * design settings, title, language and the rendered final picture. Always an
 * update of the same record, so repeated clicks can never create duplicates.
 */
export const saveCardProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      cardId: string;
      title?: string;
      language?: string;
      greetingText: string;
      greetingMode: GreetingMode;
      keywords: string[];
      prompt: string;
      textDesign: CardTextDesign;
      finalStoragePath?: string | null;
      enableShare?: boolean;
    }) => {
      if (!input?.cardId) throw new Error("cardId is required");
      return {
        cardId: input.cardId,
        title: String(input.title ?? "").slice(0, 160),
        language: String(input.language ?? "en").slice(0, 5),
        greetingText: String(input.greetingText ?? "").slice(0, 4000),
        greetingMode:
          input.greetingMode === "keywords" ? ("keywords" as const) : ("manual" as const),
        keywords: Array.isArray(input.keywords) ? input.keywords.slice(0, 30) : [],
        prompt: String(input.prompt ?? "").slice(0, 1000),
        textDesign: input.textDesign,
        finalStoragePath: input.finalStoragePath
          ? String(input.finalStoragePath).slice(0, 400)
          : null,
        enableShare: input.enableShare !== false,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("user_greeting_cards")
      .select("id, share_slug, final_storage_path")
      .eq("id", data.cardId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("card_not_found");

    const shareSlug =
      existing.share_slug ??
      (data.enableShare ? crypto.randomUUID().replace(/-/g, "").slice(0, 22) : null);

    const { error } = await context.supabase
      .from("user_greeting_cards")
      .update({
        title: data.title || null,
        language: data.language,
        greeting_text: data.greetingText,
        greeting_mode: data.greetingMode,
        keywords: data.keywords,
        prompt: data.prompt,
        text_design: JSON.parse(JSON.stringify(data.textDesign)),
        status: "saved",
        final_storage_bucket: data.finalStoragePath ? USER_CARD_BUCKET : undefined,
        final_storage_path: data.finalStoragePath ?? existing.final_storage_path,
        share_slug: shareSlug,
        is_shared: data.enableShare,
      })
      .eq("id", data.cardId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return { ok: true as const, cardId: data.cardId, shareSlug };
  });

/** Records a share, view or download for future history and statistics. */
export const logCardEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; eventType: string; channel?: string }) => ({
    cardId: String(input?.cardId ?? ""),
    eventType: String(input?.eventType ?? "").slice(0, 40) || "unknown",
    channel: input?.channel ? String(input.channel).slice(0, 40) : null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.cardId) return { ok: false as const };
    await context.supabase.from("user_card_events").insert({
      card_id: data.cardId,
      owner_user_id: context.userId,
      event_type: data.eventType,
      channel: data.channel,
    });
    return { ok: true as const };
  });

/** Loads one of the person's own cards for re-editing. */
export const getOwnCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => ({ cardId: String(input?.cardId ?? "") }))
  .handler(async ({ data, context }): Promise<OwnCardRow | null> => {
    if (!data.cardId) return null;
    const { data: row, error } = await context.supabase
      .from("user_greeting_cards")
      .select(CARD_COLUMNS)
      .eq("id", data.cardId)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .is("delivered_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 60 * 60 * 12);
    return {
      ...row,
      keywords: row.keywords ?? [],
      text_design: (row.text_design ?? {}) as OwnCardRow["text_design"],
      image_url: signed.data?.signedUrl ?? null,
    } as OwnCardRow;
  });

/** Public read of a shared card by its link code. No sign-in required. */
export const getSharedCard = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input?.slug ?? "").slice(0, 40) }))
  .handler(async ({ data }) => {
    if (!data.slug) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_greeting_cards")
      .select(
        "id, title, greeting_text, text_design, language, storage_bucket, storage_path, final_storage_bucket, final_storage_path, view_count",
      )
      .eq("share_slug", data.slug)
      .eq("is_shared", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (!row) return null;

    const bucket = row.final_storage_path
      ? (row.final_storage_bucket ?? USER_CARD_BUCKET)
      : row.storage_bucket;
    const path = row.final_storage_path ?? row.storage_path;
    const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);

    await supabaseAdmin
      .from("user_greeting_cards")
      .update({ view_count: (row.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq("id", row.id);

    return {
      id: row.id,
      title: row.title,
      greetingText: row.greeting_text ?? "",
      textDesign: (row.text_design ?? {}) as OwnCardRow["text_design"],
      language: row.language,
      /** Already-composed picture when available, otherwise the raw artwork. */
      isComposed: Boolean(row.final_storage_path),
      imageUrl: signed.data?.signedUrl ?? null,
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
        greetingMode:
          input.greetingMode === "keywords" ? ("keywords" as const) : ("manual" as const),
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

    // Deleting moves the card into the administrator recycle bin instead of
    // erasing it, so an accidental deletion can still be restored.
    const { readRetentionDays } = await import("@/lib/admin/deleted-cards.server");
    const days = await readRetentionDays();
    const now = new Date();
    const purgeAfter = new Date(now.getTime() + days * 86_400_000);

    const { error } = await context.supabase
      .from("user_greeting_cards")
      .update({
        deleted_at: now.toISOString(),
        purge_after: purgeAfter.toISOString(),
        deleted_by: context.userId,
        is_shared: false,
      })
      .eq("id", card.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
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
  title: string | null;
  language: string;
  share_slug: string | null;
  is_shared: boolean;
  final_storage_path: string | null;
  view_count: number;
  image_url: string | null;
};

/** Lists the person's own cards with fresh signed image links. */
export const listOwnCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string } | undefined) => ({ status: input?.status }))
  .handler(async ({ data, context }): Promise<OwnCardRow[]> => {
    let query = context.supabase
      .from("user_greeting_cards")
      .select(CARD_COLUMNS)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .is("delivered_at", null)
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
      en: "English",
      ru: "Russian",
      de: "German",
      uk: "Ukrainian",
      fr: "French",
      pl: "Polish",
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
      return {
        ok: false,
        text: "",
        errorMessage: res.status === 429 ? "rate_limited" : "service_unavailable",
      };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false, text: "", errorMessage: "service_unavailable" };
    return { ok: true, text };
  });
