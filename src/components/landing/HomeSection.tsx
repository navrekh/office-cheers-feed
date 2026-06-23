import type { ReactNode } from "react";
import { hashStr } from "@/lib/randomIdentity";

export function HomeSection({
  eyebrow,
  title,
  blurb,
  children,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  children: ReactNode;
}) {
  // Grungy notice-board: a weathered sheet of paper pinned to a dark wall.
  return (
    <section
      className="relative bg-[#e3dac9] text-stone-900 p-6 md:p-8 shadow-[0_25px_50px_-15px_rgba(0,0,0,0.85)] border-b-4 border-r-4 border-stone-400/80"
      style={{ fontFamily: "'Special Elite', 'Courier Prime', monospace" }}
    >
      {/* coffee-stain blur */}
      <div className="pointer-events-none absolute top-6 right-6 w-28 h-28 rounded-full bg-amber-900/10 blur-3xl" />
      {/* fake fold shadow */}
      <div className="pointer-events-none absolute -left-1 top-0 bottom-0 w-1 bg-black/5" />
      {/* pushpin */}
      <div className="absolute -top-2 left-8 w-3.5 h-3.5 rounded-full bg-red-600 shadow-inner ring-2 ring-red-900" />

      <header className="mb-4 flex items-start justify-between gap-3 border-b border-dashed border-stone-400/70 pb-3">
        <div className="min-w-0">
          <div
            className="text-[10px] tracking-[0.22em] text-stone-500 uppercase"
            style={{ fontFamily: "'Courier Prime', monospace" }}
          >
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl md:text-2xl font-bold text-stone-900 leading-tight uppercase tracking-tight">
            {title}
          </h2>
          {blurb && (
            <p className="mt-1 text-[12px] text-stone-600 leading-snug normal-case">
              {blurb}
            </p>
          )}
        </div>
        <div
          className="hidden sm:block shrink-0 text-[9px] text-stone-500 text-right leading-tight uppercase"
          style={{ fontFamily: "'Courier Prime', monospace" }}
        >
          FILE #{Math.abs(hashStr(title)) % 9999}
          <br />
          CLASSIFIED // ANON
        </div>
      </header>

      {/* Inner "interactive zone" — dark again so all the live widgets read correctly */}
      <div className="relative rounded-xl bg-neutral-950 text-foreground p-4 md:p-5 border border-stone-800/60 shadow-inner space-y-3" style={{ fontFamily: "inherit" }}>
        <div className="text-foreground" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {children}
        </div>
      </div>
    </section>
  );
}

export default HomeSection;
