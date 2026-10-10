import type { ClaimStatus } from "../../shared/domain.ts";
import type { IconName } from "./Icon.tsx";

/** Icon for each product category. */
export const CATEGORY_ICON = {
  smartphone: "smartphone",
  tablet: "tablet",
  laptop: "laptop",
  audio: "headphones",
  wearable: "watch",
  accessory: "plug",
  camera: "camera",
  networking: "wifi",
  monitor: "monitor",
  ereader: "book",
} as const satisfies Record<string, IconName>;

/** Icon for each claim status (used by badges and timelines). */
export const STATUS_ICON: Record<ClaimStatus, IconName> = {
  received: "message",
  approved: "check",
  product_returned: "package",
  replaced: "rotate",
  refunded: "undo",
  rejected: "x",
};
