# "Скачать книгу" — offline package download for completed books

Connect the already-tested stable offline book package to a download button in
Personal Cabinet → My Books, for completed books only.

## What the customer sees

On a completed book card, next to "Открыть", a new button "Скачать книгу".
Pressing it prepares the package (progress text while it works), then the
browser saves one file:

`Project Joy — Книга воспоминаний и поздравлений.zip`

Extracted, it contains exactly the structure already tested:

```text
Project Joy — Книга воспоминаний и поздравлений/
├── Открыть книгу.html
└── book-files/   (photos, videos, music, decorations, fonts, viewer)
```

Draft books keep their current buttons and get no download action.

## Which existing implementation is reused

The stable offline viewer is `src/offline-viewer/main.tsx` plus
`src/offline-viewer/offline.css` — the fixed, full-height, non-scrolling frame
that removed the page-turn jumping — built by `vite.offline.config.ts` into
`dist-offline/book.js` + `book.css`. That build output is the one that produced
`memory-book-offline-test-stable.zip`. It is reused untouched; no viewer,
layout or CSS change is part of this task.

The existing one-off exporter `scripts/export-offline-book.ts` defines the
package data shape (pages, materials, decorations, cover/leaf, leaf order,
music) and the local-path rewriting rules. Those exact rules are reused; the
script keeps working and stays for laboratory use.

## How it works

Packaging happens in the customer's browser, so no ZIP is ever written to
Project Joy storage and nothing can accumulate there.

1. New server function `buildMemoryBookOfflinePlan` (authenticated) checks the
   book belongs to the signed-in customer and is completed, reads the same
   tables the script reads, and returns a plan: the book data with local file
   names already substituted, plus a short-lived read link for every file the
   package needs. It only reads — no writes, no deletes.
2. The page downloads each file through those links and writes it straight into
   the archive as it goes, then adds the viewer, fonts and `Открыть книгу.html`.
3. The archive is only offered to the customer after it is complete. Any
   failure shows a clear message and leaves the book untouched; the customer
   can press the button again.

## Technical details

- New `src/lib/memory-book/offline-export.functions.ts`: `.middleware([requireSupabaseAuth])`,
  input `{ bookId }`. Ownership + `status === "completed"` guard, otherwise
  `{ ok: false }`. Uses the admin client only for signed URLs
  (`createSignedUrl`, 1h) across the memory-book buckets; SVG decorations are
  flagged `inline: true` so the client base64-encodes them into the data file,
  matching the tested package.
- Shared shape: the row→page/material/decoration mapping moves into
  `src/lib/memory-book/offline-package.ts` so the server function and
  `scripts/export-offline-book.ts` produce byte-identical data.
- New `src/lib/memory-book/offline-zip.ts` (client): streams entries into a ZIP
  (store, no compression) using `client-zip`, and saves through the File System
  Access picker when available, falling back to a blob download. Progress is
  reported per file.
- Viewer + fonts ship as static same-origin files under `public/offline/`
  (`book.js`, `book.css`, `fonts.css`, the woff2 files), added by running the
  existing offline build once and baking the Google font files locally — so the
  package never fetches fonts at export or view time.
- New button and its wording in `src/routes/dashboard.memory-books.tsx` and a
  new locale entry (`mbd_download`, `mbd_download_working`, `mbd_download_failed`)
  in all six languages.

Not in this task: online storage, share links, payments, credits, cleanup
policies, any viewer redesign.

## Verification

Typecheck, then a real completed book exported through the button in a browser
session, extracted and opened from disk with the network disabled: cover,
page order, manual and automatic turning (no jumping), Play/Pause, "С начала",
enlargement, photos, text, decorations, video, music. Also confirmed: the book
row and its files are unchanged after download, and a draft book shows no
download button.
