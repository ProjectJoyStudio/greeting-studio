import { supabase } from "@/integrations/supabase/client";
import { composeFinalCard } from "./compose";
import type { CardTextDesign } from "./types";

export const USER_CARD_BUCKET = "user-greeting-cards";

/**
 * Renders the final postcard (artwork + greeting) and stores it next to the
 * raw artwork. The path is derived from the card id, so re-saving always
 * overwrites the same object instead of piling up copies.
 */
export async function uploadFinalCardImage(
  userId: string,
  cardId: string,
  imageUrl: string,
  text: string,
  design: CardTextDesign,
): Promise<string> {
  const blob = await composeFinalCard(imageUrl, text, design);
  const path = `${userId}/final/${cardId}.png`;
  const { error } = await supabase.storage
    .from(USER_CARD_BUCKET)
    .upload(path, blob, { contentType: "image/png", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
