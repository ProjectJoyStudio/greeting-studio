import { storageFor } from "@/lib/storage/registry.server";
import { protectObject, placementsOf, forgetPlacements, markPrimaryDeleted } from "@/lib/storage/backup.server";

const key = `memory-book/_storage-tests/source-${Date.now()}.webm`;
const primary = storageFor("primary")!;
const backup = storageFor("backup")!;

const body = new TextEncoder().encode("project-joy video placement test");
console.log("put:", await primary.put(key, body as unknown as BodyInit, "video/webm"));
await protectObject(key);
console.log("placements:", (await placementsOf(key)).map((p: any) => [p.provider, p.role, p.status, p.size_bytes, p.attempts]));
await protectObject(key);
console.log("after repeat:", (await placementsOf(key)).map((p: any) => [p.provider, p.role, p.status, p.size_bytes, p.attempts]));
console.log("b2 head:", await backup.head(key));

// R2 deletion must not touch the reserve copy.
await primary.deleteObject(key);
await markPrimaryDeleted(key);
console.log("after r2 delete:", (await placementsOf(key)).map((p: any) => [p.provider, p.status]));
console.log("b2 still there:", await backup.head(key));

await backup.deleteObject(key);
await forgetPlacements(key);
console.log("cleaned:", (await placementsOf(key)).length, await primary.head(key), await backup.head(key));
