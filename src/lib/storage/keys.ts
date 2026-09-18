// Client-safe rules for how Project Joy names its stored files.
//
// Two areas only:
//   system/<category>/...                       Project Joy owned assets
//   users/<user>/<product>/<project>/...        customer content
//
// A file is never moved or copied because its business status changed: the
// status lives in the database, the file keeps one single address.

import type { StorageProduct, SystemAssetCategory } from "./types";

export const SYSTEM_PREFIX = "system";
export const USERS_PREFIX = "users";

/** Keeps an address safe and predictable, without inventing new folders. */
function segment(value: string): string {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function tail(parts: string[]): string {
  return parts
    .map((part) => segment(part))
    .filter(Boolean)
    .join("/");
}

/** Address of one Project Joy owned asset, e.g. a catalog image. */
export function systemKey(category: SystemAssetCategory, ...parts: string[]): string {
  return [SYSTEM_PREFIX, segment(category), tail(parts)].filter(Boolean).join("/");
}

/** Address of one customer file, always attributable to user/product/project. */
export function userKey(
  userId: string,
  product: StorageProduct,
  projectId: string,
  ...parts: string[]
): string {
  return [USERS_PREFIX, segment(userId), segment(product), segment(projectId), tail(parts)]
    .filter(Boolean)
    .join("/");
}

/** The folder that holds everything of exactly one customer project. */
export function userProjectPrefix(
  userId: string,
  product: StorageProduct,
  projectId: string,
): string {
  return `${USERS_PREFIX}/${segment(userId)}/${segment(product)}/${segment(projectId)}/`;
}

/** True when the address really sits inside that customer project folder. */
export function isInsideUserProject(
  key: string,
  userId: string,
  product: StorageProduct,
  projectId: string,
): boolean {
  return key.startsWith(userProjectPrefix(userId, product, projectId));
}
