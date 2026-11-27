# Memory Book dashboard navigation acceptance

Read-only customer task, 2026-11-27. Never purchase, edit, share-create/disable or delete real books during navigation testing.

- Existing `/dashboard/memory-books` entry: three Links only, no combined collection.
- Child routes: `/working`, `/completed`, `/storage`; exclusive classification from owner-scoped completed-service purchase ledger, never retention timestamps.
- Run `bunx vitest run src/lib/memory-book/dashboard-classification.test.ts src/lib/memory-book/storage-offers.test.ts` for classification and offer contracts.
- Chromium viewport matrix: 16 desktop/laptop/phone/tablet portrait/landscape sizes × en/ru/uk/pl/de/fr. Check three URLs, active link, no document overflow, disjoint card IDs, both protected books in completed, read-only share dialog and Back/Forward. Latest: 96/96 after section-scoped compact header correction.
- Actual owner read-only editor/viewer entry confirmed; loaded completed covers confirmed; ZIP controls accessible, no ZIP run.
- Browser-only serialized-response mocks: delayed load, empty working, failed request + retry back to real rows, unavailable purchase evidence fallback, one confirmed-purchase storage card + two completed. No purchases or entitlement writes.
- Full unit suite: 215/215. Books/pages/wallets/transactions/shares/purchases database hashes equal before and after.
- This is viewport emulation in Chromium, not physical-device or OS-browser verification. Paid flow, native touch, Safari/Edge, complete ZIP and public-share creation were not run.
