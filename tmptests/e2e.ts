import { runwareTranscribeAudio } from "../src/lib/runware/runware.server";
const key = process.env.RUNWARE_API_KEY!;
async function tasks(t:any[]){const r=await fetch("https://api.runware.ai/v1",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(t)});return JSON.parse(await r.text());}
const samples: Array<[string,string,string]> = [
 ["en","Hello, my name is Anna Miller and this is my voice sample for Project Joy.","en"],
 ["ru","Здравствуйте, меня зовут Анна Миллер, это образец моего голоса.","ru"],
 ["uk","Вітаю, мене звати Анна Міллер, це зразок мого голосу.","uk"],
 ["pl","Dzień dobry, nazywam się Anna Miller, to jest próbka mojego głosu.","pl"],
 ["de","Guten Tag, mein Name ist Anna Miller, das ist meine Sprachprobe.","de"],
 ["fr","Bonjour, je m'appelle Anna Miller, ceci est mon échantillon vocal.","fr"],
];
for (const [lang, text] of samples) {
  const r = await tasks([{taskType:"audioInference",taskUUID:crypto.randomUUID(),model:"fishaudio:s2.1@pro",speech:{text},outputType:"URL",outputFormat:"MP3"}]);
  const url = r.data?.[0]?.audioURL;
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");
  const out = await runwareTranscribeAudio({generatorKey:"rw_gemini_3_flash_stt", base64, mimeType:"audio/mpeg", language: lang});
  console.log(lang, "SAID:", text);
  console.log(lang, "HEARD:", out);
}
