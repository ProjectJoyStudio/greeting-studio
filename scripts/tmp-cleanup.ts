import { storageFor } from "../src/lib/storage/registry.server";
const keys = [
  "system/ready-designs/cover/TEST-70222a1e-3257-4ef5-83e6-2d84e58f259a.jpg",
  "system/ready-designs/leaf/TEST-be323138-0590-443c-874e-ad9284ab76b4.jpg",
];
for (const role of ["primary", "backup"] as const) {
  const a = storageFor(role)!;
  for (const k of keys) console.log(role, k.split("/")[2], await a.deleteObject(k), await a.head(k));
}
