import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";

export function LanguageSelector() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur transition hover:border-primary/40 hover:text-foreground"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4 text-primary/70" />
        <span className="tracking-wide">{current.flag}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-warm"
        >
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => {
                  setLang(l.code as Lang);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-secondary"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                    {l.flag}
                  </span>
                  <span>{l.label}</span>
                </span>
                {lang === l.code && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}