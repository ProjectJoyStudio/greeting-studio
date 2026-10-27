<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Book Materials uses `materials-upload.ts` for direct signed R2-only photo/source writes, independently of final video processing. Origin access belongs in bucket configuration, never upload code.
- Memory Book final video assembly uses authenticated RunPod server functions and a durable per-book active-job lock; confirmation retains originals and edits, while verified whole-book storage finalization exclusively owns later working cleanup.
- Keep the Bun lifecycle patches for page-flip/react-pageflip: each wrapper owns disposal, cancels RAF/timers, and restores React-owned pages before destruction to prevent cross-route leaks.
- Memory Book material lists and source guards share same-book page/confirmed-job classification; completed job associations preserve assembled identity after source cleanup clears its foreign-key marker.
- Public Memory Book viewing is authorized only by an active random share token (memory_book_shares); owner functions stay authenticated, the public loader signs only page-used assets and never accepts book/user IDs.
- New Memory Book files use the shared working/completed key hierarchy; durable per-book storage operations hold immutable dependency snapshots and leases, and completed reads resolve through their activated manifests instead of rewriting customer references.
- Exact-version permanent deletion is a separate adapter operation from ordinary independent provider deletion; multipart transfers checkpoint parts and verify SHA-256 through bounded range reads so large media is not buffered wholesale.
- Memory Book automatic backup retries reuse storage placements with atomic token-fenced leases and checkpoints; a service-only scheduler credential gates a wake-on-enqueue, drain-unscheduled callback so retries survive page departures without exposing privileged operations.
- Storage existence checks never treat HTTP 403 as absence; after a HEAD 403 the adapter accepts "missing" only from an authoritative NoSuchKey or an authorized exact-key listing, because B2 denies HEAD of absent keys for some key scopes and daily caps.
- Offline Memory Book ZIP: the click handler calls requestOfflineSaveTarget (statically imported) before any await, because browsers allow the Save dialog only during the click; preparation errors are categorized and never silently omit book files.
- Memory Book flip-engine replacement (size/orientation) is committed only while no leaf is turning (onChangeState "read") and starts at the tracked physical face mapped to its spread; the public page reserves scrollbar space and the book clips horizontal overflow, because scrollbars toggled by a turn rebuilt the engine mid-turn and lost the turn.
