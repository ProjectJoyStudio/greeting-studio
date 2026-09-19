// Server-only building block shared by every S3-compatible storage company.
//
// Cloudflare R2 and Backblaze B2 both speak the same protocol, so the actual
// work lives here once and each provider only supplies its own settings.

import { AwsClient } from "aws4fetch";

import type { StorageAdapter, StorageObjectInfo, StorageProviderId } from "./types";

export interface S3Settings {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

interface Resolved {
  base: string;
  bucket: string;
  client: AwsClient;
}

function resolve(settings: S3Settings | null): Resolved | null {
  if (
    !settings ||
    !settings.endpoint ||
    !settings.bucket ||
    !settings.accessKeyId ||
    !settings.secretAccessKey
  ) {
    return null;
  }
  const clean = settings.endpoint.replace(/\/+$/, "");
  // The endpoint may or may not already point at the area itself.
  const base = clean.endsWith(`/${settings.bucket}`) ? clean : `${clean}/${settings.bucket}`;
  return {
    base,
    bucket: settings.bucket,
    client: new AwsClient({
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
      service: "s3",
      region: settings.region || "auto",
    }),
  };
}

function objectUrl(cfg: Resolved, key: string): string {
  return `${cfg.base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Builds one provider from its settings. Settings are read on every call. */
export function createS3Adapter(
  id: StorageProviderId,
  read: () => S3Settings | null,
): StorageAdapter {
  const cfg = () => resolve(read());

  return {
    id,

    isReady() {
      return cfg() !== null;
    },

    describe() {
      const c = cfg();
      return c ? `${id}:${c.bucket}` : `${id}:not-configured`;
    },

    async head(key: string): Promise<StorageObjectInfo | null> {
      const c = cfg();
      if (!c || !key) return null;
      const res = await c.client.fetch(objectUrl(c, key), { method: "HEAD" });
      if (!res.ok) return null;
      const header = Number(res.headers.get("content-length") ?? 0);
      let sizeBytes = Number.isFinite(header) ? header : 0;
      if (sizeBytes <= 0) {
        // Some areas do not report the length on a HEAD. Asking for the very
        // first byte returns the real total without downloading the file.
        const probe = await c.client.fetch(objectUrl(c, key), {
          method: "GET",
          headers: { range: "bytes=0-0" },
        });
        const total = Number(/\/(\d+)\s*$/.exec(probe.headers.get("content-range") ?? "")?.[1] ?? 0);
        if (Number.isFinite(total) && total > 0) sizeBytes = total;
      }
      return {
        key,
        sizeBytes,
        contentType: res.headers.get("content-type"),
      };
    },

    async put(key: string, body: BodyInit, contentType = "application/octet-stream") {
      const c = cfg();
      if (!c || !key) return false;
      const res = await c.client.fetch(objectUrl(c, key), {
        method: "PUT",
        headers: { "content-type": contentType },
        body,
      });
      return res.ok;
    },

    async getBytes(key: string) {
      const c = cfg();
      if (!c || !key) return null;
      const res = await c.client.fetch(objectUrl(c, key), { method: "GET" });
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    },

    async signedReadUrl(key: string, seconds: number) {
      const c = cfg();
      if (!c || !key) return null;
      const signed = await c.client.sign(
        new Request(`${objectUrl(c, key)}?X-Amz-Expires=${Math.max(60, Math.floor(seconds))}`, {
          method: "GET",
        }),
        { aws: { signQuery: true } },
      );
      return signed.url;
    },

    async signedWriteUrl(key: string, seconds: number, contentType: string) {
      const c = cfg();
      if (!c || !key) return null;
      const signed = await c.client.sign(
        new Request(`${objectUrl(c, key)}?X-Amz-Expires=${Math.max(60, Math.floor(seconds))}`, {
          method: "PUT",
          headers: { "content-type": contentType || "application/octet-stream" },
        }),
        { aws: { signQuery: true, allHeaders: true } },
      );
      return signed.url;
    },

    /** Removes exactly ONE object. Never a folder and never a prefix. */
    async deleteObject(key: string) {
      const c = cfg();
      if (!c || !key) return false;
      const res = await c.client.fetch(objectUrl(c, key), { method: "DELETE" });
      return res.ok || res.status === 404;
    },
  };
}
