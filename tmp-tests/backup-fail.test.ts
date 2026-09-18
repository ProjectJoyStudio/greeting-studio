import { systemKey } from "@/lib/storage/keys";
import { storageFor } from "@/lib/storage/registry.server";
import { backupToReserve, placementsOf, recordPrimary, forgetPlacements } from "@/lib/storage/backup.server";

const primary = storageFor("primary")!;
const key = systemKey("other", "_storage-tests", `failcase-${Date.now()}.txt`);
await primary.put(key, "failure case", "text/plain");
await recordPrimary(key);
console.log("backup with bad reserve credentials:", await backupToReserve(key));
console.log("placements:", (await placementsOf(key)).map((p: any) => `${p.provider}/${p.status}/attempts=${p.attempts}/${p.last_error}`));
console.log("primary intact:", await primary.head(key));
console.log("KEY=" + key);
