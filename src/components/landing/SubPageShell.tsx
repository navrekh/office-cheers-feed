import type { ReactNode } from "react";

export function SubPageShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] font-semibold text-amber-300/90 hover:text-amber-200 transition"
        >
          ← Back to feed
        </button>
      </div>
      <header className="space-y-1">
        <h2 className="text-xl font-black text-foreground">{title}</h2>
        {subtitle && <p className="text-[12px] text-neutral-500">{subtitle}</p>}
      </header>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export default SubPageShell;
