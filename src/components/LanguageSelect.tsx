import { useI18n } from "../i18n/i18n.ts";
import { LANGUAGES, LANGUAGE_NAMES, type Language } from "../i18n/messages.ts";
import { Icon } from "./Icon.tsx";

export function LanguageSelect() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="lang-select">
      <Icon name="globe" size={16} />
      <span className="visually-hidden">{t("lang.label")}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Language)} aria-label={t("lang.label")}>
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {LANGUAGE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
