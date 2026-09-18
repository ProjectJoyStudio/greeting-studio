// Client-safe vocabulary of the Project Joy storage layer.
//
// Nothing here talks to a provider. These are the logical names the rest of
// Project Joy may use so that product code never mentions Cloudflare,
// Backblaze or any future storage company by name.

/** What a configured storage area is used for, not who runs it. */
export type StorageRole = "primary" | "backup" | "emergency";

/** Technical identifier of one storage company we can talk to. */
export type StorageProviderId = "r2" | "b2";

/** The Project Joy products that own customer files. */
export type StorageProduct =
  | "standard-card"
  | "live-card"
  | "personal-video-greeting"
  | "memory-book";

/** The Project Joy owned (non-customer) asset families. */
export type SystemAssetCategory =
  | "catalog"
  | "music"
  | "decorations"
  | "backgrounds"
  | "templates"
  | "other";

/** One stored object as the storage layer sees it. */
export interface StorageObjectInfo {
  key: string;
  sizeBytes: number;
  contentType: string | null;
}

/**
 * Everything one storage company must be able to do for Project Joy.
 * A future third provider only has to supply this, nothing else changes.
 */
export interface StorageAdapter {
  readonly id: StorageProviderId;
  /** True when this installation actually has the settings for it. */
  isReady(): boolean;
  /** Human readable name of the configured area, for reports only. */
  describe(): string;
  head(key: string): Promise<StorageObjectInfo | null>;
  put(key: string, body: BodyInit, contentType?: string): Promise<boolean>;
  getBytes(key: string): Promise<Uint8Array | null>;
  signedReadUrl(key: string, seconds: number): Promise<string | null>;
  signedWriteUrl(key: string, seconds: number, contentType: string): Promise<string | null>;
  /** Removes exactly ONE object. Never a folder and never a prefix. */
  deleteObject(key: string): Promise<boolean>;
}

/**
 * Where one logical Project Joy file physically is right now. A logical file
 * may exist in several providers at once; that never makes it two projects.
 */
export interface StoragePlacement {
  provider: StorageProviderId;
  key: string;
  role: StorageRole;
}
