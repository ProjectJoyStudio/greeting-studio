import { generatorOrder } from "../src/lib/admin/generators/runtime.server";
import { speak } from "../src/lib/personal-video/voice/tts-routing.server";
console.log("order:", await generatorOrder("personal_video.voice", ["elevenlabs_tts","rw_gemini_31_flash_tts","rw_fish_s21_pro"]));
delete process.env["ELEVENLABS_API_KEY"]; // primary technically unavailable
try {
  const r = await speak({ personal:false, voiceProvider:"elevenlabs", request:{ text:"Vielen Dank und alles Gute!", voiceId:"EXAVITQu4vr4xnSDxMaL", language:"de" }});
  console.log("failover ->", r.providerId, r.modelLabel, r.audio.byteLength, r.durationSeconds);
} catch(e){ console.log("failover FAIL", (e as Error).message); }
