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
- Memory Book final video assembly uses authenticated RunPod server functions and a durable per-book active-job lock; finalization reuses a server-only helper so browser-supplied paths or durations cannot authorize source cleanup.
- Keep the Bun lifecycle patches for page-flip/react-pageflip: each wrapper owns disposal, cancels RAF/timers, and restores React-owned pages before destruction to prevent cross-route leaks.
- Memory Book material lists and source guards share same-book page/confirmed-job classification; completed job associations preserve assembled identity after source cleanup clears its foreign-key marker.
- Public Memory Book viewing is authorized only by an active random share token (memory_book_shares); owner functions stay authenticated, the public loader signs only page-used assets and never accepts book/user IDs.
