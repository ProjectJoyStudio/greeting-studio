import { storageFor } from "../src/lib/storage/registry.server";
import { recordPrimary, backupToReserve } from "../src/lib/storage/backup.server";

const primary = storageFor("primary")!;
for (const stage of ["cover", "leaf"] as const) {
  const key = `system/ready-designs/${stage}/TEST-${crypto.randomUUID()}.jpg`;
  const bytes = await Bun.file(`/tmp/browser/rd/${stage}-test.jpg`).arrayBuffer();
  const url = await primary.signedWriteUrl(key, 600, "image/jpeg");
  const put = await fetch(url!, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: bytes });
  const rec = await recordPrimary(key);
  const back = await backupToReserve(key);
  console.log(stage, "put", put.status, "primary", rec, "backup", JSON.stringify(back), key);
}
