# Memory Book viewer regression matrix

Public viewing is read-only. Use existing active links; never create links, complete books, save owner music settings, or change storage during this matrix.

## Automated rules

Run `bunx vitest run src/lib/memory-book/viewer-navigation.test.ts src/lib/memory-book/viewer-position.test.ts src/lib/memory-book/viewer-lifecycle.test.ts src/lib/memory-book/share-token.test.ts`.

## Browser acceptance

Run `VIEWER_SHARES_FILE=/tmp/viewer-shares.json BATCH=0 python3 scripts/check-memory-book-viewer.py` (repeat BATCH=1 and 2). The input is a locally protected JSON array of `{book_id, token}` records for the two authorized existing books. Do not commit the input. Browser outputs live under `/tmp/browser/viewer-audit`; never print URLs/tokens. Requires preinstalled Python Playwright/Chromium and the running app at localhost:8080.

The script checks displayed DOM faces (not counters), all forward/back pages, stop/resume/end, position after rotation, horizontal overflow, button height, and runtime exceptions; captures cover/back screenshots. Review screenshots manually. Intermediate animated faces may appear together in automatic samples; final settled states are the acceptance signal.

| Layout | Size | Touch |
|---|---|---|
| Desktop | 1280 × 1800 | No |
| Laptop | 902 × 772 | No |
| Small phone | 320 × 568 | Yes |
| Large phone | 430 × 932 | Yes |
| Android small | 360 × 640 | Yes |
| Android large | 412 × 915 | Yes |
| Small tablet | 768 × 1024 | Yes |
| Large tablet | 1024 × 1366 | Yes |
| Android tablet | 800 × 1280 | Yes |

Every size also rotates to its inverse. Additionally run full portrait automatic passage without rotation on phone/tablet, both books, and full Firefox desktop passage. Physical Safari/iPhone/iPad/Android/Windows/macOS/Edge checks remain required separately when available; Chromium emulation is not those browsers/devices.

## Required interactive checks

- Single tap; double tap photo; close/Escape returns to same face.
- Swipe forward/back and mouse drag in a **non-video area**; vertical scrolling must not turn pages.
- Open a photo during an active turn, wait beyond one auto interval, close, and verify resume without reset.
- Video double tap/double click, audio, fullscreen, close/same face; gestures over video must not turn the book.
- Music user-gesture play/pause, volume, failed autoplay, pause for video and resume after close; do not invoke owner save callbacks in read-only tests.
- All six languages selected through the public selector; verify idle and active labels, narrow wrapping, cover/back/media/error text.
- Browser-injected 404 photo/video and failed initial server request; verify localized message, retry, and continuing navigation.
- Resize by one pixel and rotate while a leaf moves; preserve the physical face or containing spread.
- Owner viewer read-only navigation; offline export code must not change without a separately scoped task.

Record actual browser/OS, emulated sizes vs physical devices, codec availability, screenshots, console exceptions and any unverified scenario. A build or unit-test pass alone is not acceptance.