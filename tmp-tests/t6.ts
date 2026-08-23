import { checkRunwareModel } from "../src/lib/runware/runware.server";
for (const a of ["google:gemini@3-flash","google:gemini@3.1-flash-lite"]) console.log(a, JSON.stringify(await checkRunwareModel(a)));
