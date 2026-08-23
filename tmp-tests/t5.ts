import { readGeneratorSettings, writeGeneratorSettings } from "../src/lib/admin/generators/settings.server";
import { invalidateGeneratorSettings } from "../src/lib/admin/generators/runtime.server";
import { completeText } from "../src/lib/ai/text-engine.server";

const FN = "greeting_cards.prompt_translation";
const CANDS = ["gemini_25_flash","replicate_gemini_25_flash","rw_gemini_3_flash","rw_gemini_31_flash_lite"];
const SYS = "You convert a picture description written in any language into one precise English image prompt. Reply with the English prompt only.";
const original = await readGeneratorSettings();
const actor = "00000000-0000-0000-0000-000000000000";

async function cfg(primary: string, backup: string | null) {
  const next = structuredClone(original) as any;
  next.functions[FN] = { primary, backup, autoFailover: Boolean(backup), loadDistribution: false };
  await writeGeneratorSettings(next, actor);
  invalidateGeneratorSettings();
}

try {
  // TEST 4: Replicate primary fails -> Runware Gemini 3 Flash backup
  await cfg("replicate_gemini_25_flash", "rw_gemini_3_flash");
  const realReplicate = process.env["REPLICATE_API_TOKEN"];
  delete process.env["REPLICATE_API_TOKEN"];
  console.log("TEST4:", await completeText({ functionId: FN, system: SYS, user: "Зимний домик в горах" }, CANDS));
  if (realReplicate) process.env["REPLICATE_API_TOKEN"] = realReplicate;

  // TEST 5: Runware primary fails -> Replicate backup
  await cfg("rw_gemini_31_flash_lite", "replicate_gemini_25_flash");
  const realRunware = process.env["RUNWARE_API_KEY"];
  delete process.env["RUNWARE_API_KEY"];
  console.log("TEST5:", await completeText({ functionId: FN, system: SYS, user: "Зимний домик в горах" }, CANDS));
  if (realRunware) process.env["RUNWARE_API_KEY"] = realRunware;
} finally {
  await writeGeneratorSettings(original, actor);
  invalidateGeneratorSettings();
  console.log("restored:", JSON.stringify((await readGeneratorSettings()).functions[FN]));
}
