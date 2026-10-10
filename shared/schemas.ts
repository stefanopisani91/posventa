/**
 * Input validation for every API endpoint (run on the server; the browser only
 * imports the inferred types).
 */
import { z } from "zod";
import {
  CLAIM_CODE_PATTERN,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  DUE_FILTERS,
  ORDER_NUMBER_PATTERN,
  WARRANTY_REASONS,
  WITHDRAWAL_REASONS,
} from "./domain.ts";

const orderNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ORDER_NUMBER_PATTERN, "Order numbers look like CG-12345");

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const claimCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(CLAIM_CODE_PATTERN, "Claim codes look like PV-ABCD-2345");

export const orderLookupInput = z.object({ orderNumber, email });

const description = z.string().trim().max(2000);

export const createClaimInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("withdrawal"),
    orderNumber,
    email,
    orderItemId: z.number().int().positive(),
    // Art. 102 TRLGDCU: no reason is needed to withdraw.
    reason: z.enum(WITHDRAWAL_REASONS).default("no_reason"),
    description: description.default(""),
  }),
  z.object({
    type: z.literal("warranty"),
    orderNumber,
    email,
    orderItemId: z.number().int().positive(),
    reason: z.enum(WARRANTY_REASONS),
    description: description.min(10, "Describe the problem in at least 10 characters"),
  }),
]);

export const loginInput = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const statusChangeInput = z
  .object({
    to: z.enum(CLAIM_STATUSES),
    /** The status the staff member saw, to detect concurrent edits. */
    from: z.enum(CLAIM_STATUSES),
    /** Optional message shown to the customer on the tracking page. */
    message: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.to !== "rejected" || (v.message?.length ?? 0) >= 10, {
    message: "Explain to the customer why the claim is rejected (at least 10 characters)",
    path: ["message"],
  });

export const noteInput = z.object({
  text: z.string().trim().min(1).max(2000),
});

const optionalPositiveInt = z
  .string()
  .regex(/^\d{1,9}$/)
  .transform(Number)
  .optional();

export const claimListQuery = z.object({
  status: z.enum([...CLAIM_STATUSES, "open", "closed"]).optional(),
  type: z.enum(CLAIM_TYPES).optional(),
  productId: optionalPositiveInt,
  due: z.enum(DUE_FILTERS).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["due", "newest", "updated"]).default("due"),
  page: z
    .string()
    .regex(/^\d{1,4}$/)
    .transform(Number)
    .pipe(z.number().int().min(1))
    .default(1),
});

export const statsQuery = z.object({
  period: z.enum(["90d", "12m", "all"]).default("12m"),
});

export const idParam = z.string().regex(/^\d{1,9}$/).transform(Number);

export type OrderLookupInput = z.input<typeof orderLookupInput>;
export type CreateClaimInput = z.input<typeof createClaimInput>;
export type LoginInput = z.input<typeof loginInput>;
export type StatusChangeInput = z.input<typeof statusChangeInput>;
export type NoteInput = z.input<typeof noteInput>;
