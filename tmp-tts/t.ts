import { getVoiceEngine } from "../src/lib/personal-video/voice/providers.server";
const cases = [
  ["elevenlabs", "EXAVITQu4vr4xnSDxMaL"],
  ["rw_gemini_31_flash_tts", "EXAVITQu4vr4xnSDxMaL"],
  ["rw_fish_s21_pro", "EXAVITQu4vr4xnSDxMaL"],
] as const;
for (const [p, v] of cases) {
  try {
    const e = getVoiceEngine(p);
    const r = await e.synthesize({ text: "Дорогая Анна, с днём рождения! Пусть радость не кончается.", voiceId: v, language: "ru" });
    console.log(p, "OK", r.mimeType, r.audio.byteLength, "dur", r.durationSeconds, r.modelId);
  } catch (err) { console.log(p, "FAIL", (err as Error).message); }
}
