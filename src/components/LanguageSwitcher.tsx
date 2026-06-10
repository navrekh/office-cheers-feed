import { LANG_META, useI18n, type Lang } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      aria-label={t("lang.label")}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="shrink-0 h-5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 border border-sky-400/50 rounded text-sky-100 px-1.5 py-0 leading-none cursor-pointer hover:bg-sky-500/30 focus:outline-none focus:ring-1 focus:ring-sky-300"
      title={t("lang.label")}
    >
      {(Object.keys(LANG_META) as Lang[]).map((l) => (
        <option key={l} value={l} className="bg-slate-950 text-sky-100">
          {LANG_META[l].flag} {LANG_META[l].label}
        </option>
      ))}
    </select>
  );
}
