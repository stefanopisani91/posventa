/**
 * Fictional catalogue and people. Brand and product names are invented for
 * this demo; any resemblance to real brands or persons is coincidental.
 * All e-mail addresses use the reserved example.com domain (RFC 2606).
 */
import type { ProductCategory } from "../../shared/domain.ts";

export interface SeedProduct {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  priceCents: number;
  /** Relative popularity used to fill random orders. */
  weight: number;
}

export const PRODUCTS: SeedProduct[] = [
  { id: 1, sku: "OND-BUDSPRO", name: "Ondaluz Buds Pro", brand: "Ondaluz", category: "audio", priceCents: 8990, weight: 14 },
  { id: 2, sku: "OND-ARC700", name: "Ondaluz Arc 700", brand: "Ondaluz", category: "audio", priceCents: 14900, weight: 6 },
  { id: 3, sku: "SON-CUBE", name: "Sonoria Cube", brand: "Sonoria", category: "audio", priceCents: 7900, weight: 8 },
  { id: 4, sku: "PXM-NOVA6", name: "Pixelmar Nova 6", brand: "Pixelmar", category: "smartphone", priceCents: 44900, weight: 6 },
  { id: 5, sku: "PXM-NOVA6L", name: "Pixelmar Nova 6 Lite", brand: "Pixelmar", category: "smartphone", priceCents: 27900, weight: 8 },
  { id: 6, sku: "PXM-TAB11", name: "Pixelmar Tab 11", brand: "Pixelmar", category: "tablet", priceCents: 32900, weight: 6 },
  { id: 7, sku: "TEC-BOOK14", name: "Teclaro Book 14", brand: "Teclaro", category: "laptop", priceCents: 89900, weight: 4 },
  { id: 8, sku: "TEC-BOOK16P", name: "Teclaro Book 16 Pro", brand: "Teclaro", category: "laptop", priceCents: 129900, weight: 2 },
  { id: 9, sku: "TEC-VISTA27", name: "Teclaro Vista 27", brand: "Teclaro", category: "monitor", priceCents: 28900, weight: 4 },
  { id: 10, sku: "VOL-PULSE2", name: "Voltiva Pulse 2", brand: "Voltiva", category: "wearable", priceCents: 19900, weight: 7 },
  { id: 11, sku: "VOL-PWR20K", name: "Voltiva Power 20000", brand: "Voltiva", category: "accessory", priceCents: 3990, weight: 12 },
  { id: 12, sku: "VOL-GAN65", name: "Voltiva GaN 65W", brand: "Voltiva", category: "accessory", priceCents: 3490, weight: 12 },
  { id: 13, sku: "LEC-READ7", name: "Lecturo 7", brand: "Lecturo", category: "ereader", priceCents: 12900, weight: 5 },
  { id: 14, sku: "TRK-CAM4K", name: "Trekko Cam 4K", brand: "Trekko", category: "camera", priceCents: 21900, weight: 4 },
  { id: 15, sku: "NXL-AX3000", name: "Nexalia Mesh AX3000", brand: "Nexalia", category: "networking", priceCents: 15900, weight: 5 },
];

export const productBySku = (sku: string): SeedProduct => {
  const product = PRODUCTS.find((p) => p.sku === sku);
  if (!product) throw new Error(`Unknown SKU ${sku}`);
  return product;
};

export interface SeedPerson {
  firstName: string;
  surnames: string;
  city: string;
}

/** Fixed people used by the showcase orders (always the first customers). */
export const SHOWCASE_PEOPLE: SeedPerson[] = [
  { firstName: "Laia", surnames: "Puig Ferrer", city: "Barcelona" },
  { firstName: "Marco", surnames: "Rinaldi", city: "Barcelona" },
  { firstName: "Núria", surnames: "Soler Vidal", city: "Sabadell" },
  { firstName: "Javier", surnames: "Ortega Ruiz", city: "Valencia" },
  { firstName: "Camille", surnames: "Laurent", city: "Barcelona" },
  { firstName: "Pau", surnames: "Riera Mas", city: "Girona" },
];

export const FIRST_NAMES_ES = [
  "Marc", "Jordi", "Marta", "Carla", "Àlex", "Sergi", "Anna", "Pol", "Júlia", "Arnau",
  "Clara", "Oriol", "Mireia", "Lucía", "Hugo", "Martina", "Daniel", "Paula", "Alejandro",
  "Sofía", "Elena", "Pablo", "Carmen", "David", "Irene", "Raúl", "Nerea", "Iván", "Alba",
  "Rubén", "Andrea", "Montse", "Xavier", "Roser", "Gerard", "Aina", "Bruno", "Noelia",
];
export const SURNAMES_ES = [
  "Puig", "Ferrer", "Vidal", "Soler", "Font", "Roca", "Serra", "Pons", "Vila", "Mas",
  "Riera", "Bosch", "García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández",
  "Ruiz", "Díaz", "Moreno", "Romero", "Navarro", "Torres", "Domínguez", "Castillo", "Ortega",
  "Sala", "Camps", "Prat", "Marín", "Molina", "Delgado",
];
/** Barcelona has many international residents. */
export const FOREIGN_PEOPLE: [string, string][] = [
  ["Giulia", "Conti"], ["Luca", "Moretti"], ["Chiara", "Esposito"], ["Lena", "Weber"],
  ["Jonas", "Schmidt"], ["Théo", "Dubois"], ["Emma", "Lefèvre"], ["Noah", "Jansen"],
  ["Sara", "Lindqvist"], ["Youssef", "Benali"], ["Mei", "Chen"], ["Olga", "Petrenko"],
  ["Tomás", "Silva"], ["Inês", "Costa"], ["Liam", "O'Brien"], ["Ana", "Popescu"],
];
export const CITIES: [string, number][] = [
  ["Barcelona", 40], ["L'Hospitalet de Llobregat", 6], ["Badalona", 5], ["Sabadell", 4],
  ["Terrassa", 4], ["Girona", 4], ["Tarragona", 3], ["Lleida", 2], ["Mataró", 3],
  ["Sant Cugat del Vallès", 3], ["Valencia", 5], ["Madrid", 6], ["Zaragoza", 3],
  ["Sevilla", 2], ["Palma", 3], ["Bilbao", 2], ["Málaga", 2],
];

/** What customers typically write, by reason. */
export const CUSTOMER_TEXTS: Record<string, string[]> = {
  no_reason: [""],
  changed_mind: [
    "He cambiado de opinión, prefiero un modelo más pequeño.",
    "Al final no lo necesito. Está sin usar y en su caja.",
  ],
  not_as_described: [
    "El color no coincide con el de las fotos de la web.",
    "La web decía que incluía funda y no venía en la caja.",
  ],
  ordered_by_mistake: ["Pedí el modelo equivocado, quería la otra versión."],
  better_price: ["Lo he encontrado más barato en otra tienda."],
  arrived_late: ["Era un regalo y llegó después de la fecha."],
  does_not_turn_on: [
    "No enciende desde ayer. Lo he cargado toda la noche y nada.",
    "It suddenly stopped turning on. The charging light does not come on either.",
  ],
  battery: [
    "La batería del auricular izquierdo dura menos de una hora desde hace unas semanas.",
    "La batería baja del 100 % al 20 % en dos horas sin usarlo.",
    "The left earbud battery drains in about 40 minutes.",
  ],
  screen: [
    "Han aparecido líneas verticales en la pantalla sin ningún golpe.",
    "La pantalla parpadea cuando bajo el brillo.",
  ],
  audio: [
    "Se oye un zumbido constante en el lado derecho.",
    "Il volume si abbassa da solo e a volte si sente un fruscio.",
  ],
  connectivity: [
    "Se desconecta del Bluetooth cada pocos minutos, lo he probado con dos móviles.",
    "La red wifi se cae varias veces al día desde la última actualización.",
  ],
  charging: [
    "Solo carga si muevo el cable; el puerto USB-C parece suelto.",
    "Se calienta mucho al cargar y se detiene al 60 %.",
  ],
  physical_defect: [
    "El conector se ha separado de la carcasa con un uso normal.",
    "La carcasa tiene una grieta que se ha ido haciendo más grande.",
  ],
  other: ["Hace un ruido extraño al encenderlo."],
};
