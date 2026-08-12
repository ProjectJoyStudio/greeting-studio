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
export type CheckKind = "replicate" | "elevenlabs" | "lovable_ai" | "deepl" | "none";

export interface GeneratorDef {
  /** Stable key stored in the settings and used by the routing layer. */
  key: string;
  /** Real provider currently used. */
  provider: string;
  /** Real model identifier used by the code. */
  model: string;
  check: CheckKind;
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
  check: "lovable_ai",
  credential: "LOVABLE_API_KEY",
});

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
        ],
        defaultPrimary: "flux_schnell",
        defaultBackup: "flux_dev",
        defaultAutoFailover: true,
      },
      {
        id: "greeting_cards.prompt_translation",
        titleKey: "gc_fn_prompt_translation",
        candidates: [LOVABLE("gemini_25_flash", "google/gemini-2.5-flash")],
        defaultPrimary: "gemini_25_flash",
        defaultBackup: null,
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
        ],
        defaultPrimary: "flux_schnell",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "live_cards.animation",
        titleKey: "gc_fn_animation",
        candidates: [REPLICATE("wan_i2v", "wan-video/wan-2.7-i2v")],
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
        candidates: [LOVABLE("gemini_25_flash", "google/gemini-2.5-flash")],
        defaultPrimary: "gemini_25_flash",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "personal_video.transcription",
        titleKey: "gc_fn_transcription",
        candidates: [LOVABLE("gpt_4o_transcribe", "openai/gpt-4o-transcribe")],
        defaultPrimary: "gpt_4o_transcribe",
        defaultBackup: null,
        defaultAutoFailover: false,
      },
      {
        id: "personal_video.final_video",
        titleKey: "gc_fn_final_video",
        candidates: [REPLICATE("omni_human_15", "bytedance/omni-human-1.5")],
        defaultPrimary: "omni_human_15",
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
