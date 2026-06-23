import type { ReactNode } from "react";

export function NavItem({
  icon,
  label,
  active,
  badge,
  pulseKey,
  bounce,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  pulseKey?: number;
  bounce?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center px-2 sm:px-3 py-1 min-w-[44px] sm:min-w-[64px] text-[11px] transition-colors ${
        active
          ? "text-foreground border-b-2 border-primary -mb-px"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={label}
      title={label}
    >
      <div className="relative">
        {icon}
        {badge ? (
          <span
            key={pulseKey ?? 0}
            className={`absolute -top-1.5 -right-2 bg-amber-500 text-amber-950 text-[9px] font-bold rounded-full min-w-4 h-4 px-1 grid place-items-center shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-notif-glow ${bounce ? "animate-bounce" : ""}`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </div>
      <span className="mt-0.5 hidden sm:block">{label}</span>
    </button>
  );
}

export default NavItem;
