import { RUNWARE_IMAGE_MODELS, RUNWARE_VIDEO_MODELS } from "./src/lib/runware/catalog";
import { checkRunwareModel, runwareStartVideo, runwareProgress, runwareRenderImage } from "./src/lib/runware/runware.server";

for (const m of [...Object.values(RUNWARE_IMAGE_MODELS), ...Object.values(RUNWARE_VIDEO_MODELS)]) {
  try { console.log(m.key, m.air, JSON.stringify(await checkRunwareModel(m.air))); }
  catch (e) { console.log(m.key, "ERR", (e as Error).message); }
}
const img = await runwareRenderImage({ generatorKey: "rw_flux2_dev", prompt: "warm festive greeting scene with flowers", aspectRatio: "16:9" });
console.log("image:", img.model, img.url, img.costUsd);
const job = await runwareStartVideo({ generatorKey: "rw_wan26_flash", prompt: "gentle camera push in, petals drifting", imageUrl: img.url, durationSeconds: 3, aspectRatio: "16:9" });
console.log("video job:", job);
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 8000));
  const p = await runwareProgress(job);
  console.log(i, JSON.stringify(p).slice(0, 200));
  if (p.state !== "processing") break;
}
