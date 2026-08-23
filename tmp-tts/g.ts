import { mock } from "bun:test";
let order = ["elevenlabs_tts","rw_gemini_31_flash_tts"];
mock.module("../src/lib/admin/generators/runtime.server", () => ({ generatorOrder: async () => order }));
mock.module("@/lib/admin/generators/runtime.server", () => ({ generatorOrder: async () => order }));
const { speak } = await import("../src/lib/personal-video/voice/tts-routing.server");
const req = { text:"Vielen Dank und alles Gute!", voiceId:"EXAVITQu4vr4xnSDxMaL", language:"de" };
const key = process.env["ELEVENLABS_API_KEY"]!;
delete process.env["ELEVENLABS_API_KEY"];
console.log("EL->RW:", (await speak({personal:false, voiceProvider:"elevenlabs", request:req})).providerId);
order = ["rw_fish_s21_pro","rw_gemini_31_flash_tts"];
const rw = process.env["RUNWARE_API_KEY"]!;
process.env["RUNWARE_API_KEY"] = "bad-key";
try { await speak({personal:false, voiceProvider:"elevenlabs", request:req}); console.log("RW->RW: unexpected success"); }
catch(e){ console.log("RW->RW both fail as expected:", (e as Error).message.slice(0,60)); }
process.env["RUNWARE_API_KEY"] = rw;
order = ["rw_gemini_31_flash_tts","elevenlabs_tts"];
process.env["ELEVENLABS_API_KEY"] = key;
console.log("RW primary:", (await speak({personal:false, voiceProvider:"elevenlabs", request:req})).providerId);
order = ["rw_fish_s21_pro","rw_gemini_31_flash_tts"];
console.log("RW->RW ok:", (await speak({personal:false, voiceProvider:"elevenlabs", request:req})).providerId);
