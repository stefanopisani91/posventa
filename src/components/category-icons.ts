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
