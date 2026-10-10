import {
  addDays,
  addYears,
  daysBetween,
  nextWorkingDayIfWeekend,
  type IsoDate,
} from "./dates.ts";
import type { ClaimStatus, ClaimType, DueState } from "./domain.ts";
import { isClosed } from "./domain.ts";
import { LEGAL_RULES, type LegalRules } from "./legal-rules.ts";
import { SHOP_POLICY } from "./shop-policy.ts";

export interface WithdrawalWindow {
  /** False when the window has closed. Before delivery it is already open (Dir. 2011/83/EU art. 9.3). */
  available: boolean;
  /** Last day to notify the withdrawal; null while the goods are not delivered yet. */
  lastDay: IsoDate | null;
  /** Days left including today (0 = today is the last day); null before delivery. */
  daysLeft: number | null;
  state: "before_delivery" | "open" | "expired";
}

export interface WarrantyWindow {
  available: boolean;
  /** Last day a lack of conformity is covered (art. 120.1). */
  endsOn: IsoDate | null;
  /** Until this day the defect is presumed to have existed at delivery (art. 121.1). */
  presumptionEndsOn: IsoDate | null;
  presumptionActive: boolean;
  daysLeft: number | null;
  state: "before_delivery" | "open" | "expired";
}

export interface Eligibility {
  withdrawal: WithdrawalWindow;
  warranty: WarrantyWindow;
}

export function withdrawalLastDay(deliveredOn: IsoDate, rules: LegalRules = LEGAL_RULES): IsoDate {
  const plain = addDays(deliveredOn, rules.withdrawal.days);
  return rules.withdrawal.extendWhenEndingOnWeekend ? nextWorkingDayIfWeekend(plain) : plain;
}

export function warrantyEndsOn(deliveredOn: IsoDate, rules: LegalRules = LEGAL_RULES): IsoDate {
  return addYears(deliveredOn, rules.warranty.years);
}

export function presumptionEndsOn(deliveredOn: IsoDate, rules: LegalRules = LEGAL_RULES): IsoDate {
  return addYears(deliveredOn, rules.warranty.presumptionYears);
}

/** What the customer can ask for on `today`, given the delivery date of the item. */
export function computeEligibility(
  deliveredOn: IsoDate | null,
  today: IsoDate,
  rules: LegalRules = LEGAL_RULES,
): Eligibility {
  if (deliveredOn === null || deliveredOn > today) {
    return {
      withdrawal: { available: true, lastDay: null, daysLeft: null, state: "before_delivery" },
      warranty: {
        available: false,
        endsOn: null,
        presumptionEndsOn: null,
        presumptionActive: false,
        daysLeft: null,
        state: "before_delivery",
      },
    };
  }

  const lastDay = withdrawalLastDay(deliveredOn, rules);
  const withdrawalOpen = today <= lastDay;
  const endsOn = warrantyEndsOn(deliveredOn, rules);
  const presumptionEnd = presumptionEndsOn(deliveredOn, rules);
  const warrantyOpen = today <= endsOn;

  return {
    withdrawal: {
      available: withdrawalOpen,
      lastDay,
      daysLeft: withdrawalOpen ? daysBetween(today, lastDay) : null,
      state: withdrawalOpen ? "open" : "expired",
    },
    warranty: {
      available: warrantyOpen,
      endsOn,
      presumptionEndsOn: presumptionEnd,
      presumptionActive: today <= presumptionEnd,
      daysLeft: warrantyOpen ? daysBetween(today, endsOn) : null,
      state: warrantyOpen ? "open" : "expired",
    },
  };
}

/**
 * The date by which the shop should have closed a claim:
 * - withdrawal: refund within 14 days of being informed (art. 107.1);
 * - warranty: the shop's internal target (the law says "reasonable time").
 */
export function claimDueDate(type: ClaimType, openedOn: IsoDate, rules: LegalRules = LEGAL_RULES): IsoDate {
  return type === "withdrawal"
    ? addDays(openedOn, rules.withdrawal.refundWithinDays)
    : addDays(openedOn, SHOP_POLICY.warrantyResolutionTargetDays);
}

export function dueState(status: ClaimStatus, dueOn: IsoDate, today: IsoDate): DueState {
  if (isClosed(status)) return "closed";
  const left = daysBetween(today, dueOn);
  if (left < 0) return "overdue";
  if (left <= SHOP_POLICY.dueSoonDays) return "due_soon";
  return "on_track";
}
