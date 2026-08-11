// Shape of the generator control settings. Client-safe: types, defaults and
// merging only — no keys, no network calls.

import { ALL_FUNCTIONS, allGenerators } from "./registry";

export type ParallelJobs = "auto" | number;

export interface GeneratorEntrySettings {
  /** Disabled engines keep every setting; they are only skipped for NEW jobs. */
  enabled: boolean;
  parallel: ParallelJobs;
}

export interface FunctionSettings {
  primary: string | null;
  /** null means "Backup Generator: Not selected". */
  backup: string | null;
  /** Only a genuine technical failure may hand a NEW request to the backup. */
  autoFailover: boolean;
  /** Different customer jobs may be spread over several enabled engines. */
  loadDistribution: boolean;
}

export interface GeneratorControlSettings {
  version: 1;
  generators: Record<string, GeneratorEntrySettings>;
  functions: Record<string, FunctionSettings>;
}

export const GENERATOR_SETTINGS_KEY = "generator_control";

export function defaultGeneratorSettings(): GeneratorControlSettings {
  const generators: Record<string, GeneratorEntrySettings> = {};
  for (const gen of allGenerators()) {
    generators[gen.key] = { enabled: true, parallel: "auto" };
  }
  const functions: Record<string, FunctionSettings> = {};
  for (const fn of ALL_FUNCTIONS) {
    functions[fn.id] = {
      primary: fn.defaultPrimary,
      backup: fn.defaultBackup,
      autoFailover: fn.defaultAutoFailover,
      loadDistribution: false,
    };
  }
  return { version: 1, generators, functions };
}

function parallelOf(value: unknown): ParallelJobs {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(500, Math.round(parsed)) : "auto";
}

/** Merges stored settings over the defaults, dropping anything unknown. */
export function mergeGeneratorSettings(stored: unknown): GeneratorControlSettings {
  const base = defaultGeneratorSettings();
  const raw = (stored ?? {}) as Partial<GeneratorControlSettings>;

  for (const [key, entry] of Object.entries(raw.generators ?? {})) {
    if (!base.generators[key]) continue;
    base.generators[key] = {
      enabled: entry?.enabled !== false,
      parallel: parallelOf((entry as GeneratorEntrySettings)?.parallel),
    };
  }

  for (const [id, entry] of Object.entries(raw.functions ?? {})) {
    const fn = ALL_FUNCTIONS.find((f) => f.id === id);
    const current = base.functions[id];
    if (!fn || !current) continue;
    const valid = (key: unknown): string | null =>
      typeof key === "string" && fn.candidates.some((c) => c.key === key) ? key : null;
    const primary = valid((entry as FunctionSettings)?.primary) ?? current.primary;
    let backup = valid((entry as FunctionSettings)?.backup);
    if (backup === primary) backup = null;
    base.functions[id] = {
      primary,
      backup,
      autoFailover: (entry as FunctionSettings)?.autoFailover === true,
      loadDistribution: (entry as FunctionSettings)?.loadDistribution === true,
    };
  }

  return base;
}
