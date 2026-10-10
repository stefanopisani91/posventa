/**
 * Deterministic demo-data generator. Every date is relative to `today`, so a
 * reset always yields orders that are inside (or deliberately outside) the
 * legal windows. Same input date → same data.
 */
import type { ShowcaseOrder } from "../../shared/api-types.ts";
import { addDays, type IsoDate } from "../../shared/dates.ts";
import {
  CLAIM_CODE_ALPHABET,
  type Actor,
  type ClaimEventKind,
  type ClaimReason,
  type ClaimStatus,
  type ClaimType,
} from "../../shared/domain.ts";
import { claimDueDate } from "../../shared/eligibility.ts";
import {
  CITIES,
  CUSTOMER_TEXTS,
  FIRST_NAMES_ES,
  FOREIGN_PEOPLE,
  PRODUCTS,
  SHOWCASE_PEOPLE,
  SURNAMES_ES,
  productBySku,
  type SeedPerson,
  type SeedProduct,
} from "./catalog.ts";

export const TOTAL_ORDERS = 120;
export const TOTAL_CUSTOMERS = 90;

export interface SeedCustomer {
  id: number;
  fullName: string;
  email: string;
  city: string;
}
export interface SeedOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  placedOn: IsoDate;
  deliveredOn: IsoDate | null;
  totalCents: number;
}
export interface SeedItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceCents: number;
  serialNumber: string;
}
export interface SeedClaim {
  id: number;
  code: string;
  orderItemId: number;
  type: ClaimType;
  reason: ClaimReason;
  description: string;
  status: ClaimStatus;
  openedOn: IsoDate;
  dueOn: IsoDate;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}
export interface SeedEvent {
  id: number;
  claimId: number;
  kind: ClaimEventKind;
  actor: Actor;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus | null;
  message: string | null;
  isPublic: boolean;
  createdAt: Date;
}
export interface SeedData {
  seededOn: IsoDate;
  products: SeedProduct[];
  customers: SeedCustomer[];
  orders: SeedOrder[];
  items: SeedItem[];
  claims: SeedClaim[];
  events: SeedEvent[];
  showcase: { orders: ShowcaseOrder[]; claimCodes: string[] };
}

// ---------------------------------------------------------------------------
// Claims are designed by hand so that every status, both claim types, overdue
// and due-soon deadlines, and a clearly problematic product appear.
// `openedAgo` = days before today; `deliveredBefore` = days between delivery and opening.

interface ClaimSpec {
  type: ClaimType;
  status: ClaimStatus;
  sku: string;
  reason: ClaimReason;
  openedAgo: number;
  deliveredBefore: number;
  closeAfter?: number;
  rejection?: string;
  showcase?: boolean;
}

const CLAIM_SPECS: ClaimSpec[] = [
  // received
  { type: "warranty", status: "received", sku: "OND-BUDSPRO", reason: "battery", openedAgo: 1, deliveredBefore: 210, showcase: true },
  { type: "withdrawal", status: "received", sku: "PXM-TAB11", reason: "changed_mind", openedAgo: 2, deliveredBefore: 5 },
  { type: "warranty", status: "received", sku: "PXM-NOVA6", reason: "screen", openedAgo: 3, deliveredBefore: 400 },
  { type: "withdrawal", status: "received", sku: "VOL-PULSE2", reason: "not_as_described", openedAgo: 1, deliveredBefore: 3 },
  { type: "warranty", status: "received", sku: "SON-CUBE", reason: "audio", openedAgo: 6, deliveredBefore: 150 },
  { type: "warranty", status: "received", sku: "OND-BUDSPRO", reason: "connectivity", openedAgo: 12, deliveredBefore: 90 },
  { type: "withdrawal", status: "received", sku: "TEC-BOOK14", reason: "better_price", openedAgo: 12, deliveredBefore: 8 },
  // approved
  { type: "warranty", status: "approved", sku: "OND-BUDSPRO", reason: "battery", openedAgo: 20, deliveredBefore: 300, showcase: true },
  { type: "withdrawal", status: "approved", sku: "OND-ARC700", reason: "no_reason", openedAgo: 9, deliveredBefore: 10 },
  { type: "warranty", status: "approved", sku: "NXL-AX3000", reason: "connectivity", openedAgo: 33, deliveredBefore: 500 },
  { type: "warranty", status: "approved", sku: "PXM-TAB11", reason: "screen", openedAgo: 15, deliveredBefore: 260 },
  { type: "withdrawal", status: "approved", sku: "LEC-READ7", reason: "ordered_by_mistake", openedAgo: 16, deliveredBefore: 6 },
  { type: "warranty", status: "approved", sku: "VOL-PWR20K", reason: "charging", openedAgo: 8, deliveredBefore: 700 },
  // product returned
  { type: "withdrawal", status: "product_returned", sku: "OND-BUDSPRO", reason: "not_as_described", openedAgo: 11, deliveredBefore: 4 },
  { type: "warranty", status: "product_returned", sku: "TEC-BOOK14", reason: "does_not_turn_on", openedAgo: 18, deliveredBefore: 380 },
  { type: "warranty", status: "product_returned", sku: "OND-BUDSPRO", reason: "battery", openedAgo: 27, deliveredBefore: 160 },
  { type: "withdrawal", status: "product_returned", sku: "VOL-GAN65", reason: "changed_mind", openedAgo: 13, deliveredBefore: 2 },
  { type: "warranty", status: "product_returned", sku: "PXM-NOVA6L", reason: "charging", openedAgo: 36, deliveredBefore: 820 },
  // replaced
  { type: "warranty", status: "replaced", sku: "OND-BUDSPRO", reason: "battery", openedAgo: 60, deliveredBefore: 200, closeAfter: 12, showcase: true },
  { type: "warranty", status: "replaced", sku: "PXM-TAB11", reason: "screen", openedAgo: 95, deliveredBefore: 330, closeAfter: 19 },
  { type: "warranty", status: "replaced", sku: "VOL-PWR20K", reason: "charging", openedAgo: 130, deliveredBefore: 100, closeAfter: 9 },
  { type: "warranty", status: "replaced", sku: "OND-BUDSPRO", reason: "connectivity", openedAgo: 180, deliveredBefore: 60, closeAfter: 15 },
  { type: "warranty", status: "replaced", sku: "VOL-PULSE2", reason: "battery", openedAgo: 240, deliveredBefore: 410, closeAfter: 22 },
  { type: "warranty", status: "replaced", sku: "VOL-GAN65", reason: "physical_defect", openedAgo: 300, deliveredBefore: 45, closeAfter: 7 },
  // refunded
  { type: "withdrawal", status: "refunded", sku: "PXM-NOVA6", reason: "changed_mind", openedAgo: 40, deliveredBefore: 7, closeAfter: 10 },
  { type: "withdrawal", status: "refunded", sku: "OND-ARC700", reason: "not_as_described", openedAgo: 75, deliveredBefore: 3, closeAfter: 8 },
  { type: "withdrawal", status: "refunded", sku: "TEC-BOOK16P", reason: "better_price", openedAgo: 110, deliveredBefore: 12, closeAfter: 13 },
  { type: "withdrawal", status: "refunded", sku: "OND-BUDSPRO", reason: "no_reason", openedAgo: 150, deliveredBefore: 6, closeAfter: 6 },
  { type: "withdrawal", status: "refunded", sku: "TRK-CAM4K", reason: "ordered_by_mistake", openedAgo: 210, deliveredBefore: 2, closeAfter: 9 },
  { type: "withdrawal", status: "refunded", sku: "TEC-VISTA27", reason: "arrived_late", openedAgo: 260, deliveredBefore: 1, closeAfter: 11 },
  { type: "warranty", status: "refunded", sku: "OND-BUDSPRO", reason: "battery", openedAgo: 85, deliveredBefore: 500, closeAfter: 25 },
  { type: "warranty", status: "refunded", sku: "NXL-AX3000", reason: "connectivity", openedAgo: 400, deliveredBefore: 620, closeAfter: 28 },
  { type: "withdrawal", status: "refunded", sku: "VOL-PULSE2", reason: "no_reason", openedAgo: 500, deliveredBefore: 9, closeAfter: 7 },
  { type: "warranty", status: "refunded", sku: "PXM-TAB11", reason: "screen", openedAgo: 620, deliveredBefore: 280, closeAfter: 18 },
  { type: "withdrawal", status: "refunded", sku: "LEC-READ7", reason: "changed_mind", openedAgo: 25, deliveredBefore: 4, closeAfter: 9 },
  // rejected (after inspecting the returned product)
  {
    type: "warranty", status: "rejected", sku: "PXM-NOVA6", reason: "screen", openedAgo: 55, deliveredBefore: 900, closeAfter: 6,
    rejection: "Tras revisar el teléfono, la pantalla presenta un impacto en la esquina inferior. Un daño por golpe no es una falta de conformidad y no está cubierto por la garantía legal. Te devolvemos el equipo sin coste.",
  },
  {
    type: "warranty", status: "rejected", sku: "OND-ARC700", reason: "audio", openedAgo: 140, deliveredBefore: 380, closeAfter: 14,
    rejection: "Hemos probado los auriculares durante 48 horas con varios dispositivos y no aparece el zumbido. Te los devolvemos sin coste; si el problema vuelve, abre una nueva solicitud y lo revisaremos de nuevo.",
  },
  {
    type: "warranty", status: "rejected", sku: "VOL-PULSE2", reason: "physical_defect", openedAgo: 200, deliveredBefore: 760, closeAfter: 10,
    rejection: "El reloj tiene restos de líquido en el interior por una inmersión que supera su resistencia certificada. No se trata de una falta de conformidad. Te lo devolvemos sin coste.",
  },
  {
    type: "warranty", status: "rejected", sku: "TRK-CAM4K", reason: "does_not_turn_on", openedAgo: 330, deliveredBefore: 420, closeAfter: 16,
    rejection: "La placa presenta corrosión por uso bajo el agua sin la carcasa estanca, tal como indica el manual. Este daño no está cubierto por la garantía legal.",
  },
  {
    type: "warranty", status: "rejected", sku: "SON-CUBE", reason: "physical_defect", openedAgo: 90, deliveredBefore: 300, closeAfter: 5,
    rejection: "La grieta corresponde a una caída: hay marcas de impacto en la esquina. No está cubierta por la garantía legal. Te devolvemos el altavoz sin coste.",
  },
];

const STAFF_MESSAGES: Record<string, string> = {
  approved_withdrawal:
    "Solicitud aceptada. Te hemos enviado por email la etiqueta de devolución; tienes 14 días para enviarnos el producto.",
  approved_warranty:
    "Hemos aceptado tu reclamación en garantía. Te enviamos por email una etiqueta prepagada para que nos hagas llegar el producto.",
  product_returned: "Hemos recibido el producto en el almacén. Lo revisamos en un máximo de 48 horas.",
  refunded_withdrawal:
    "Reembolso emitido al mismo medio de pago, incluidos los gastos de envío iniciales. Puede tardar de 3 a 5 días hábiles en aparecer.",
  refunded_warranty:
    "No podemos sustituir el producto porque el modelo ya no está disponible. Hemos reembolsado el importe íntegro.",
  replaced: "Te hemos enviado una unidad nueva. Recibirás el número de seguimiento por email.",
};

const INTERNAL_NOTES = {
  budsBattery: "Otro caso de batería en Buds Pro (lote 2025-B). Ya van varios este trimestre: avisar al proveedor.",
  withdrawalCheck: "Producto revisado: caja abierta, accesorios completos y sin marcas de uso. Reembolso íntegro.",
  phoneCall: "Cliente contactado por teléfono: prefiere sustitución antes que reparación.",
  photos: "Fotos del daño guardadas en la carpeta del expediente.",
  supplier: "Abierto caso con el proveedor para recuperar el coste de la unidad.",
};

// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Random {
  private readonly next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  float(): number {
    return this.next();
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error("pick() on empty list");
    return item;
  }
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let r = this.next() * total;
    for (const item of items) {
      r -= weight(item);
      if (r < 0) return item;
    }
    return items[items.length - 1] as T;
  }
  code(length: number): string {
    let out = "";
    for (let i = 0; i < length; i++) out += CLAIM_CODE_ALPHABET[Math.floor(this.next() * CLAIM_CODE_ALPHABET.length)];
    return out;
  }
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}

/** A UTC instant on `date` at a Madrid office-ish hour. */
function at(date: IsoDate, utcHour: number, minute: number): Date {
  return new Date(`${date}T${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
}

interface DraftOrder {
  customerIndex: number;
  placedOn: IsoDate;
  deliveredOn: IsoDate | null;
  lines: { product: SeedProduct; quantity: number; unitPriceCents: number; claimSpec?: number }[];
  showcase?: ShowcaseOrder["scenario"];
}

export function generateSeedData(today: IsoDate): SeedData {
  const rnd = new Random(20261010);

  // Customers ---------------------------------------------------------------
  const people: SeedPerson[] = [...SHOWCASE_PEOPLE];
  const foreign = [...FOREIGN_PEOPLE];
  while (people.length < TOTAL_CUSTOMERS) {
    const city = rnd.weighted(CITIES, ([, w]) => w)[0];
    if (foreign.length > 0 && rnd.chance(0.2)) {
      const [firstName, surname] = foreign.splice(rnd.int(0, foreign.length - 1), 1)[0] as [string, string];
      people.push({ firstName, surnames: surname, city });
    } else {
      const first = rnd.pick(FIRST_NAMES_ES);
      const s1 = rnd.pick(SURNAMES_ES);
      let s2 = rnd.pick(SURNAMES_ES);
      while (s2 === s1) s2 = rnd.pick(SURNAMES_ES);
      people.push({ firstName: first, surnames: `${s1} ${s2}`, city });
    }
  }
  const usedEmails = new Set<string>();
  const customers: SeedCustomer[] = people.map((p, index) => {
    const base = `${slug(p.firstName)}.${slug(p.surnames.split(" ")[0] ?? "")}`;
    let email = `${base}@example.com`;
    for (let n = 2; usedEmails.has(email); n++) email = `${base}${n}@example.com`;
    usedEmails.add(email);
    return { id: index + 1, fullName: `${p.firstName} ${p.surnames}`, email, city: p.city };
  });
  const randomCustomer = () => rnd.int(SHOWCASE_PEOPLE.length, customers.length - 1);

  // Orders ------------------------------------------------------------------
  const price = (product: SeedProduct) =>
    rnd.chance(0.15) ? Math.round((product.priceCents * 0.9) / 10) * 10 : product.priceCents;
  const extraLine = () => {
    const product = rnd.weighted(PRODUCTS, (p) => (p.category === "accessory" ? p.weight * 2 : p.weight));
    return { product, quantity: product.category === "accessory" && rnd.chance(0.2) ? 2 : 1, unitPriceCents: price(product) };
  };
  const line = (sku: string, claimSpec?: number) => {
    const product = productBySku(sku);
    return { product, quantity: 1, unitPriceCents: price(product), claimSpec };
  };
  const delivered = (deliveredAgo: number) => {
    const deliveredOn = addDays(today, -deliveredAgo);
    return { deliveredOn, placedOn: addDays(deliveredOn, -rnd.int(1, 4)) };
  };

  const drafts: DraftOrder[] = [
    { customerIndex: 0, ...delivered(3), lines: [line("OND-ARC700"), line("VOL-GAN65")], showcase: "recent" },
    { customerIndex: 1, placedOn: addDays(today, -1), deliveredOn: null, lines: [line("PXM-NOVA6")], showcase: "in_transit" },
    { customerIndex: 2, ...delivered(430), lines: [line("TEC-BOOK14")], showcase: "warranty_presumption" },
    { customerIndex: 3, ...delivered(900), lines: [line("PXM-TAB11")], showcase: "warranty_third_year" },
    { customerIndex: 4, ...delivered(1200), lines: [line("SON-CUBE")], showcase: "expired" },
  ];

  CLAIM_SPECS.forEach((spec, index) => {
    const lines: DraftOrder["lines"] = [line(spec.sku, index)];
    if (rnd.chance(0.3)) lines.push(extraLine());
    drafts.push({
      customerIndex: index === 0 ? 5 : randomCustomer(),
      ...delivered(spec.openedAgo + spec.deliveredBefore),
      lines,
      showcase: index === 0 ? "open_claim" : undefined,
    });
  });

  const buckets: [number, number, number][] = [
    [2, 30, 20],
    [31, 180, 25],
    [181, 540, 28],
    [541, 1095, 20],
    [1096, 1300, 7],
  ];
  let inTransit = 0;
  while (drafts.length < TOTAL_ORDERS) {
    const lines = [extraLine()];
    if (rnd.chance(0.25)) lines.push(extraLine());
    if (inTransit < 2) {
      inTransit++;
      drafts.push({ customerIndex: randomCustomer(), placedOn: addDays(today, -rnd.int(0, 2)), deliveredOn: null, lines });
      continue;
    }
    const [min, max] = rnd.weighted(buckets, ([, , w]) => w);
    drafts.push({ customerIndex: randomCustomer(), ...delivered(rnd.int(min, max)), lines });
  }

  // Chronological ids and order numbers (gaps = cancelled or unpaid carts).
  const sorted = drafts
    .map((draft, index) => ({ draft, index }))
    .sort((a, b) => a.draft.placedOn.localeCompare(b.draft.placedOn) || a.index - b.index)
    .map(({ draft }) => draft);

  const orders: SeedOrder[] = [];
  const items: SeedItem[] = [];
  const claimItemIds = new Map<number, number>();
  const showcaseOrders: ShowcaseOrder[] = [];
  let orderNumber = 10_000;
  for (const draft of sorted) {
    orderNumber += rnd.int(1, 3);
    const id = orders.length + 1;
    const customer = customers[draft.customerIndex] as SeedCustomer;
    let total = 0;
    for (const l of draft.lines) {
      const itemId = items.length + 1;
      const year = (draft.deliveredOn ?? draft.placedOn).slice(2, 4);
      items.push({
        id: itemId,
        orderId: id,
        productId: l.product.id,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        serialNumber: `${l.product.sku.slice(0, 3)}${year}${rnd.code(6)}`,
      });
      total += l.quantity * l.unitPriceCents;
      if (l.claimSpec !== undefined) claimItemIds.set(l.claimSpec, itemId);
    }
    orders.push({
      id,
      orderNumber: `CG-${orderNumber}`,
      customerId: customer.id,
      placedOn: draft.placedOn,
      deliveredOn: draft.deliveredOn,
      totalCents: total,
    });
    if (draft.showcase) {
      showcaseOrders.push({ orderNumber: `CG-${orderNumber}`, email: customer.email, scenario: draft.showcase });
    }
  }
  const scenarioOrder: ShowcaseOrder["scenario"][] = [
    "recent", "in_transit", "warranty_presumption", "warranty_third_year", "expired", "open_claim",
  ];
  showcaseOrders.sort((a, b) => scenarioOrder.indexOf(a.scenario) - scenarioOrder.indexOf(b.scenario));

  // Claims and their timelines ---------------------------------------------
  const claims: SeedClaim[] = [];
  const events: SeedEvent[] = [];
  const showcaseClaimCodes: string[] = [];
  const usedCodes = new Set<string>();
  const addEvent = (e: Omit<SeedEvent, "id">) => events.push({ id: events.length + 1, ...e });

  CLAIM_SPECS.forEach((spec, index) => {
    const claimId = index + 1;
    let code: string;
    do code = `PV-${rnd.code(4)}-${rnd.code(4)}`;
    while (usedCodes.has(code));
    usedCodes.add(code);
    if (spec.showcase) showcaseClaimCodes.push(code);

    const openedOn = addDays(today, -spec.openedAgo);
    const createdAt = at(openedOn, rnd.int(7, 19), rnd.int(0, 59));
    addEvent({
      claimId, kind: "created", actor: "customer", fromStatus: null, toStatus: "received",
      message: null, isPublic: true, createdAt,
    });

    // Path through the workflow and the day offset of each step.
    const path: ClaimStatus[] = (["approved", "product_returned"] as ClaimStatus[]).slice(
      0,
      spec.status === "received" ? 0 : spec.status === "approved" ? 1 : 2,
    );
    if (["replaced", "refunded", "rejected"].includes(spec.status)) path.push(spec.status);

    const span = spec.closeAfter ?? spec.openedAgo - 1;
    const offsets: number[] = [];
    path.forEach((_, i) => {
      const fraction = path.length === 1 ? 0.3 : [0.15, 0.55, 1][i] ?? 1;
      const previous = offsets[i - 1] ?? 0;
      offsets.push(Math.min(span, Math.max(previous + 1, Math.round(span * fraction))));
    });

    let from: ClaimStatus = "received";
    let lastAt = createdAt;
    path.forEach((to, i) => {
      const when = at(addDays(openedOn, offsets[i] ?? 1), rnd.int(7, 17), rnd.int(0, 59));
      const message =
        to === "rejected" ? spec.rejection ?? null
        : to === "approved" ? STAFF_MESSAGES[`approved_${spec.type}`] ?? null
        : to === "refunded" ? STAFF_MESSAGES[`refunded_${spec.type}`] ?? null
        : STAFF_MESSAGES[to] ?? null;
      addEvent({ claimId, kind: "status_changed", actor: "staff", fromStatus: from, toStatus: to, message, isPublic: true, createdAt: when });

      // Internal notes, written right after a step.
      const noteAt = new Date(when.getTime() + 25 * 60_000);
      if (to === "approved" && spec.sku === "OND-BUDSPRO" && spec.reason === "battery") {
        addEvent({ claimId, kind: "internal_note", actor: "staff", fromStatus: null, toStatus: null, message: INTERNAL_NOTES.budsBattery, isPublic: false, createdAt: noteAt });
      } else if (to === "approved" && spec.type === "warranty" && rnd.chance(0.4)) {
        addEvent({ claimId, kind: "internal_note", actor: "staff", fromStatus: null, toStatus: null, message: INTERNAL_NOTES.phoneCall, isPublic: false, createdAt: noteAt });
      } else if (to === "product_returned" && spec.type === "withdrawal") {
        addEvent({ claimId, kind: "internal_note", actor: "staff", fromStatus: null, toStatus: null, message: INTERNAL_NOTES.withdrawalCheck, isPublic: false, createdAt: noteAt });
      } else if (to === "rejected") {
        addEvent({ claimId, kind: "internal_note", actor: "staff", fromStatus: null, toStatus: null, message: INTERNAL_NOTES.photos, isPublic: false, createdAt: noteAt });
      } else if (to === "refunded" && spec.type === "warranty") {
        addEvent({ claimId, kind: "internal_note", actor: "staff", fromStatus: null, toStatus: null, message: INTERNAL_NOTES.supplier, isPublic: false, createdAt: noteAt });
      }
      from = to;
      lastAt = when;
    });

    const closed = ["replaced", "refunded", "rejected"].includes(spec.status);
    const texts = CUSTOMER_TEXTS[spec.reason] ?? [""];
    claims.push({
      id: claimId,
      code,
      orderItemId: claimItemIds.get(index) as number,
      type: spec.type,
      reason: spec.reason,
      description: rnd.pick(texts),
      status: spec.status,
      openedOn,
      dueOn: claimDueDate(spec.type, openedOn),
      createdAt,
      updatedAt: lastAt,
      closedAt: closed ? lastAt : null,
    });
  });

  return {
    seededOn: today,
    products: PRODUCTS,
    customers,
    orders,
    items,
    claims,
    events,
    showcase: { orders: showcaseOrders, claimCodes: showcaseClaimCodes },
  };
}
