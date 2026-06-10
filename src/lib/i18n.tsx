import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ja" | "de";

type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = {
  en: {
    "radar.title": "Live Workspace Radar 🛰️",
    "radar.offline": "Live Workspace Radar 🛰️ · offline",
    "compose.eject": "Eject to Pub 🚀",
    "compose.deploying": "Deploying… 🍺",
    "sub.title": "Corporate Subscription",
    "sub.priceWeek": "$9.99/week",
    "sub.cta": "Subscribe via Stripe",
    "sub.razorpayRenew": "Renew Slot — ₹599 / Week",
    "sub.razorpayExtend": "Extend Slot — ₹599 / Week",
    "lang.label": "Language",
  },
  ja: {
    "radar.title": "ライブ職場レーダー 🛰️",
    "radar.offline": "ライブ職場レーダー 🛰️ · オフライン",
    "compose.eject": "パブに脱出する 🚀",
    "compose.deploying": "展開中… 🍺",
    "sub.title": "企業向けサブスクリプション",
    "sub.priceWeek": "¥1,500/週",
    "sub.cta": "Stripeでサブスクライブ",
    "sub.razorpayRenew": "スロット更新 — ₹599 / 週",
    "sub.razorpayExtend": "スロット延長 — ₹599 / 週",
    "lang.label": "言語",
  },
  de: {
    "radar.title": "Live-Arbeitsplatz-Radar 🛰️",
    "radar.offline": "Live-Arbeitsplatz-Radar 🛰️ · offline",
    "compose.eject": "In den Pub flüchten 🚀",
    "compose.deploying": "Wird bereitgestellt… 🍺",
    "sub.title": "Firmen-Abonnement",
    "sub.priceWeek": "9,99 €/Woche",
    "sub.cta": "Mit Stripe abonnieren",
    "sub.razorpayRenew": "Slot erneuern — ₹599 / Woche",
    "sub.razorpayExtend": "Slot verlängern — ₹599 / Woche",
    "lang.label": "Sprache",
  },
};

export const LANG_META: Record<Lang, { flag: string; label: string; country: string }> = {
  en: { flag: "🇬🇧", label: "EN", country: "GB" },
  ja: { flag: "🇯🇵", label: "JA", country: "JP" },
  de: { flag: "🇩🇪", label: "DE", country: "DE" },
};

const STORAGE_KEY = "drinkedin.lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nCtx = createContext<Ctx | null>(null);

function detectInitial(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && DICTS[stored]) return stored;
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase() as Lang;
    if (DICTS[nav]) return nav;
  } catch { /* ignore */ }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(detectInitial()); }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  };

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (key: string) => DICTS[lang]?.[key] ?? DICTS.en[key] ?? key,
  }), [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nCtx);
  if (ctx) return ctx;
  // Graceful fallback if provider missing — never crash UI.
  return { lang: "en", setLang: () => {}, t: (k) => DICTS.en[k] ?? k };
}

export function useT() { return useI18n().t; }
