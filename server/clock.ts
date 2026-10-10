import { dateInTimeZone, type IsoDate } from "../shared/dates.ts";
import { LEGAL_RULES } from "../shared/legal-rules.ts";

/** Today's date on the shop's calendar (Europe/Madrid). */
export function shopToday(now: Date = new Date()): IsoDate {
  return dateInTimeZone(now, LEGAL_RULES.timeZone);
}
