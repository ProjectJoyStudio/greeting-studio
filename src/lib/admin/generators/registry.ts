// ---------------------------------------------------------------------------
// Project Joy — the real generator registry.
//
// Every entry below describes an engine that is actually wired into the
// running product. Nothing here is invented: provider, model and credential
// names are taken from the code that performs the generation.
//
// This file is client-safe: it contains no keys and no secrets.
// ---------------------------------------------------------------------------

/** How a lightweight availability check is performed for one engine. */
export type CheckKind =
  | "replicate"
  | "elevenlabs"
  | "runware"
  /** Kept for compatibility; treated as a chat check. */
  | "lovable_ai"
  | "lovable_chat"
  | "lovable_transcribe"
  | "deepl"
  | "none";

/** Rendering quality an image engine is configured with, when it has one. */
export type GeneratorQuality = "low" | "medium" | "high";

export interface GeneratorDef {
  /** Stable key stored in the settings and used by the routing layer. */
  key: string;
  /** Real provider currently used. */
  provider: string;
  /** Real model identifier used by the code. */
  model: string;
  check: CheckKind;
  /** Fixed quality setting sent to the provider, when the model has one. */
  quality?: GeneratorQuality;
  /** Environment variable holding the credential (name only, never a value). */
  credential: string | null;
}

export interface GeneratorFunctionDef {
  /** Stable identifier of one generation function inside one feature. */
  id: string;
  /** Translation key of the function name, resolved in the admin panel. */
  titleKey: string;
  /** Engines that can serve this function today, best first. */
  candidates: GeneratorDef[];
  /** Default primary engine key, or null when the function is not connected. */
  defaultPrimary: string | null;
  /** A backup is never chosen automatically — the administrator selects it. */
  defaultBackup: string | null;
  /** Matches how the running code behaves today. */
  defaultAutoFailover: boolean;
}

export interface GeneratorFeatureDef {
  id: string;
  titleKey: string;
  functions: GeneratorFunctionDef[];
}

// --- real engines ----------------------------------------------------------

const REPLICATE = (key: string, model: string): GeneratorDef => ({
  key,
  provider: "Replicate",
  model,
  check: "replicate",
  credential: "REPLICATE_API_TOKEN",
});

const LOVABLE = (key: string, model: string): GeneratorDef => ({
  key,
  provider: "Lovable AI",
  model,
  check: "lovable_chat",
  credential: "LOVABLE_API_KEY",
});

/** Listening models served through the Lovable AI gateway. */
const LOVABLE_AUDIO = (key: string, model: string): GeneratorDef => ({
  key,
  provider: "Lovable AI",
  model,
  check: "lovable_transcribe",
  credential: "LOVABLE_API_KEY",
});

/** The same model served through Replicate, used as an independent backup. */
const REPLICATE_BACKUP = (key: string, model: string): GeneratorDef => ({
  key,
  provider: "Replicate",
  model,
  check: "replicate",
  credential: "REPLICATE_API_TOKEN",
});

/** OpenAI image models served through the Replicate API. */
const REPLICATE_IMAGE = (key: string, model: string, quality: GeneratorQuality): GeneratorDef => ({
  key,
  provider: "Replicate",
  model,
  check: "replicate",
  quality,
  credential: "REPLICATE_API_TOKEN",
});

/** Engines served by the official Runware API (independent provider). */
const RUNWARE = (key: string, air: string): GeneratorDef => ({
  key,
  provider: "Runware",
  model: air,
  check: "runware",
  credential: "RUNWARE_API_KEY",
});

const RUNWARE_CARD_IMAGES: GeneratorDef[] = [
  RUNWARE("rw_z_image_turbo", "runware:z-image@turbo"),
  RUNWARE("rw_flux2_dev", "runware:400@1"),
  RUNWARE("rw_krea2_medium_turbo", "krea:krea@2-medium-turbo"),
  RUNWARE("rw_flux2_pro", "bfl:5@1"),
];

/**
 * Start scenes need reference pictures, so Z-Image-Turbo is not offered.
 * Krea 2 Medium Turbo and FLUX.2 [pro] are unsuitable here and are excluded
 * from every route: primary, backup, failover and load distribution.
 */
const RUNWARE_SCENE_IMAGES: GeneratorDef[] = [
  RUNWARE("rw_flux2_dev", "runware:400@1"),
];

const RUNWARE_ANIMATIONS: GeneratorDef[] = [
  RUNWARE("rw_wan26_flash", "alibaba:wan@2.6-flash"),
  RUNWARE("rw_pixverse_v6", "pixverse:1@8"),
  RUNWARE("rw_kling3_standard", "klingai:kling-video@3-standard"),
];

/** The final Personal Video film never uses PixVerse V6. */
const RUNWARE_FINAL_VIDEOS: GeneratorDef[] = [
  RUNWARE("rw_wan26_flash", "alibaba:wan@2.6-flash"),
  RUNWARE("rw_kling3_standard", "klingai:kling-video@3-standard"),
];

export const GENERATOR_FEATURES: GeneratorFeatureDef[] = [
  {
    id: "greeting_cards",
    titleKey: "gc_feature_cards",
    functions: [
      {
        id: "greeting_cards.image",
        titleKey: "gc_fn_card_image",
        candidates: [
          REPLICATE("flux_schnell", "black-forest-labs/flux-schnell"),
          REPLICATE("flux_dev", "black-forest-labs/flux-dev"),
          REPLICATE("flux_1_1_pro", "black-forest-labs/flux-1.1-pro"),
          REPLICATE_IMAGE("gpt_image_15_low", "openai/gpt-image-1.5", "low"),
          ...RUNWARE_CARD_IMAGES,
        ],
        defaultPrimary: "flux_schnell",
        defaultBackup: "flux_dev",
        defaultAutoFailover: true,
      },
      {
        id: "greeting_cards.prompt_translation",
        titleKey: "gc_fn_prompt_translation",
        candidates: [
          LOVABLE("gemini_25_flash", "google/gemini-2.5-flash"),
          REPLICATE_BACKUP("replicate_gemini_25_flash", "google/gemini-2.5-flash"),
        ],
        defaultPrimary: "gemini_25_flash",
        defaultBackup: "replicate_gemini_25_flash",
        defaultAutoFailover: false,
      },
    ],
  },
  {
    id: "live_cards",
    titleKey: "gc_feature_live",
    functions: [
      {
        id: "live_cards.start_image",
        titleKey: "gc_fn_start_image",
        candidates: [
          REPLICATE("flux_schnell", "black-forest-labs/flux-schnell"),
          REPLICATE("flux_ultra", "black-forest-labs/flux-1.1-pro-ultra"),
          REPLICATE("flux_1_1_pro", "black-forest-labs/flux-1.1-pro"),
          REPLICATE_IMAGE("gpt_image_15_medium", "openai/gpt-image-1.5", "medium"),
          ...RUNWARE_CARD_IMAGES,
        ],
        defaultPrimary: "flux_schnell",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "live_cards.animation",
        titleKey: "gc_fn_animation",
        candidates: [REPLICATE("wan_i2v", "wan-video/wan-2.7-i2v"), ...RUNWARE_ANIMATIONS],
        defaultPrimary: "wan_i2v",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
    ],
  },
  {
    id: "personal_video",
    titleKey: "gc_feature_pvg",
    functions: [
      {
        id: "personal_video.start_scene",
        titleKey: "gc_fn_start_scene",
        candidates: [
          REPLICATE("flux2_max", "black-forest-labs/flux-2-max"),
          REPLICATE("flux2_pro", "black-forest-labs/flux-2-pro"),
          REPLICATE("flux2_dev", "black-forest-labs/flux-2-dev"),
          ...RUNWARE_SCENE_IMAGES,
        ],
        defaultPrimary: "flux2_max",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "personal_video.voice",
        titleKey: "gc_fn_voice",
        candidates: [
          {
            key: "elevenlabs_tts",
            provider: "ElevenLabs",
            model: "eleven_multilingual_v2",
            check: "elevenlabs",
            credential: "ELEVENLABS_API_KEY",
          },
        ],
        defaultPrimary: "elevenlabs_tts",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "personal_video.greeting_text",
        titleKey: "gc_fn_greeting_text",
        candidates: [
          LOVABLE("gemini_25_flash", "google/gemini-2.5-flash"),
          REPLICATE_BACKUP("replicate_gemini_25_flash", "google/gemini-2.5-flash"),
        ],
        defaultPrimary: "gemini_25_flash",
        defaultBackup: "replicate_gemini_25_flash",
        defaultAutoFailover: false,
      },
      {
        id: "personal_video.transcription",
        titleKey: "gc_fn_transcription",
        candidates: [
          LOVABLE_AUDIO("gpt_4o_transcribe", "openai/gpt-4o-transcribe"),
          REPLICATE_BACKUP("replicate_gpt_4o_transcribe", "openai/gpt-4o-transcribe"),
        ],
        defaultPrimary: "gpt_4o_transcribe",
        defaultBackup: "replicate_gpt_4o_transcribe",
        defaultAutoFailover: false,
      },
      {
        id: "personal_video.final_video",
        titleKey: "gc_fn_final_video",
        candidates: [
          REPLICATE("kling_avatar_v2", "kwaivgi/kling-avatar-v2"),
          ...RUNWARE_FINAL_VIDEOS,
        ],
        defaultPrimary: "kling_avatar_v2",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        // Scenes without a specially added speaking person. The slot is
        // prepared; no engine is connected to it yet.
        id: "personal_video.no_person_video",
        titleKey: "gc_fn_no_person_video",
        candidates: [],
        defaultPrimary: null,
        defaultBackup: null,
        defaultAutoFailover: false,
      },
    ],
  },
  {
    id: "translation",
    titleKey: "gc_feature_translation",
    functions: [
      {
        id: "translation.catalog_text",
        titleKey: "gc_fn_catalog_text",
        candidates: [
          {
            key: "deepl",
            provider: "DeepL",
            model: "deepl-api-v2",
            check: "deepl",
            credential: "DEEPL_API_KEY",
          },
        ],
        defaultPrimary: "deepl",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
    ],
  },
  {
    id: "future",
    titleKey: "gc_feature_future",
    functions: [
      {
        id: "personal_video_clip.video",
        titleKey: "gc_fn_clip",
        candidates: [],
        defaultPrimary: null,
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "cartoon.video",
        titleKey: "gc_fn_cartoon",
        candidates: [],
        defaultPrimary: null,
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "premium_order.generation",
        titleKey: "gc_fn_premium",
        candidates: [],
        defaultPrimary: null,
        defaultBackup: null,
        defaultAutoFailover: false,
      },
    ],
  },
];

export const ALL_FUNCTIONS: GeneratorFunctionDef[] = GENERATOR_FEATURES.flatMap((f) => f.functions);

/** Every distinct engine, with the functions that use it. */
export function allGenerators(): Array<GeneratorDef & { usedBy: string[] }> {
  const map = new Map<string, GeneratorDef & { usedBy: string[] }>();
  for (const feature of GENERATOR_FEATURES) {
    for (const fn of feature.functions) {
      for (const gen of fn.candidates) {
        const existing = map.get(gen.key);
        if (existing) existing.usedBy.push(fn.id);
        else map.set(gen.key, { ...gen, usedBy: [fn.id] });
      }
    }
  }
  return [...map.values()];
}

export function findFunction(id: string): GeneratorFunctionDef | undefined {
  return ALL_FUNCTIONS.find((f) => f.id === id);
}

export function findGenerator(key: string): GeneratorDef | undefined {
  return allGenerators().find((g) => g.key === key);
}
