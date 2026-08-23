import { runwareGenerateText } from "../src/lib/runware/runware.server";
for (const k of ["rw_gemini_3_flash","rw_gemini_31_flash_lite"]) {
  try {
    const t = await runwareGenerateText({ generatorKey: k, system: "You convert a picture description written in any language into one precise English image prompt. Reply with the English prompt only.", user: "Зимний домик в горах, синее небо, снег на елях" });
    console.log(k, "OK:", t);
  } catch (e) { console.log(k, "FAIL:", e instanceof Error ? e.message : e); }
}
