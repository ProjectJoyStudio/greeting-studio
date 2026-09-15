// Server-only access to the Cloudflare R2 area that holds Memory Book videos.
//
// Nothing here is ever reachable from the browser: the keys live in the
// server environment, and the page only ever receives short-lived links.

import { AwsClient } from "aws4fetch";

import { MEMORY_BOOK_R2_BUCKET } from "./materials";

export { MEMORY_BOOK_R2_BUCKET };

interface R2Config {
  base: string;
  bucket: string;
  client: AwsClient;
}

function config(): R2Config | null {
  const endpoint = process.env["R2_ENDPOINT"];
  const bucket = process.env["R2_BUCKET_NAME"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  const clean = endpoint.replace(/\/+$/, "");
  // The endpoint may or may not already point at the bucket itself.
  const base = clean.endsWith(`/${bucket}`) ? clean : `${clean}/${bucket}`;
  return {
    base,
    bucket,
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    }),
  };
}

/** True when this installation is set up to keep book videos in R2. */
export function r2Ready(): boolean {
  return config() !== null;
}

function objectUrl(cfg: R2Config, key: string): string {
  return `${cfg.base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** A short-lived address the browser may read the video from. */
export async function r2SignedGetUrl(key: string, seconds: number): Promise<string | null> {
  const cfg = config();
  if (!cfg || !key) return null;
  const signed = await cfg.client.sign(
    new Request(`${objectUrl(cfg, key)}?X-Amz-Expires=${Math.max(60, Math.floor(seconds))}`, {
      method: "GET",
    }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** A short-lived address the browser may store exactly one video at. */
export async function r2SignedPutUrl(
  key: string,
  seconds: number,
): Promise<string | null> {
  const cfg = config();
  if (!cfg || !key) return null;
  const signed = await cfg.client.sign(
    new Request(`${objectUrl(cfg, key)}?X-Amz-Expires=${Math.max(60, Math.floor(seconds))}`, {
      method: "PUT",
    }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** Size of one stored video, or null when it is not there. */
export async function r2ObjectSize(key: string): Promise<number | null> {
  const cfg = config();
  if (!cfg || !key) return null;
  const res = await cfg.client.fetch(objectUrl(cfg, key), { method: "HEAD" });
  if (!res.ok) return null;
  const length = Number(res.headers.get("content-length") ?? 0);
  return Number.isFinite(length) ? length : 0;
}

/** Removes exactly ONE stored video. Never a folder and never a prefix. */
export async function r2DeleteObject(key: string): Promise<boolean> {
  const cfg = config();
  if (!cfg || !key) return false;
  const res = await cfg.client.fetch(objectUrl(cfg, key), { method: "DELETE" });
  return res.ok || res.status === 404;
}
