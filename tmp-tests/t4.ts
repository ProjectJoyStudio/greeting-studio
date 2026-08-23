import { generatorOrder } from "../src/lib/admin/generators/runtime.server";
import { findFunction } from "../src/lib/admin/generators/registry";
const fn = findFunction("greeting_cards.prompt_translation")!;
console.log("candidates:", fn.candidates.map(c=>`${c.provider}:${c.key}`).join(", "));
console.log("order:", await generatorOrder("greeting_cards.prompt_translation", fn.candidates.map(c=>c.key)));
