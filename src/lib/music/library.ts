// Reading and managing the Project Joy music library, and keeping the music a
// customer brings for one single project.

import { supabase } from "@/integrations/supabase/client";

import {
  MUSIC_LIBRARY_BUCKET,
  MUSIC_UPLOAD_BUCKET,
  type MusicTrack,
} from "./types";

const SIGNED_TTL = 60 * 60 * 12;

interface Row {
  id: string;
  title: string;
  category: string;
  storage_bucket: string;
  storage_path: string;
  duration_seconds: number | string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

function mapRow(r: Row): MusicTrack {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    storageBucket: r.storage_bucket,
    storagePath: r.storage_path,
    durationSeconds: Number(r.duration_seconds ?? 0),
    isActive: Boolean(r.is_active),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: r.created_at,
  };
}

/** A playable link for one stored file. */
export async function musicUrl(
  bucket: string | null,
  path: string | null,
): Promise<string | null> {
  if (!bucket || !path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

async function withUrls(tracks: MusicTrack[]): Promise<MusicTrack[]> {
  return Promise.all(
    tracks.map(async (track) => ({
      ...track,
      audioUrl: await musicUrl(track.storageBucket, track.storagePath),
    })),
  );
}

/** The music a customer may choose from: active tracks only, in order. */
export async function fetchActiveTracks(): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return withUrls(((data ?? []) as unknown as Row[]).map(mapRow));
}

/** The whole library, including tracks an administrator switched off. */
export async function fetchAllTracks(): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return withUrls(((data ?? []) as unknown as Row[]).map(mapRow));
}

/** Reads the length of an audio file in the browser, before it is stored. */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Math.round(value * 10) / 10 || 0);
    };
    audio.addEventListener("loadedmetadata", () =>
      done(Number.isFinite(audio.duration) ? audio.duration : 0),
    );
    audio.addEventListener("error", () => done(0));
    audio.src = url;
  });
}

function extensionOf(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "mp3";
}

/** Adds one new track to the Project Joy library. */
export async function uploadLibraryTrack(input: {
  file: File;
  title: string;
  category: string;
}): Promise<void> {
  const duration = await readAudioDuration(input.file);
  const path = `${crypto.randomUUID()}.${extensionOf(input.file)}`;
  const { error: upErr } = await supabase.storage
    .from(MUSIC_LIBRARY_BUCKET)
    .upload(path, input.file, {
      upsert: false,
      contentType: input.file.type || "audio/mpeg",
    });
  if (upErr) throw upErr;

  const { data: last } = await supabase
    .from("music_tracks")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = Number((last?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("music_tracks").insert({
    title: input.title.trim() || input.file.name.replace(/\.[^.]+$/, ""),
    category: input.category,
    storage_bucket: MUSIC_LIBRARY_BUCKET,
    storage_path: path,
    duration_seconds: duration,
    sort_order: nextOrder,
  } as never);
  if (error) throw error;
}

export async function updateTrack(
  id: string,
  patch: Partial<{
    title: string;
    category: string;
    is_active: boolean;
    sort_order: number;
  }>,
): Promise<void> {
  const { error } = await supabase.from("music_tracks").update(patch as never).eq("id", id);
  if (error) throw error;
}

/**
 * Removes a track from the library. Projects that already chose it keep their
 * own copy of its details, so nothing saved earlier breaks.
 */
export async function deleteTrack(track: MusicTrack): Promise<void> {
  const { error } = await supabase.from("music_tracks").delete().eq("id", track.id);
  if (error) throw error;
  await supabase.storage.from(track.storageBucket).remove([track.storagePath]).catch(() => undefined);
}

/** Music a customer brings, stored for this one project only. */
export async function uploadCustomerMusic(
  projectId: string,
  file: File,
): Promise<{ bucket: string; path: string; name: string; durationSeconds: number }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("not_authenticated");
  const duration = await readAudioDuration(file);
  const path = `${userId}/${projectId}/${Date.now()}.${extensionOf(file)}`;
  const { error } = await supabase.storage
    .from(MUSIC_UPLOAD_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "audio/mpeg" });
  if (error) throw error;
  return {
    bucket: MUSIC_UPLOAD_BUCKET,
    path,
    name: file.name,
    durationSeconds: duration,
  };
}

export async function removeCustomerMusic(bucket: string, path: string): Promise<void> {
  await supabase.storage.from(bucket).remove([path]);
}