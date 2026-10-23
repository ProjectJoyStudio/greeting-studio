# Memory Book page-turn lifecycle patches

Bun applies the version-pinned patches in package.json to both shipped runtime
formats. Upstream page-flip 2.0.7 destroy() removes DOM/listeners but leaves its
continuous renderer alive; react-pageflip 2.0.3 does not call it on unmount.

The patches add terminal RAF cancellation, owned initialization/touch timer
cancellation, and a root-preserving dispose() method. The official destroy()
still removes the root. The React wrapper disposes its own engine in layout
cleanup, restores moved React page nodes before removing library shells, and
recreates the engine during effect replay. Ordinary page updates retain it.

The original upstream source maps/TypeScript sources are not the patched runtime;
use the patched distribution files when diagnosing these lifecycle methods.
Run src/lib/memory-book/viewer-lifecycle.test.ts when updating either dependency,
and repeat the signed-in viewer/navigation browser regression.