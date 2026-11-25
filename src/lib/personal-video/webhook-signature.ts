// Replicate (Standard Webhooks) signature verification. Pure, runtime-neutral.

function b64ToBytes(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function verifyReplicateSignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const ts = Number(timestamp);
  if (!id || !Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false;
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = b64ToBytes(raw);
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)),
  );
  for (const part of signatureHeader.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    try {
      if (sameBytes(mac, b64ToBytes(sig))) return true;
    } catch {
      /* malformed signature part */
    }
  }
  return false;
}

