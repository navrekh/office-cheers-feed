import { useEffect, useState } from "react";

/**
 * Listens for the global `drinkedin:panic-state` event dispatched by
 * <PanicButton />. While `active === true`, callers should pause any
 * background simulations, timers, animations, or notification pulses so
 * nothing leaks visually or audibly through the stealth Excel overlay.
 */
export function usePanicState(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    function onPanic(e: Event) {
      const detail = (e as CustomEvent<{ active: boolean }>).detail;
      setActive(!!detail?.active);
    }
    window.addEventListener("drinkedin:panic-state", onPanic);
    return () => window.removeEventListener("drinkedin:panic-state", onPanic);
  }, []);
  return active;
}
