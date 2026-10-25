// Server-only building block shared by every S3-compatible storage company.
//
// Cloudflare R2 and Backblaze B2 both speak the same protocol, so the actual
// work lives here once and each provider only supplies its own settings.

import { AwsClient } from "aws4fetch";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

import type {
  StorageAdapter,
  StorageCheckResult,
  StorageObjectInfo,
  StorageProviderId,
} from "./types";

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

  const adapter: StorageAdapter = {
    id,

    isReady() {
      return cfg() !== null;
    },

    describe() {
      const c = cfg();
      return c ? `${id}:${c.bucket}` : `${id}:not-configured`;
    },

    async head(key: string): Promise<StorageObjectInfo | null> {
      const r = await adapter.check(key);
      return r.state === "exists" ? r.info : null;
    },

    async check(key: string): Promise<StorageCheckResult> {
      const c = cfg();
      if (!c) return { state: "error", status: null, detail: "not_configured" };
      if (!key) return { state: "error", status: null, detail: "no_key" };
      let res: Response;
      try {
        res = await c.client.fetch(objectUrl(c, key), { method: "HEAD" });
      } catch (err) {
        return {
          state: "error",
          status: null,
          detail: `network:${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`,
        };
      }
      // Only a real "not found" counts as missing. Everything else is retryable.
      if (res.status === 404) return { state: "missing", status: 404 };
      if (!res.ok) {
        const code = res.headers.get("x-amz-error-code") ?? res.statusText ?? "";
        return { state: "error", status: res.status, detail: `http_${res.status}${code ? `:${code}` : ""}` };
      }
      const header = Number(res.headers.get("content-length") ?? 0);
      let sizeBytes = Number.isFinite(header) ? header : 0;
      if (sizeBytes <= 0) {
        // Some areas do not report the length on a HEAD. Asking for the very
        // first byte returns the real total without downloading the file.
        try {
          const probe = await c.client.fetch(objectUrl(c, key), {
            method: "GET",
            headers: { range: "bytes=0-0" },
          });
          const total = Number(/\/(\d+)\s*$/.exec(probe.headers.get("content-range") ?? "")?.[1] ?? 0);
          if (Number.isFinite(total) && total > 0) sizeBytes = total;
        } catch {
          /* keep the HEAD result */
        }
      }
      return {
        state: "exists",
        info: { key, sizeBytes, contentType: res.headers.get("content-type"), etag: res.headers.get("etag") },
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

    async readRange(key, start, end) {
      const c = cfg();
      if (!c) throw new Error("storage_not_configured");
      const res = await c.client.fetch(objectUrl(c, key), { headers: { range: `bytes=${start}-${end}` } });
      if (res.status !== 206) { await res.body?.cancel(); throw new Error(`storage_range_http_${res.status}`); }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength !== end - start + 1) throw new Error("storage_range_size");
      return bytes;
    },

    async digest(key) {
      const info = await adapter.head(key);
      if (!info || info.sizeBytes <= 0) throw new Error("storage_digest_missing");
      const hash = sha256.create();
      // Range reads bound memory even when the provider has no streaming support.
      const chunk = 8 * 1024 * 1024;
      for (let offset = 0; offset < info.sizeBytes; offset += chunk) {
        hash.update(await adapter.readRange(key, offset, Math.min(info.sizeBytes - 1, offset + chunk - 1)));
      }
      const after = await adapter.head(key);
      if (!after || after.sizeBytes !== info.sizeBytes || after.etag !== info.etag) throw new Error("storage_changed_during_digest");
      return { checksum: `sha256:${bytesToHex(hash.digest())}`, sizeBytes: info.sizeBytes };
    },

    async beginMultipart(key, contentType) {
      const c = cfg();
      if (!c) throw new Error("storage_not_configured");
      const res = await c.client.fetch(`${objectUrl(c, key)}?uploads`, { method: "POST", headers: { "content-type": contentType } });
      if (!res.ok) throw new Error(`multipart_begin_http_${res.status}`);
      const xml = new XMLParser({ parseTagValue: false }).parse(await res.text());
      const uploadId = xml.InitiateMultipartUploadResult?.UploadId;
      if (typeof uploadId !== "string" || !uploadId) throw new Error("multipart_missing_id");
      return uploadId;
    },

    async writePart(key, uploadId, number, bytes) {
      const c = cfg();
      if (!c) throw new Error("storage_not_configured");
      const res = await c.client.fetch(`${objectUrl(c, key)}?uploadId=${encodeURIComponent(uploadId)}&partNumber=${number}`, { method: "PUT", body: bytes as unknown as BodyInit });
      if (!res.ok) throw new Error(`multipart_part_http_${res.status}`);
      const etag = res.headers.get("etag");
      await res.body?.cancel();
      if (!etag) throw new Error("multipart_missing_etag");
      return etag;
    },

    async completeMultipart(key, uploadId, parts) {
      const c = cfg();
      if (!c) throw new Error("storage_not_configured");
      const body = new XMLBuilder().build({ CompleteMultipartUpload: { Part: parts.map(p => ({ PartNumber: p.number, ETag: p.etag })) } });
      const res = await c.client.fetch(`${objectUrl(c, key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "POST", headers: { "content-type": "application/xml" }, body });
      const xml = new XMLParser().parse(await res.text());
      if (!res.ok || xml.Error) throw new Error(`multipart_complete_http_${res.status}`);
    },

    async abortMultipart(key, uploadId) {
      const c = cfg();
      if (!c) throw new Error("storage_not_configured");
      const res = await c.client.fetch(`${objectUrl(c, key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`multipart_abort_http_${res.status}`);
    },

    async listVersions(key) {
      const c = cfg();
      if (!c || !key) throw new Error("storage_not_configured");
      const out: Array<{ key: string; versionId: string }> = [];
      let keyMarker = "", versionMarker = "";
      for (let page = 0; page < 100; page++) {
        const query = new URLSearchParams({ versions: "", prefix: key, "max-keys": "1000" });
        if (keyMarker) query.set("key-marker", keyMarker);
        if (versionMarker) query.set("version-id-marker", versionMarker);
        const res = await c.client.fetch(`${c.base}?${query}`);
        if (!res.ok) throw new Error(`versions_list_http_${res.status}`);
        const result = new XMLParser({ parseTagValue: false, isArray: name => name === "Version" || name === "DeleteMarker" }).parse(await res.text()).ListVersionsResult;
        if (!result) throw new Error("versions_invalid_response");
        for (const row of [...(result.Version ?? []), ...(result.DeleteMarker ?? [])]) {
          if (row.Key === key && typeof row.VersionId === "string") out.push({ key, versionId: row.VersionId });
        }
        if (String(result.IsTruncated) !== "true") return out;
        const next = String(result.NextKeyMarker ?? "");
        if (!next || (next === keyMarker && String(result.NextVersionIdMarker ?? "") === versionMarker)) throw new Error("versions_pagination_stalled");
        keyMarker = next; versionMarker = String(result.NextVersionIdMarker ?? "");
      }
      throw new Error("versions_pagination_limit");
    },

    async deleteVersion(key, versionId) {
      const c = cfg();
      if (!c || !key || !versionId) throw new Error("storage_not_configured");
      const res = await c.client.fetch(`${objectUrl(c, key)}?versionId=${encodeURIComponent(versionId)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`versions_delete_http_${res.status}`);
    },
  };
  return adapter;
}
