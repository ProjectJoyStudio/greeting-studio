import { storageFor } from "@/lib/storage/registry.server";
import { retryPendingBackups, placementsOf, forgetPlacements } from "@/lib/storage/backup.server";
const key = process.argv[2]!;
console.log("retry:", await retryPendingBackups(5));
console.log("placements:", (await placementsOf(key)).map((p: any) => `${p.provider}/${p.status}/attempts=${p.attempts}`));
const primary = storageFor("primary")!, backup = storageFor("backup")!;
console.log("cleanup:", await primary.deleteObject(key), await backup.deleteObject(key));
await forgetPlacements(key);
console.log("left:", (await placementsOf(key)).length, await primary.head(key), await backup.head(key));
