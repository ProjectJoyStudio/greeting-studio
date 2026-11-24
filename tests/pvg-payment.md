# PVG payment regression

Only disposable accounts/projects are written. No external generation or storage objects are created.
Private credentials/state stay under `/tmp/browser/pvg-payment`, never in project files.

1. Run `bunx vitest run src/lib/personal-video/payment.test.ts`.
2. With the existing server database environment available, run `PVG_TEST_WRITE=yes python3 tests/pvg_payment_integration.py --keep-for-browser`.
3. Export the current `PERSONAL_VIDEO_RENDER_I18N` dictionary to `/tmp/browser/pvg-payment/locales.json`.
4. Run `python3 tests/pvg_payment_browser.py`: signed-in validation in six languages, real database purchase followed by restored uncertainty state, twelve viewport categories/orientations, six localized uncertainty states. This is Chromium emulation, not physical-device verification. The payment panel must fit even if the unchanged site header overflows.
5. Run `python3 tests/pvg_payment_orphan_browser.py`: a disposable paid operation that never reached submission is reconciled by the real server, refunded exactly ten credits, displayed in the signed-in UI and remains refunded after refresh. The remaining-balance row must show exactly twenty credits.
6. Always run `python3 tests/pvg_payment_integration.py --cleanup` after browser checks, including on failure. The integration script cleans its own accounts on its own failure.

Real integration exercises service RPCs, authenticated customer denials, eight simultaneous purchase requests, eight simultaneous refund requests, cross-project wallet contention, ledger/job insertion rollback and saved scene-attempt balances. Provider rejection, timeout, success and asynchronous failure are mocked in Vitest. No claim of live provider generation, actual video download, Safari/Edge or physical Windows/macOS/iOS/Android testing is made.