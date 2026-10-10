/** JSON shapes returned by the Functions and consumed by the React app. */
import type { IsoDate } from "./dates.ts";
import type {
  Actor,
  ClaimEventKind,
  ClaimReason,
  ClaimStatus,
  ClaimType,
  DueState,
  ProductCategory,
} from "./domain.ts";
import type { Eligibility } from "./eligibility.ts";

export type ApiErrorCode =
  | "validation_error"
  | "unsupported_media_type"
  | "payload_too_large"
  | "forbidden_origin"
  | "method_not_allowed"
  | "order_not_found"
  | "item_not_found"
  | "not_eligible"
  | "claim_already_open"
  | "claim_not_found"
  | "unauthorized"
  | "invalid_credentials"
  | "invalid_transition"
  | "status_conflict"
  | "reset_too_soon"
  | "demo_disabled"
  | "server_misconfigured"
  | "internal_error";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message?: string; details?: unknown };
}

export interface ClaimSummary {
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  openedOn: IsoDate;
}

export interface OrderItemView {
  id: number;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitPriceCents: number;
  eligibility: Eligibility;
  /** Claims already opened for this line, newest first. */
  claims: ClaimSummary[];
  hasOpenClaim: boolean;
}

export interface OrderLookupResponse {
  orderNumber: string;
  placedOn: IsoDate;
  deliveredOn: IsoDate | null;
  customerFirstName: string;
  today: IsoDate;
  items: OrderItemView[];
}

export interface CreateClaimResponse {
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  dueOn: IsoDate;
}

export interface PublicClaimEvent {
  at: string;
  kind: ClaimEventKind;
  toStatus: ClaimStatus | null;
  message: string | null;
}

export interface TrackingResponse {
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  reason: ClaimReason;
  productName: string;
  orderNumber: string;
  openedOn: IsoDate;
  maskedEmail: string;
  closed: boolean;
  events: PublicClaimEvent[];
}

export interface SessionResponse {
  authenticated: boolean;
  email?: string;
}

export interface ShowcaseOrder {
  orderNumber: string;
  email: string;
  scenario: "recent" | "in_transit" | "warranty_presumption" | "warranty_third_year" | "expired" | "open_claim";
}

export interface DemoInfoResponse {
  demoMode: boolean;
  credentials?: { email: string; password: string };
  showcaseOrders: ShowcaseOrder[];
  showcaseClaimCodes: string[];
  seededOn: IsoDate | null;
}

export interface AdminClaimListItem {
  id: number;
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  reason: ClaimReason;
  productId: number;
  productName: string;
  orderNumber: string;
  customerName: string;
  openedOn: IsoDate;
  dueOn: IsoDate;
  dueState: DueState;
  daysToDue: number;
  updatedAt: string;
}

export interface AdminClaimListResponse {
  items: AdminClaimListItem[];
  total: number;
  page: number;
  pageSize: number;
  today: IsoDate;
  counts: { open: number; overdue: number; dueSoon: number };
}

export interface ProductOption {
  id: number;
  name: string;
}

export interface AdminClaimEvent {
  id: number;
  at: string;
  kind: ClaimEventKind;
  actor: Actor;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus | null;
  message: string | null;
  isPublic: boolean;
}

export interface AdminClaimDetail {
  id: number;
  code: string;
  type: ClaimType;
  status: ClaimStatus;
  reason: ClaimReason;
  description: string;
  openedOn: IsoDate;
  dueOn: IsoDate;
  dueState: DueState;
  daysToDue: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  nextStatuses: ClaimStatus[];
  order: { number: string; placedOn: IsoDate; deliveredOn: IsoDate | null };
  item: { productName: string; sku: string; serialNumber: string | null; unitPriceCents: number; quantity: number };
  customer: { name: string; email: string; city: string };
  /** Legal position on the day the claim was opened. */
  legalAtOpening: Eligibility;
  events: AdminClaimEvent[];
  today: IsoDate;
}

export type StatsPeriod = "90d" | "12m" | "all";

export interface StatsResponse {
  period: StatsPeriod;
  today: IsoDate;
  deliveredOrders: number;
  unitsDelivered: number;
  claims: { total: number; withdrawal: number; warranty: number; open: number; overdue: number };
  /** Share of delivered orders with at least one withdrawal (return) claim. */
  returnRate: number;
  /** Share of delivered orders with at least one warranty claim. */
  warrantyClaimRate: number;
  avgCloseDays: { all: number | null; withdrawal: number | null; warranty: number | null };
  closedCount: number;
  byStatus: { status: ClaimStatus; count: number }[];
  topReasons: { reason: ClaimReason; type: ClaimType; count: number }[];
  products: { productId: number; productName: string; claims: number; units: number; rate: number }[];
  monthly: { month: string; withdrawal: number; warranty: number }[];
}
