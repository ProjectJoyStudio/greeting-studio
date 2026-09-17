// Server-only access to the Backblaze B2 backup area.
//
// Nothing here is reachable from the browser: the keys live in the server
// environment only. This module is deliberately minimal — it exists so the
// connection can be verified. No backup policy is implemented here.

import { AwsClient } from "aws4fetch";

interface B2Config {
  base: string;
  bucket: string;
  client: AwsClient;
}

function config(): B2Config | null {
  const endpoint = process.env["B2_ENDPOINT"];
  const bucket = process.env["B2_BUCKET_NAME"];
  const accessKeyId = process.env["B2_KEY_ID"];
  const secretAccessKey = process.env["B2_APPLICATION_KEY"];
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  const clean = endpoint.replace(/\/+$/, "");
  const base = clean.endsWith(`/${bucket}`) ? clean : `${clean}/${bucket}`;
  // The region is part of the Backblaze S3 endpoint host.
  const region = /s3\.([a-z0-9-]+)\.backblazeb2\.com/.exec(clean)?.[1] ?? "auto";
  return {
    base,
    bucket,
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region }),
  };
}

/** True when this installation is set up to talk to the backup area. */
export function b2Ready(): boolean {
  return config() !== null;
}

function objectUrl(cfg: B2Config, key: string): string {
  return `${cfg.base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function b2PutObject(
  key: string,
  body: BodyInit,
  contentType = "application/octet-stream",
): Promise<boolean> {
  const cfg = config();
  if (!cfg || !key) return false;
  const res = await cfg.client.fetch(objectUrl(cfg, key), {
    method: "PUT",
    headers: { "content-type": contentType },
    body,
  });
  return res.ok;
}

/** Size of one stored object, or null when it is not there. */
export async function b2ObjectSize(key: string): Promise<number | null> {
  const cfg = config();
  if (!cfg || !key) return null;
  const res = await cfg.client.fetch(objectUrl(cfg, key), { method: "HEAD" });
  if (!res.ok) return null;
  const length = Number(res.headers.get("content-length") ?? 0);
  return Number.isFinite(length) ? length : 0;
}

export async function b2GetText(key: string): Promise<string | null> {
  const cfg = config();
  if (!cfg || !key) return null;
  const res = await cfg.client.fetch(objectUrl(cfg, key), { method: "GET" });
  if (!res.ok) return null;
  return await res.text();
}

/** Removes exactly ONE stored object. Never a folder and never a prefix. */
export async function b2DeleteObject(key: string): Promise<boolean> {
  const cfg = config();
  if (!cfg || !key) return false;
  const res = await cfg.client.fetch(objectUrl(cfg, key), { method: "DELETE" });
  return res.ok || res.status === 404;
}
