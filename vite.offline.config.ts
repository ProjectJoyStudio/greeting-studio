// Build of the downloadable offline Memory Book viewer.
//
// The result is ONE self-contained script plus ONE stylesheet that work from a
// local folder (file://), so no module loading, no server and no network are
// involved. This config is separate from the website build and never affects
// it.
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  build: {
    outDir: "dist-offline",
    emptyOutDir: true,
    cssCodeSplit: false,
    target: "es2020",
    lib: {
      entry: resolve(import.meta.dirname, "src/offline-viewer/main.tsx"),
      name: "JoyBook",
      formats: ["iife"],
      fileName: () => "book.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true, assetFileNames: "book.[ext]" },
    },
  },
  define: { "process.env.NODE_ENV": '"production"' },
});
