import { useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, createI18n, detectLanguage, rememberLanguage } from "./i18n.ts";
import type { Language } from "./messages.ts";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    rememberLanguage(lang);
  }, [lang]);

  const value = useMemo(() => createI18n(lang, setLang), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
