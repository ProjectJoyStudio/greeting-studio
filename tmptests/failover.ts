import { writeGeneratorSettings, readGeneratorSettings } from "../src/lib/admin/generators/settings.server";
import { invalidateGeneratorSettings, generatorOrder } from "../src/lib/admin/generators/runtime.server";
import { transcribeSample } from "../src/lib/personal-video/voice/transcribe.server";

const key = process.env.RUNWARE_API_KEY!;
async function tasks(t:any[]){const r=await fetch("https://api.runware.ai/v1",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(t)});return JSON.parse(await r.text());}
const r = await tasks([{taskType:"audioInference",taskUUID:crypto.randomUUID(),model:"fishaudio:s2.1@pro",speech:{text:"Hello, my name is Anna Miller and this is my voice sample."},outputType:"URL",outputFormat:"MP3"}]);
const bytes = new Uint8Array(await (await fetch(r.data[0].audioURL)).arrayBuffer());
const sample = { base64: Buffer.from(bytes).toString("base64"), mimeType: "audio/mpeg", language: "en" };

const original = await readGeneratorSettings();
const ACTOR = "00000000-0000-0000-0000-000000000000";
async function configure(primary: string, backup: string, autoFailover: boolean) {
  const next = structuredClone(original) as any;
  next.functions["personal_video.transcription"] = { primary, backup, autoFailover, loadDistribution: false };
  await writeGeneratorSettings(next, ACTOR);
  invalidateGeneratorSettings();
}
try {
  // 1. regression: existing Replicate primary
  await configure("replicate_gpt_4o_transcribe", null as any, false);
  console.log("order A", await generatorOrder("personal_video.transcription", ["gpt_4o_transcribe","replicate_gpt_4o_transcribe","rw_gemini_3_flash_stt"]));
  console.log("replicate primary ->", await transcribeSample(sample));

  // 2. Runware primary
  await configure("rw_gemini_3_flash_stt", null as any, false);
  console.log("runware primary ->", await transcribeSample(sample));

  // 5. replicate primary, runware backup, simulated replicate failure
  await configure("replicate_gpt_4o_transcribe", "rw_gemini_3_flash_stt", true);
  console.log("order B", await generatorOrder("personal_video.transcription", ["gpt_4o_transcribe","replicate_gpt_4o_transcribe","rw_gemini_3_flash_stt"]));
  const tok = process.env.REPLICATE_API_TOKEN; const tok2 = process.env.PVG_IMAGE_API_TOKEN;
  delete process.env.REPLICATE_API_TOKEN; delete process.env.PVG_IMAGE_API_TOKEN;
  console.log("failover to runware ->", await transcribeSample(sample));
  if (tok) process.env.REPLICATE_API_TOKEN = tok; if (tok2) process.env.PVG_IMAGE_API_TOKEN = tok2;

  // 6. reverse
  await configure("rw_gemini_3_flash_stt", "replicate_gpt_4o_transcribe", true);
  console.log("order C", await generatorOrder("personal_video.transcription", ["gpt_4o_transcribe","replicate_gpt_4o_transcribe","rw_gemini_3_flash_stt"]));

  // 7. persistence
  invalidateGeneratorSettings();
  console.log("persisted", JSON.stringify((await readGeneratorSettings()).functions["personal_video.transcription"]));
} finally {
  await writeGeneratorSettings(original, ACTOR);
  invalidateGeneratorSettings();
  console.log("restored", JSON.stringify((await readGeneratorSettings()).functions["personal_video.transcription"]));
}
