import { MEMORY_BOOK_R2_BUCKET } from "./materials";

export type MaterialUploadFailure = "authorization" | "validation" | "r2_network" | "r2_http" | "registration" | "server";

export class MaterialUploadError extends Error {
  constructor(public readonly category: MaterialUploadFailure, public readonly detail: string) {
    super(`Memory Book upload: ${category}:${detail}`);
  }
}

interface Ticket {
  ok: boolean;
  storage?: string;
  key?: string;
  uploadUrl?: string;
  contentType?: string;
  error?: "authorization" | "configuration";
}

/** Book Materials only: direct R2 writes, never a legacy write fallback. */
export async function uploadMemoryBookMaterial(
  createUpload: (args: { data: { bookId: string; role?: string; fileName?: string; contentType?: string } }) => Promise<Ticket>,
  request: { bookId: string; data: Blob; fileName: string; contentType: string },
): Promise<{ storage: string; path: string }> {
  if (request.data.size <= 0) throw new MaterialUploadError("validation", "empty_file");
  let ticket: Ticket;
  try {
    ticket = await createUpload({ data: { bookId: request.bookId, role: "source", fileName: request.fileName, contentType: request.contentType } });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
    throw new MaterialUploadError(status === 401 || status === 403 ? "authorization" : "server", "ticket_failed");
  }
  if (!ticket.ok || !ticket.uploadUrl || !ticket.key || ticket.storage !== MEMORY_BOOK_R2_BUCKET) {
    throw new MaterialUploadError(ticket.error === "authorization" ? "authorization" : "server", ticket.error === "configuration" ? "r2_not_configured" : "ticket_rejected");
  }
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "content-type": ticket.contentType ?? request.contentType },
      body: request.data,
    });
  } catch {
    // Never include the signed URL, response body, or credentials in diagnostics.
    throw new MaterialUploadError("r2_network", "cors_or_network");
  }
  if (!response.ok) throw new MaterialUploadError("r2_http", `http_${response.status}`);
  return { storage: MEMORY_BOOK_R2_BUCKET, path: ticket.key };
}