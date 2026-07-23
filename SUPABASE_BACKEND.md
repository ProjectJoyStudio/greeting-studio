# Project Joy — Supabase Backend

This document tracks the shipped backend foundation, what is fully wired vs.
prepared, and how to test and roll back safely.

## Environment variables

Frontend (safe to bundle):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-only (never bundled, never logged):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No service-role key is exposed to the browser. Only publishable / anon keys
are used in client code.

## Milestone 1 — Schema (DONE)

Single migration created every domain the platform will need.

**Access & identity**
- `profiles` (linked to `auth.users`; display_name, preferred_language, account_status)
- `user_roles` + enum `app_role` (customer, editor, admin, super_admin)
- SECURITY DEFINER helpers: `has_role()`, `is_admin()`, `is_editor_or_above()`, `is_super_admin()`
- Auto-provision profile + customer role on signup (`handle_new_user()`)

**Languages** — seeded with ru, en, de, uk, fr, pl.

**Unified media** — `media_assets` covers images, animated cards, video, audio, songs, voiceovers, cartoons, voice samples, documents, order attachments, previews. Fields include owner_user_id, order_id, asset_type, purpose, storage_bucket/path, MIME, size, width/height, duration, checksum, visibility (public/private/restricted), processing/moderation status, metadata JSONB, soft delete.

**Catalog taxonomy** — occasions, recipients, categories, tags, styles, moods, visual_objects, age_groups, seasons, themes. Each has a mirrored `*_translations` table keyed by language_code, with public read + editor-manage RLS. Seeded with a full multilingual starter set including the required `forgive_me` occasion.

**Catalog content**
- `catalog_backgrounds` (reusable across many variants)
- `catalog_card_variants` (primary occasion, style, mood, orientation, age group, status, flags, publication_date, notes, search_keywords)
- Junction tables: `card_variant_additional_occasions`, `card_variant_categories`, `card_variant_recipients`, `card_variant_tags`, `card_variant_visual_objects`, `card_variant_themes`, `card_variant_seasons` (multi-category is fully supported)
- `catalog_card_translations` — one per (variant, language)
- `catalog_text_designs` — text-overlay layout, optional per-language row, mobile/tablet/desktop overrides

**Orders & fulfilment (schema only, not activated)**
- `orders`, `order_participants`, `consent_records`
- `voice_profiles` (private, owner-only)
- `generation_jobs`, `generation_attempts` (multi-provider routing, retries, cost tracking)

**Credits & payments (schema only, ledger-based)**
- `credit_wallets`, `credit_transactions` (immutable ledger with typed transaction kinds)
- `payment_records`, `subscriptions`, `subscription_credit_grants`

**Delivery & notifications (schema only)**
- `scheduled_deliveries`, `notification_preferences`, `notification_jobs`, `notification_logs`

**Admin**
- `admin_audit_log` — records actor, action, entity_type/id, previous_data, new_data, request_metadata

## Milestone 2 — Storage buckets (DONE)

| Bucket             | Kind    | Access model                                    |
|--------------------|---------|-------------------------------------------------|
| catalog-images     | Private | Everyone can read via signed URL; editors write |
| catalog-animations | Private | Same as catalog-images                          |
| public-previews    | Private | Same as catalog-images                          |
| user-uploads       | Private | Owner-only (first path segment = user id)       |
| generated-images   | Private | Owner-only                                      |
| generated-videos   | Private | Owner-only                                      |
| generated-audio    | Private | Owner-only                                      |
| voice-samples      | Private | Strictly owner-only                             |
| order-files        | Private | Owner-only                                      |
| private-previews   | Private | Owner-only                                      |

> The workspace policy blocks true public buckets. All catalog-facing
> buckets are technically private but their SELECT policy is `USING (true)`,
> so reads succeed via signed URL. If you enable public buckets in
> **Workspace Settings → Privacy & Security**, switch these three buckets
> to `public=true` for direct CDN URLs (`supabase.storage.from().getPublicUrl`)
> instead of signed URLs.

All private per-user buckets enforce `auth.uid()::text = (storage.foldername(name))[1]`.
Upload paths must therefore start with the user's UUID, e.g.
`user-uploads/<user_id>/<uuid>.jpg`.

## Milestone 3 — Catalog admin UI wired to Supabase (PARTIAL)

The reusable repository layer is shipped at `src/lib/admin/catalog-mgmt/repo.ts`
and covers:

- Signed-URL cache (`getSignedUrl`)
- `uploadBackgroundImage(file)` — uploads to `catalog-images`, creates a `media_assets` row, rolls back the file if the DB insert fails
- Taxonomy: `ensureTaxonomyForLocal()` upserts any local slug the UI knows about so junction inserts always resolve
- Backgrounds: `listBackgrounds`, `insertBackground`, `updateBackground`, `softDeleteBackground`
- Card variants: `listVariants`, `upsertVariant` (writes base row + all 7 junctions + translations + text design in one call), `softDeleteVariant`, `hardDeleteVariant`
- Row → local shape mappers (`rowToBackground`, `rowsToVariant`) that keep the existing UI compatible

### Not yet activated in the UI

The admin Catalog UI still reads/writes to the local `CatalogMgmtProvider`
in-memory store. Cutting the store over to the repo is the next step and
will:

1. Bootstrap by awaiting `ensureTaxonomyForLocal(DEFAULT_TAXONOMY)` and
   loading backgrounds + variants via the repo.
2. Rewrite `addBackground` / `updateBackground` / `addVariant` /
   `updateVariant` / `deleteX` / `duplicateX` to write through with
   optimistic UI + toast on failure.
3. Replace image `data:` URLs with signed Storage URLs.
4. Show loading and error states in the Catalog shell.

This is scoped as its own milestone because the current UI has ~1500 lines
that assume sync mutations returning objects — the rewire needs to happen
as one atomic pass to avoid mixed sources of truth.

## Security summary

- RLS enabled on every user-scoped and admin-scoped table.
- Public catalog rows are readable by `anon` only when
  `status = 'published' AND NOT is_hidden AND NOT is_archived AND deleted_at IS NULL`.
- Editors and admins get full read via `is_editor_or_above(auth.uid())`.
- `user_roles` writes are locked to `super_admin` only.
- Only `super_admin` can hard-delete `catalog_backgrounds` or `catalog_card_variants`.
- Private buckets: only the owning user (path prefix = user id) or an admin
  can read/write; anon cannot list or download.

The 10 Supabase linter warnings about `SECURITY DEFINER` functions being
executable by anon/authenticated are expected: those helpers are `has_role`,
`is_admin`, `is_editor_or_above`, `is_super_admin`, `handle_new_user`.
They must be callable so RLS policies can evaluate; they return only
booleans and never leak table contents.

## Acceptance test checklist

Once Milestone 3's UI wiring lands, run through these end-to-end:

1. Sign in as an admin. Upload a background image via the Backgrounds page.
2. Confirm the file appears at `catalog-images/<uuid>.{ext}` (Backend viewer).
3. Confirm `media_assets` and `catalog_backgrounds` each have a new row.
4. Create a card variant, set "Forgive Me" as primary occasion, add a
   recipient + category, save.
5. Refresh the browser and reopen the card — every field should still be present.
6. Filter by "Forgive Me" — the card appears.
7. Publish → appears on the public `/catalog` page.
8. Hide → disappears from public but remains in admin.
9. Unhide → returns.
10. Archive → hidden from normal admin workflow; restore returns it.
11. Delete with confirmation → row is soft-deleted (hard-delete is
    super_admin only).
12. Verify a signed-out visitor cannot download from any private bucket.
