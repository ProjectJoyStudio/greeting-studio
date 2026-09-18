// Server-only: the storage companies Project Joy can currently talk to.
//
// Settings are read from the server environment on every call, so nothing is
// baked in at build time and Laboratory and Production simply carry their own
// values. No area name is ever hard-coded here.

import { createS3Adapter, type S3Settings } from "./s3-adapter.server";
import type { StorageAdapter } from "./types";

function env(name: string): string {
  return process.env[name] ?? "";
}

/** Backblaze puts its region inside the address of the area. */
function regionFromEndpoint(endpoint: string): string {
  return /s3\.([a-z0-9-]+)\.backblazeb2\.com/.exec(endpoint)?.[1] ?? "auto";
}

function r2Settings(): S3Settings | null {
  const settings: S3Settings = {
    endpoint: env("R2_ENDPOINT"),
    bucket: env("R2_BUCKET_NAME"),
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    region: "auto",
  };
  return settings.endpoint && settings.bucket ? settings : null;
}

function b2Settings(): S3Settings | null {
  const endpoint = env("B2_ENDPOINT");
  const settings: S3Settings = {
    endpoint,
    bucket: env("B2_BUCKET_NAME"),
    accessKeyId: env("B2_KEY_ID"),
    secretAccessKey: env("B2_APPLICATION_KEY"),
    region: regionFromEndpoint(endpoint),
  };
  return settings.endpoint && settings.bucket ? settings : null;
}

/** Cloudflare R2 — today's working file area. */
export const r2Adapter: StorageAdapter = createS3Adapter("r2", r2Settings);

/** Backblaze B2 — connected and available, but not receiving files yet. */
export const b2Adapter: StorageAdapter = createS3Adapter("b2", b2Settings);
