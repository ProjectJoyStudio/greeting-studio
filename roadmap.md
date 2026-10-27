# Memory Book storage restructuring — current Greeting Studio only
- [ ] Oct 27 public viewer: reproduce both existing links read-only, fix confirmed reset cause, test sequential/interactive/responsive navigation and owner/offline regressions; report actual browser/device limits in Russian. Never change books, links, storage or publish.
- [x] Oct 26 disposable finalization executed: 6/6 R2+B2 package hashes, atomic activation, 7 working keys/versions cleaned with failure/resume, viewer/video/music and controlled offline ZIP, exact 13-key removal; existing books/shares/wallets/placements unchanged. Full photo composition and normal-origin ZIP acceptance remain unverified; see Russian report.
- [x] Fix bounded destination checks, durable leased retry queue and diagnostics; verify real callback, disposable R2/B2 files, concurrency/expired leases and repair only authorized test-book video; both reserves SHA-256 verified, Admin 2/2.
- [x] Activate and verify external automatic scheduling on the stable preview callback (Oct 26).
- [x] Verify current Greeting Studio database/R2/B2 connections read-only; owner's clarification supersedes separate-environment assumptions. No other project access.
- [x] Add working keys, retained video originals, checksum/multipart copies, atomic completion, resumable cleanup and existing Admin controls; preserve existing books and tokens.
- [x] Verify disposable-book R2/B2 checksums, final package, exact-version cleanup, restore, manual emergency resolution, signed-in Admin verification and signed-out share controls; remove only test assets/book/link.
- [ ] Full browser photo/video/music/ZIP lifecycle: localhost storage access prevents reliable media/ZIP checks; no migration acceptance until verified from an allowed origin.
- [ ] Existing-book migration remains disabled; separate approval and full lifecycle verification required.
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

## Automatic R2 → B2 backup (Oct 26)
- [x] Explain HEAD 403 in the adapter (provider code/message, NoSuchKey or exact-key listing) and record a code-version marker per attempt.
- [x] Preview runs explain-403-v1; scheduler enabled; 4 test-book reserves recovered automatically; 6/6 SHA-256 match.
- [x] 15 disposable live-scheduler cases passed and idle shutdown confirmed; disposable files removed. Published site still has no build (not published by request).
- [x] Oct 26 browser-upload 403: investigated real execution; failed attempt came from an older server code version (no lease/history), recovered automatically by the scheduler; real browser photo/video uploads with a temporary reserve outage recovered automatically; no code change required.
- [x] Oct 26 fix completed-book ZIP download (save dialog timing, fallback, errors, real e2e).
