type UserSupabase = {
  from: (table: string) => any;
};

/** Every speech action is tied to an owned, active Personal Video project. */
export async function assertPvgOwner(
  supabase: UserSupabase,
  projectId: string,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("pvg_projects")
    .select("id, user_id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .is("delivered_at", null)
    .maybeSingle();
  if (!data || (data as { user_id: string }).user_id !== userId) {
    throw new Error("project_not_found");
  }
}

export async function assignLibraryVoice(
  supabase: UserSupabase,
  data: {
    projectId: string;
    personId: string;
    voiceId: string | null;
    voiceName?: string | null;
    provider?: string | null;
    category?: "female" | "male" | "children" | null;
    confirmed?: boolean;
  },
): Promise<void> {
  const { error } = await supabase
    .from("pvg_people")
    .update({
      voice_id: data.voiceId,
      personal_voice_id: null,
      voice_name: data.voiceId ? (data.voiceName ?? null) : null,
      voice_provider: data.voiceId ? (data.provider ?? null) : null,
      voice_source: data.voiceId ? "library" : null,
      ...(data.category !== undefined ? { voice_category: data.category } : {}),
      voice_confirmed: data.voiceId ? Boolean(data.confirmed) : false,
    })
    .eq("id", data.personId)
    .eq("project_id", data.projectId);
  if (error) throw new Error(error.message);
}

export async function saveVoiceChoice(
  supabase: UserSupabase,
  data: {
    projectId: string;
    personId: string;
    category?: "female" | "male" | "children" | null;
    confirmed?: boolean;
  },
): Promise<void> {
  const patch: { voice_category?: string | null; voice_confirmed?: boolean } = {};
  if (data.category !== undefined) patch.voice_category = data.category;
  if (data.confirmed !== undefined) patch.voice_confirmed = data.confirmed;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase
    .from("pvg_people")
    .update(patch)
    .eq("id", data.personId)
    .eq("project_id", data.projectId);
  if (error) throw new Error(error.message);
}

export async function saveSpeechSettings(
  supabase: UserSupabase,
  data: {
    projectId: string;
    speechMode: "single" | "parts" | "chorus";
    syncMode: "simultaneous" | "delayed";
    chorusVoiceIds: string[];
    speakerPersonId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("pvg_projects")
    .update({
      speech_mode: data.speechMode,
      sync_mode: data.syncMode,
      chorus_voice_ids: data.chorusVoiceIds.slice(0, 5),
      ...(data.speakerPersonId !== undefined
        ? { single_speaker_person_id: data.speakerPersonId }
        : {}),
    })
    .eq("id", data.projectId);
  if (error) throw new Error(error.message);
}

export async function savePersonPart(
  supabase: UserSupabase,
  projectId: string,
  personId: string,
  partText: string,
): Promise<void> {
  const { error } = await supabase
    .from("pvg_people")
    .update({ part_text: partText })
    .eq("id", personId)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
}

export async function assignPersonalVoiceToPerson(
  supabase: UserSupabase,
  userId: string,
  data: {
    projectId: string;
    personId: string;
    voiceId: string | null;
    voiceName?: string | null;
    style?: string | null;
  },
): Promise<void> {
  if (data.voiceId) {
    const { data: owned } = await supabase
      .from("pvg_personal_voices")
      .select("id, processing_status, provider_voice_id")
      .eq("id", data.voiceId)
      .eq("user_id", userId)
      .maybeSingle();
    const voice = owned as
      | { processing_status?: string; provider_voice_id?: string | null }
      | null;
    if (!voice) throw new Error("voice_not_found");
    if (voice.processing_status !== "ready" || !voice.provider_voice_id) {
      throw new Error("voice_not_ready");
    }
  }
  const { error } = await supabase
    .from("pvg_people")
    .update({
      personal_voice_id: data.voiceId,
      ...(data.voiceId ? { voice_id: null } : {}),
      voice_name: data.voiceId ? (data.voiceName ?? null) : null,
      voice_source: data.voiceId ? "recording" : null,
      voice_confirmed: Boolean(data.voiceId),
      speaking_style: data.voiceId ? (data.style ?? "natural") : null,
    })
    .eq("id", data.personId)
    .eq("project_id", data.projectId);
  if (error) throw new Error(error.message);
}

export async function savePersonalVoiceStyleForPerson(
  supabase: UserSupabase,
  projectId: string,
  personId: string,
  style: string,
): Promise<void> {
  const { error } = await supabase
    .from("pvg_people")
    .update({ speaking_style: style })
    .eq("id", personId)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
}