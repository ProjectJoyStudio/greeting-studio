# Real R2 primary → B2 backup, plus first photo migration

Goal: every newly stored file that goes through the new storage layer lands in the working area (Cloudflare) and automatically receives an independent reserve copy (Backblaze). Customers always read from the working area. Nothing ever switches to the reserve automatically.

## 1. Placement tracking (database)

New table `storage_placements` — one row per physical copy of one logical file:

- `id`, `object_key` (the logical address, identical for both copies)
- `provider` (`r2` | `b2`), `role` (`primary` | `backup` | `emergency`)
- `status` (`pending` | `copying` | `present` | `failed` | `deleting` | `deleted`)
- `size_bytes`, `checksum`, `content_type`
- `created_at`, `updated_at`, `verified_at`, `last_backup_at`, `last_error`

Constraints: unique `(object_key, provider)` so a retry can never create a second placement row; index on `(status, role)` so a later scheduled retry can find pending/failed work cheaply. RLS on, no customer access; only server-side privileged code reads/writes it. Existing file records (`memory_book_materials` etc.) stay exactly as they are — the placement table is additional, never a replacement.

## 2. Backup service (`src/lib/storage/backup.server.ts`)

`recordPrimary(key, info)` → confirms the object really exists in the working area, then writes/updates the primary placement as `present`.

`backupToReserve(key)`:
1. skip immediately when a verified reserve copy of the same size already exists (idempotent);
2. mark backup placement `copying`;
3. stream the bytes working area → reserve area through the existing adapters;
4. re-read the reserve object and compare size;
5. only then mark `present` with a verification timestamp;
6. on any failure: record `failed` + the error text, leave the working copy untouched, stay retryable.

Never throws into the customer path: a failed reserve copy returns a result, it never undoes an upload, never deletes the working object, never re-charges anything.

`retryPendingBackups(limit)` — bounded, safe to call repeatedly; no scheduler is wired up in this task.

Deletion stays per-provider: nothing in this service deletes across providers, so the two areas keep independent retention. No code path makes the reserve area serve customers — role selection remains manual-only in the registry.

## 3. Controlled technical test (before touching photos)

A dedicated test object under `system/other/_storage-tests/…`:
working-area upload → primary placement → automatic copy → reserve verification → `present`; then a repeat run to prove no duplicate copy or row; then a forced-failure run to prove the working copy and its placement stay intact while the backup records `failed` and can be retried. The test objects are then deleted from both areas and their placement rows removed. No customer object is touched.

## 4. First product category: new Memory Book photos

Only new photo uploads change. Server function `createMemoryBookPhotoUpload` mirrors the proven video ticket: ownership + paid-book check, server-built address

```text
users/<user-id>/memory-book/<book-id>/photos/<unique>.<ext>
```

(no lifecycle status in the address), short-lived upload link, browser PUTs directly. The material record is written only after the stored object is confirmed, with `bucket = "r2"` — the same marker the videos already use, so listing, preview, page placement, the read-only viewer and the offline ZIP keep working unchanged through the existing bucket-aware link helper. The reserve copy is started server-side right after registration and never blocks the customer.

If the working area is unavailable, photos fall through to today's storage exactly as videos do.

Old photos, old videos, other products, system assets, credits, auth and the admin account are untouched. The proven video flow is not rewritten; the report will state what adding placement tracking to it would require.

## 5. Verification

Project check, the technical test above, then a full real run on a paid book: upload a new photo, see it in Materials, place it on a page, save, leave, reopen, complete the book, open the read-only viewer, generate the offline ZIP and confirm the photo is inside and works with no network. Plus a legacy-photo and legacy/R2-video regression pass.
