// Entry point of the downloadable offline Memory Book.
//
// It renders exactly the same book component as the website, but the data and
// every picture, video and piece of music come from the folder next to this
// file. Nothing here talks to any server.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { I18nProvider } from "@/lib/i18n";
import {
  MemoryBookBook,
  type MemoryBookBookData,
} from "@/components/memory-book/MemoryBookBook";
import "./offline.css";

declare global {
  interface Window {
    __JOY_BOOK__?: MemoryBookBookData;
  }
}

const data = window.__JOY_BOOK__;
const host = document.getElementById("joy-book");

if (host && data) {
  createRoot(host).render(
    <StrictMode>
      <I18nProvider>
        <div className="joy-book-frame mx-auto w-full max-w-5xl">
          <MemoryBookBook data={data} />
        </div>
      </I18nProvider>
    </StrictMode>,
  );
}
