import { systemKey } from "@/lib/storage/keys";
import { storageFor } from "@/lib/storage/registry.server";
import {
  backupToReserve,
  placementsOf,
  recordPrimary,
  forgetPlacements,
} from "@/lib/storage/backup.server";

const primary = storageFor("primary")!;
const backup = storageFor("backup")!;
const key = systemKey("other", "_storage-tests", `placement-${Date.now()}.txt`);
const missing = systemKey("other", "_storage-tests", `missing-${Date.now()}.txt`);

console.log("key:", key);
console.log("primary:", primary.describe(), "backup:", backup.describe());

console.log("put primary:", await primary.put(key, "project joy placement test", "text/plain"));
console.log("recordPrimary:", await recordPrimary(key));
const first = await backupToReserve(key);
console.log("backup #1:", first);
const second = await backupToReserve(key);
console.log("backup #2 (idempotent):", second);
console.log("placements:", (await placementsOf(key)).map((p: any) => `${p.provider}/${p.role}/${p.status}/${p.size_bytes}`));
console.log("backup head:", await backup.head(key));

// Controlled failure: object not in the working area at all.
const fail = await backupToReserve(missing);
console.log("controlled failure:", fail);
console.log("primary still intact:", await primary.head(key));

// Cleanup of test objects only.
console.log("delete primary:", await primary.deleteObject(key));
console.log("delete backup:", await backup.deleteObject(key));
await forgetPlacements(key);
await forgetPlacements(missing);
console.log("placements after cleanup:", (await placementsOf(key)).length, (await placementsOf(missing)).length);
console.log("primary gone:", await primary.head(key), "backup gone:", await backup.head(key));
