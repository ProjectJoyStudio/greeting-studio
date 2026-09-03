// ---------------------------------------------------------------------------
// Runware engine catalogue. Client-safe: model identifiers only, no keys.
//
// Runware is an independent provider. Nothing here goes through the Lovable AI
// gateway or through Replicate.
// ---------------------------------------------------------------------------

export interface RunwareImageModel {
  /** Stable generator key used by Admin → Generators. */
  key: string;
  /** Runware AIR identifier. */
  air: string;
  /** Human model name shown in the admin panel. */
  label: string;
  /** True when the model accepts reference images for identity keeping. */
  supportsReferenceImages: boolean;
}

export interface RunwareVideoModel {
  key: string;
  air: string;
  label: string;
  /** True when the model accepts a prepared voice track as input. */
  supportsAudioInput: boolean;
  /**
   * True when the model keeps a prepared voice track in the finished film,
   * verified against the provider. Only such a model may serve the Personal
   * Video final film, whose greeting voice must be heard.
   */
  supportsPreparedAudio: boolean;
  /** Shortest / longest length the model accepts, in seconds. */
  minDuration: number;
  maxDuration: number;
}

export const RUNWARE_IMAGE_MODELS: Record<string, RunwareImageModel> = {
  rw_z_image_turbo: {
    key: "rw_z_image_turbo",
    air: "runware:z-image@turbo",
    label: "Z-Image-Turbo",
    supportsReferenceImages: false,
  },
  rw_flux2_dev: {
    key: "rw_flux2_dev",
    air: "runware:400@1",
    label: "FLUX.2 [dev]",
    supportsReferenceImages: true,
  },
  rw_krea2_medium_turbo: {
    key: "rw_krea2_medium_turbo",
    air: "krea:krea@2-medium-turbo",
    label: "Krea 2 Medium Turbo",
    supportsReferenceImages: true,
  },
  rw_flux2_pro: {
    key: "rw_flux2_pro",
    air: "bfl:5@1",
    label: "FLUX.2 [pro]",
    supportsReferenceImages: true,
  },
};

export const RUNWARE_VIDEO_MODELS: Record<string, RunwareVideoModel> = {
  rw_wan26_flash: {
    key: "rw_wan26_flash",
    air: "alibaba:wan@2.6-flash",
    label: "Wan 2.6 Flash",
    supportsAudioInput: true,
    supportsPreparedAudio: true,
    minDuration: 2,
    maxDuration: 15,
  },
  rw_pixverse_v6: {
    key: "rw_pixverse_v6",
    air: "pixverse:1@8",
    label: "PixVerse V6",
    supportsAudioInput: false,
    supportsPreparedAudio: false,
    minDuration: 1,
    maxDuration: 15,
  },
  rw_kling3_standard: {
    key: "rw_kling3_standard",
    air: "klingai:kling-video@3-standard",
    label: "Kling Video 3.0 Standard",
    supportsAudioInput: false,
    // The provider rejects inputs.audio for this model, so a prepared
    // greeting voice cannot travel into the film.
    supportsPreparedAudio: false,
    minDuration: 3,
    maxDuration: 15,
  },
  rw_pvideo_avatar: {
    key: "rw_pvideo_avatar",
    air: "prunaai:p-video@avatar",
    label: "P-Video-Avatar",
    // A speaking-avatar engine: it accepts the prepared greeting track and
    // lip-synchronises the person in the starting picture to it.
    supportsAudioInput: true,
    supportsPreparedAudio: true,
    // The film lasts exactly as long as the greeting that is handed in; the
    // engine takes no duration of its own.
    acceptsDuration: false,
    minDuration: 1,
    maxDuration: 60,
  },
};

/** Engines offered for the Live Cards start picture and greeting-card artwork. */
export const RUNWARE_CARD_IMAGE_KEYS = Object.keys(RUNWARE_IMAGE_MODELS);

/**
 * Personal Video start scenes need reference images, so Z-Image is excluded.
 * Krea 2 Medium Turbo and FLUX.2 [pro] are also excluded: they are unsuitable
 * for start scenes and may never be routed there.
 */
const SCENE_IMAGE_EXCLUDED = new Set(["rw_krea2_medium_turbo", "rw_flux2_pro"]);

export const RUNWARE_SCENE_IMAGE_KEYS = Object.values(RUNWARE_IMAGE_MODELS)
  .filter((m) => m.supportsReferenceImages && !SCENE_IMAGE_EXCLUDED.has(m.key))
  .map((m) => m.key);

export const RUNWARE_ANIMATION_KEYS = Object.keys(RUNWARE_VIDEO_MODELS);

/** The final Personal Video film never uses PixVerse V6. */
export const RUNWARE_FINAL_VIDEO_KEYS = ["rw_wan26_flash", "rw_kling3_standard"];

export function isRunwareImageKey(key: string): boolean {
  return Boolean(RUNWARE_IMAGE_MODELS[key]);
}

export function isRunwareVideoKey(key: string): boolean {
  return Boolean(RUNWARE_VIDEO_MODELS[key]);
}
// --- writing engines (Prompt Preparation) ----------------------------------

export interface RunwareTextModel {
  key: string;
  air: string;
  label: string;
}

/** Runware writing models offered to the Prompt Preparation step. */
export const RUNWARE_TEXT_MODELS: Record<string, RunwareTextModel> = {
  rw_gemini_3_flash: {
    key: "rw_gemini_3_flash",
    air: "google:gemini@3-flash",
    label: "Gemini 3 Flash",
  },
  rw_gemini_31_flash_lite: {
    key: "rw_gemini_31_flash_lite",
    air: "google:gemini@3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
  },
};

export function isRunwareTextKey(key: string): boolean {
  return Boolean(RUNWARE_TEXT_MODELS[key]);
}

// --- speech engines (Personal Video voice) ---------------------------------

export interface RunwareSpeechModel {
  key: string;
  air: string;
  label: string;
  /** How this studio decides which voice speaks the greeting. */
  voiceKind: "reference_clone" | "fish_model_id";
}

/** Runware speech models offered to the Personal Video voice step. */
export const RUNWARE_SPEECH_MODELS: Record<string, RunwareSpeechModel> = {
  rw_fish_s21_pro: {
    key: "rw_fish_s21_pro",
    air: "fishaudio:s2.1@pro",
    label: "Fish Audio S2.1 Pro",
    voiceKind: "fish_model_id",
  },
};

export function isRunwareSpeechKey(key: string): boolean {
  return Boolean(RUNWARE_SPEECH_MODELS[key]);
}

// --- listening engines (Personal Video voice sample verification) ----------

export interface RunwareTranscribeModel {
  key: string;
  air: string;
  label: string;
}

/**
 * Runware models offered to Voice Sample Verification. They only write down
 * what was said in an authorized recording; they never speak and never clone.
 */
export const RUNWARE_TRANSCRIBE_MODELS: Record<string, RunwareTranscribeModel> = {
  rw_gemini_3_flash_stt: {
    key: "rw_gemini_3_flash_stt",
    air: "google:gemini@3-flash",
    label: "Gemini 3 Flash (listening)",
  },
};

export function isRunwareTranscribeKey(key: string): boolean {
  return Boolean(RUNWARE_TRANSCRIBE_MODELS[key]);
}
