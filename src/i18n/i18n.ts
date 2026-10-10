import { createContext, useContext } from "react";
import type { IsoDate } from "../../shared/dates.ts";
import { LANGUAGES, LOCALES, MESSAGES, type Language, type MessageKey } from "./messages.ts";

export type Vars = Record<string, string | number>;
type PluralBase<K> = K extends `${infer B}_one` ? B : never;
export type PluralKey = PluralBase<MessageKey>;

export interface I18n {
  lang: Language;
  setLang(lang: Language): void;
  t(key: MessageKey, vars?: Vars): string;
  /** Picks `<key>_one` or `<key>_other` for `n` and fills {n}. */
  tn(key: PluralKey, n: number, vars?: Vars): string;
  date(value: IsoDate, style?: "long" | "short"): string;
  dateTime(value: string): string;
  money(cents: number): string;
  percent(ratio: number): string;
  number(value: number, digits?: number): string;
}

const STORAGE_KEY = "posventa.lang";

function interpolate(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language;
  } catch {
    // storage may be blocked; fall through to the browser language
  }
  const browser = (navigator.languages ?? [navigator.language]).map((l) => l.slice(0, 2).toLowerCase());
  return (browser.find((l) => (LANGUAGES as readonly string[]).includes(l)) as Language | undefined) ?? "es";
}

export function rememberLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // not critical
  }
}

export function createI18n(lang: Language, setLang: (lang: Language) => void): I18n {
  const locale = LOCALES[lang];
  const messages = MESSAGES[lang];
  const plural = new Intl.PluralRules(locale);
  // Calendar dates are "YYYY-MM-DD": format them in UTC so they never shift a day.
  const dateLong = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const dateShort = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });

  const t = (key: MessageKey, vars?: Vars) => interpolate(messages[key], vars);
  return {
    lang,
    setLang,
    t,
    tn: (key, n, vars) => {
      const form = plural.select(n) === "one" ? "one" : "other";
      return t(`${key}_${form}` as MessageKey, { n, ...vars });
    },
    date: (value, style = "long") => (style === "long" ? dateLong : dateShort).format(new Date(`${value}T00:00:00Z`)),
    dateTime: (value) => dateTime.format(new Date(value)),
    money: (cents) => money.format(cents / 100),
    percent: (ratio) => percent.format(ratio),
    number: (value, digits = 1) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value),
  };
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
