import { ApiError } from "./api.ts";
import type { I18n } from "./i18n/i18n.ts";
import { MESSAGES, type MessageKey } from "./i18n/messages.ts";

/** Translates any thrown error into a sentence for the user. */
export function errorMessage(t: I18n["t"], error: unknown): string {
  if (error instanceof ApiError) {
    const key = `error.${error.code}` as MessageKey;
    if (key in MESSAGES.en) return t(key);
  }
  return t("error.generic");
}
