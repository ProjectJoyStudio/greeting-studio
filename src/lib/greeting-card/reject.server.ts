// Server-only helper: moves one user card out of the account and into the
// administrator-only "User Drafts" area. Shared by the explicit "create
// another" action and by the automatic replacement of a superseded card.
import { USER_CARD_BUCKET, USER_DRAFT_BUCKET } from "./buckets";

export async function moveCardToDrafts(
  cardId: string,
  userId: string,
  userEmail: string | null,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: card } = await supabaseAdmin
    .from("user_greeting_cards")
    .select("id, user_id, prompt, keywords, greeting_text, storage_path")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!card) return;

  const draftPath = `${userId}/${card.storage_path.split("/").pop() ?? `${card.id}.webp`}`;
  const download = await supabaseAdmin.storage.from(USER_CARD_BUCKET).download(card.storage_path);
  if (download.data) {
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    await supabaseAdmin.storage
      .from(USER_DRAFT_BUCKET)
      .upload(draftPath, bytes, { contentType: "image/webp", upsert: true });
  }

  await supabaseAdmin.from("user_card_drafts").insert({
    user_id: card.user_id,
    user_email: userEmail,
    prompt: card.prompt,
    keywords: card.keywords ?? [],
    greeting_text: card.greeting_text ?? "",
    storage_bucket: USER_DRAFT_BUCKET,
    storage_path: draftPath,
    source_card_id: card.id,
  });

  await supabaseAdmin.storage.from(USER_CARD_BUCKET).remove([card.storage_path]);
  await supabaseAdmin.from("user_greeting_cards").delete().eq("id", card.id);
}
