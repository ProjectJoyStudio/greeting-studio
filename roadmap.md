# Memory Book storage restructuring — current Greeting Studio only
- [ ] Fix destination checks, durable leased automatic retries and safe diagnostics; validate dispatcher with disposable assets and repair only cb891cbc-a2b6-4fd1-b530-ecb4a41332f3 backups.
- [x] Verify current Greeting Studio database/R2/B2 connections read-only; owner's clarification supersedes separate-environment assumptions. No other project access.
- [x] Add working keys, retained video originals, checksum/multipart copies, atomic completion, resumable cleanup and existing Admin controls; preserve existing books and tokens.
- [x] Verify disposable-book R2/B2 checksums, final package, exact-version cleanup, restore, manual emergency resolution, signed-in Admin verification and signed-out share controls; remove only test assets/book/link.
- [ ] Full browser photo/video/music/ZIP lifecycle: localhost storage access prevents reliable media/ZIP checks; no migration acceptance until verified from an allowed origin.
- [ ] Automatic durable retry dispatcher and approved existing-book migration remain disabled; permission/approval and full lifecycle verification required before deployment of those operations.
- [x] Deliver Russian implementation/test report distinguishing tested subset from incomplete acceptance; do not migrate existing books without separate approval.

# Remaining global interaction freeze
- [x] Inspect repeated modal/navigation cycles, pointer hit-testing, and global locks; freeze not reproduced.
- [x] Deliver diagnosis without speculative application or dependency changes; no remaining root cause confirmed.
- [x] Verify 1/5/12 desktop and touch cycles and five viewer departures; existing viewer cleanup preserved.

# Memory Book viewer cleanup
- [x] Dispose page-turn engines on route unmount and keyed replacement; cancel owned frames/timers.
- [x] Verify five visits, enlarged-media departures, autoplay departure, resize replacement, and pending mobile tap departure leave zero old viewer resources.

# RunPod processed-video integration
- [x] Connect server-only RunPod submit/status with persisted duplicate-safe jobs.
- [x] Replace active browser assembly; preserve editor and confirmation flow.
- [x] Verify output before finalization and backup; originals now survive until verified whole-book cleanup.
- [x] Run focused contract and controlled RunPod/UI tests: A/B/D passed, 20 tests passed; C skipped (no existing safe silent source). Browser playback could not be verified because sandbox Chromium lacks H264/AAC codecs; independent FFmpeg decode/order and SHA256 passed.

# Previous photo/source-video upload fix
- [x] Keep direct signed R2 uploads and remove legacy writes for Book Materials only.
- [x] Preserve diagnostic failure categories and verified registration/backup.
- [ ] Configure current bucket CORS: blocked by bucket configuration API returning 403; no configuration credential is available. External preview redirects to editor, so the live frame origin needs confirmation before changing its allowlist.
- [x] Controlled photo and source-video failure checks: direct PUT aborted, no legacy writes, no material added, safe diagnostic category visible.
- [ ] Successful photo/source-video R2+B2 checks: blocked by localhost CORS denial and unavailable bucket configuration permission. No substitute server upload performed.
- [x] Apply required package security update; eight targeted tests passed; latest project check is build OK, including the minimal root error-component type compatibility adjustment.
# Finished-video classification correction
- [x] Diagnose assembled-marker loss and page references: source FK is ON DELETE SET NULL; completed jobs preserve confirmed output IDs.
- [x] Apply shared classification and server source rejection without storage/processing changes.
- [x] Verify 32 targeted tests and real signed-in tabs/picker/direct rejection/return refresh; report distinguishes fresh assembly (not rerun) from verified current output.
- [x] Memory Book: "Use as finished" for ≤5-min uploads + visual finished-only page video gallery
