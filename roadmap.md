# Photo/source-video upload fix
# RunPod processed-video integration
- [ ] Connect server-only RunPod submit/status with persisted duplicate-safe jobs.
- [ ] Replace active browser assembly; preserve editor and confirmation flow.
- [ ] Verify output before existing finalization, backup, and involved-source cleanup.
- [ ] Run focused contract and controlled RunPod/UI tests; report any blockers.

- [x] Keep direct signed R2 uploads and remove legacy writes for Book Materials only.
- [x] Preserve diagnostic failure categories and verified registration/backup.
- [ ] Configure current bucket CORS: blocked by bucket configuration API returning 403; no configuration credential is available. External preview redirects to editor, so the live frame origin needs confirmation before changing its allowlist.
- [x] Controlled photo and source-video failure checks: direct PUT aborted, no legacy writes, no material added, safe diagnostic category visible.
- [ ] Successful photo/source-video R2+B2 checks: blocked by localhost CORS denial and unavailable bucket configuration permission. No substitute server upload performed.
- [x] Apply required package security update; eight targeted tests passed; latest project check is build OK, including the minimal root error-component type compatibility adjustment.