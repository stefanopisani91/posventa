/** Vocabulary shared by the browser and the Functions. */

export const CLAIM_TYPES = ["withdrawal", "warranty"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = [
  "received",
  "approved",
  "product_returned",
  "replaced",
  "refunded",
  "rejected",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLOSED_STATUSES: readonly ClaimStatus[] = ["replaced", "refunded", "rejected"];

export function isClosed(status: ClaimStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Allowed status changes. A withdrawal ends in a refund (art. 107 TRLGDCU);
 * a warranty claim can end in a replacement or, when that is not possible,
 * a refund (art. 119 ter, termination of the contract).
 */
const TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  received: ["approved", "rejected"],
  approved: ["product_returned", "rejected"],
  product_returned: ["replaced", "refunded", "rejected"],
  replaced: [],
  refunded: [],
  rejected: [],
};

export function nextStatuses(type: ClaimType, from: ClaimStatus): ClaimStatus[] {
  return TRANSITIONS[from].filter((to) => !(type === "withdrawal" && to === "replaced"));
}

export function canTransition(type: ClaimType, from: ClaimStatus, to: ClaimStatus): boolean {
  return nextStatuses(type, from).includes(to);
}

export const WITHDRAWAL_REASONS = [
  "no_reason",
  "changed_mind",
  "not_as_described",
  "ordered_by_mistake",
  "better_price",
  "arrived_late",
  "other",
] as const;

export const WARRANTY_REASONS = [
  "does_not_turn_on",
  "battery",
  "screen",
  "audio",
  "connectivity",
  "charging",
  "physical_defect",
  "other",
] as const;

export type WithdrawalReason = (typeof WITHDRAWAL_REASONS)[number];
export type WarrantyReason = (typeof WARRANTY_REASONS)[number];
export type ClaimReason = WithdrawalReason | WarrantyReason;

export const ALL_REASONS: readonly ClaimReason[] = [
  ...new Set<ClaimReason>([...WITHDRAWAL_REASONS, ...WARRANTY_REASONS]),
];

export function reasonsFor(type: ClaimType): readonly ClaimReason[] {
  return type === "withdrawal" ? WITHDRAWAL_REASONS : WARRANTY_REASONS;
}

export const EVENT_KINDS = ["created", "status_changed", "internal_note"] as const;
export type ClaimEventKind = (typeof EVENT_KINDS)[number];

export const ACTORS = ["customer", "staff", "system"] as const;
export type Actor = (typeof ACTORS)[number];

export const DUE_FILTERS = ["overdue", "due_soon", "on_track", "closed"] as const;
export type DueState = (typeof DUE_FILTERS)[number];

export const PRODUCT_CATEGORIES = [
  "smartphone",
  "tablet",
  "laptop",
  "audio",
  "wearable",
  "accessory",
  "camera",
  "networking",
  "monitor",
  "ereader",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Order numbers look like CG-24817 (CG = Circuito Gòtic). */
export const ORDER_NUMBER_PATTERN = /^CG-\d{5}$/;
/** Claim tracking codes look like PV-7K3M-9QX2 (no 0/O/1/I to avoid confusion). */
export const CLAIM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CLAIM_CODE_PATTERN = /^PV-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;
