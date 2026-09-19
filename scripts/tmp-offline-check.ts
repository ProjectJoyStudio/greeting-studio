import { memoryBookFileUrl } from "../src/lib/memory-book/storage.server";
for (const k of [
  "system/ready-designs/cover/TEST-70222a1e-3257-4ef5-83e6-2d84e58f259a.jpg",
  "system/ready-designs/leaf/TEST-be323138-0590-443c-874e-ad9284ab76b4.jpg",
]) {
  const url = await memoryBookFileUrl("r2", k, 600);
  const res = await fetch(url!);
  const buf = await res.arrayBuffer();
  console.log(k.split("/")[2], res.status, res.headers.get("content-type"), buf.byteLength, "bytes");
}
