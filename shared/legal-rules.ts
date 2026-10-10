/**
 * Spanish consumer-law rules used by Posventa — the ONLY place these numbers live.
 *
 * Source: Real Decreto Legislativo 1/2007, Texto refundido de la Ley General para
 * la Defensa de los Consumidores y Usuarios (TRLGDCU), consolidated text on
 * boe.es, last updated 28 February 2026:
 * https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555
 *
 * This is a simplified model for a small shop selling NEW goods at a distance.
 * It is not legal advice. Exceptions (art. 103: personalised goods, unsealed
 * hygiene items, unsealed software…) and second-hand goods are not modelled.
 */
export const LEGAL_RULES = {
  /** Dates are computed on the shop's local calendar. */
  timeZone: "Europe/Madrid",

  lawReference: {
    name: "Real Decreto Legislativo 1/2007 (TRLGDCU)",
    consolidatedVersion: "2026-02-28",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555",
  },

  /** Derecho de desistimiento (right of withdrawal) for distance sales. */
  withdrawal: {
    /** Art. 102.1 — 14 calendar days ("catorce días naturales"), no reason needed. */
    days: 14,
    /** Art. 104.b — counted from the day the consumer takes physical possession. */
    countsFrom: "delivery",
    /**
     * Directive 2011/83/EU, recital 41, applies Regulation 1182/71: the delivery
     * day is not counted, and (art. 3(4)) a period ending on Saturday or Sunday
     * ends on the next working day. Public holidays are not modelled.
     */
    extendWhenEndingOnWeekend: true,
    /** Art. 102.1 — the consumer does not have to give a reason. */
    reasonRequired: false,
    /** Art. 107.1 — the shop refunds within 14 days of being informed. */
    refundWithinDays: 14,
    /** Art. 108.1 — the consumer sends the goods back within 14 days of notifying. */
    customerReturnWithinDays: 14,
    articleUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555#a102",
  },

  /** Garantía legal: liability for lack of conformity (falta de conformidad). */
  warranty: {
    /** Art. 120.1 — the seller is liable for defects that appear within 3 years of delivery. */
    years: 3,
    /** Art. 121.1 — defects appearing within 2 years are presumed to have existed at delivery. */
    presumptionYears: 2,
    /** Art. 122.3 — after a repair, the same defect is covered for 1 more year. */
    afterRepairYears: 1,
    articleUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555#a120",
  },
} as const;

export type LegalRules = typeof LEGAL_RULES;
