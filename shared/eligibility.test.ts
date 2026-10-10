import { describe, expect, it } from "vitest";
import {
  addDays,
  addYears,
  dateInTimeZone,
  dayOfWeek,
  daysBetween,
  isIsoDate,
  nextWorkingDayIfWeekend,
} from "./dates.ts";
import { canTransition, nextStatuses } from "./domain.ts";
import {
  claimDueDate,
  computeEligibility,
  dueState,
  presumptionEndsOn,
  warrantyEndsOn,
  withdrawalLastDay,
} from "./eligibility.ts";
import { LEGAL_RULES } from "./legal-rules.ts";

describe("calendar helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
    expect(addDays("2026-02-20", 14)).toBe("2026-03-06");
    expect(addDays("2028-02-20", 14)).toBe("2028-03-05"); // leap year
  });

  it("is not affected by daylight-saving changes", () => {
    // Spain moves clocks on 29 Mar 2026 and 25 Oct 2026.
    expect(addDays("2026-03-25", 14)).toBe("2026-04-08");
    expect(addDays("2026-10-20", 14)).toBe("2026-11-03");
  });

  it("adds years and clamps 29 February to 28 February", () => {
    expect(addYears("2026-10-10", 3)).toBe("2029-10-10");
    expect(addYears("2024-02-29", 3)).toBe("2027-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-10-10", "2026-10-24")).toBe(14);
    expect(daysBetween("2026-10-24", "2026-10-10")).toBe(-14);
  });

  it("knows the day of the week", () => {
    expect(dayOfWeek("2026-10-10")).toBe(6); // Saturday
    expect(dayOfWeek("2026-10-11")).toBe(0); // Sunday
    expect(dayOfWeek("2026-10-12")).toBe(1); // Monday
  });

  it("moves weekend dates to Monday", () => {
    expect(nextWorkingDayIfWeekend("2026-10-10")).toBe("2026-10-12");
    expect(nextWorkingDayIfWeekend("2026-10-11")).toBe("2026-10-12");
    expect(nextWorkingDayIfWeekend("2026-10-14")).toBe("2026-10-14");
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("10/10/2026")).toBe(false);
  });

  it("reads the calendar date in Madrid, not in UTC", () => {
    // 23:30 UTC on 10 Oct is already 11 Oct in Madrid (UTC+2 in summer time).
    expect(dateInTimeZone(new Date("2026-10-10T23:30:00Z"), "Europe/Madrid")).toBe("2026-10-11");
    // 23:30 UTC on 10 Dec is 00:30 on 11 Dec in Madrid (UTC+1 in winter).
    expect(dateInTimeZone(new Date("2026-12-10T23:30:00Z"), "Europe/Madrid")).toBe("2026-12-11");
    expect(dateInTimeZone(new Date("2026-12-10T22:30:00Z"), "Europe/Madrid")).toBe("2026-12-10");
  });
});

describe("right of withdrawal (14 calendar days from delivery)", () => {
  it("does not count the delivery day: delivered 1 March, last day 15 March", () => {
    expect(withdrawalLastDay("2027-03-01")).toBe("2027-03-15");
  });

  it("counts calendar days, weekends included, when the period ends on a weekday", () => {
    expect(withdrawalLastDay("2026-10-07")).toBe("2026-10-21"); // Wed -> Wed
  });

  it("moves a deadline that ends on Saturday or Sunday to Monday", () => {
    expect(withdrawalLastDay("2026-10-03")).toBe("2026-10-19"); // ends Sat 17 -> Mon 19
    expect(withdrawalLastDay("2026-10-04")).toBe("2026-10-19"); // ends Sun 18 -> Mon 19
  });

  it("can be configured to ignore weekends", () => {
    const strict = {
      ...LEGAL_RULES,
      withdrawal: { ...LEGAL_RULES.withdrawal, extendWhenEndingOnWeekend: false },
    } as unknown as typeof LEGAL_RULES;
    expect(withdrawalLastDay("2026-10-03", strict)).toBe("2026-10-17");
  });

  it("is still open on the last day and closed the day after", () => {
    const onLastDay = computeEligibility("2026-10-07", "2026-10-21");
    expect(onLastDay.withdrawal).toMatchObject({ available: true, daysLeft: 0, state: "open" });

    const dayAfter = computeEligibility("2026-10-07", "2026-10-22");
    expect(dayAfter.withdrawal).toMatchObject({ available: false, daysLeft: null, state: "expired" });
  });

  it("reports the days left", () => {
    const e = computeEligibility("2026-10-07", "2026-10-10");
    expect(e.withdrawal.lastDay).toBe("2026-10-21");
    expect(e.withdrawal.daysLeft).toBe(11);
  });

  it("is already available before the goods are delivered", () => {
    const e = computeEligibility(null, "2026-10-10");
    expect(e.withdrawal).toMatchObject({ available: true, lastDay: null, state: "before_delivery" });
    expect(e.warranty).toMatchObject({ available: false, state: "before_delivery" });
  });
});

describe("legal warranty (3 years, defect presumed during the first 2)", () => {
  it("ends three years after delivery", () => {
    expect(warrantyEndsOn("2026-10-10")).toBe("2029-10-10");
    expect(presumptionEndsOn("2026-10-10")).toBe("2028-10-10");
  });

  it("handles a delivery on 29 February", () => {
    expect(warrantyEndsOn("2024-02-29")).toBe("2027-02-28");
    expect(presumptionEndsOn("2024-02-29")).toBe("2026-02-28");
  });

  it("keeps the presumption during the first two years", () => {
    const e = computeEligibility("2025-06-15", "2026-10-10");
    expect(e.withdrawal.available).toBe(false);
    expect(e.warranty).toMatchObject({
      available: true,
      endsOn: "2028-06-15",
      presumptionEndsOn: "2027-06-15",
      presumptionActive: true,
    });
  });

  it("drops the presumption in the third year but keeps the warranty", () => {
    const e = computeEligibility("2024-03-01", "2026-10-10");
    expect(e.warranty).toMatchObject({ available: true, presumptionActive: false, endsOn: "2027-03-01" });
  });

  it("is open on the last day and expired the day after", () => {
    expect(computeEligibility("2023-10-10", "2026-10-10").warranty).toMatchObject({
      available: true,
      daysLeft: 0,
    });
    expect(computeEligibility("2023-10-10", "2026-10-11").warranty).toMatchObject({
      available: false,
      state: "expired",
    });
  });

  it("reads every number from the single legal-rules file", () => {
    expect(LEGAL_RULES.withdrawal.days).toBe(14);
    expect(LEGAL_RULES.warranty.years).toBe(3);
    expect(LEGAL_RULES.warranty.presumptionYears).toBe(2);
  });
});

describe("shop deadlines for open claims", () => {
  it("gives the shop 14 days to refund a withdrawal", () => {
    expect(claimDueDate("withdrawal", "2026-10-10")).toBe("2026-10-24");
  });

  it("uses the internal 30-day target for warranty claims", () => {
    expect(claimDueDate("warranty", "2026-10-10")).toBe("2026-11-09");
  });

  it("classifies open claims by urgency", () => {
    expect(dueState("received", "2026-10-09", "2026-10-10")).toBe("overdue");
    expect(dueState("approved", "2026-10-13", "2026-10-10")).toBe("due_soon");
    expect(dueState("approved", "2026-10-20", "2026-10-10")).toBe("on_track");
    expect(dueState("refunded", "2026-10-01", "2026-10-10")).toBe("closed");
  });
});

describe("status workflow", () => {
  it("never replaces the product in a withdrawal", () => {
    expect(nextStatuses("withdrawal", "product_returned")).toEqual(["refunded", "rejected"]);
    expect(nextStatuses("warranty", "product_returned")).toEqual(["replaced", "refunded", "rejected"]);
  });

  it("does not allow skipping steps or reopening closed claims", () => {
    expect(canTransition("warranty", "received", "replaced")).toBe(false);
    expect(canTransition("warranty", "rejected", "approved")).toBe(false);
    expect(canTransition("withdrawal", "received", "approved")).toBe(true);
  });
});
