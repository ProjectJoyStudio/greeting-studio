// Temporary test helper: reads (and optionally sets) the R2 cross-origin rules.
import { AwsClient } from "aws4fetch";

const endpoint = (process.env["R2_ENDPOINT"] ?? "").replace(/\/+$/, "");
const bucket = process.env["R2_BUCKET_NAME"] ?? "";
const client = new AwsClient({
  accessKeyId: process.env["R2_ACCESS_KEY_ID"] ?? "",
  secretAccessKey: process.env["R2_SECRET_ACCESS_KEY"] ?? "",
  service: "s3",
  region: "auto",
});
const url = `${endpoint}/${bucket}?cors`;

const mode = process.argv[2] ?? "get";
if (mode === "get") {
  const res = await client.fetch(url, { method: "GET" });
  console.log(res.status, await res.text());
} else {
  const xml = await Bun.file(process.argv[3]!).text();
  const res = await client.fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/xml" },
    body: xml,
  });
  console.log(res.status, await res.text());
}
