/** Remembers the last looked-up order for this browser tab, so a reload keeps the page. */
export interface LookupCredentials {
  orderNumber: string;
  email: string;
}

const KEY = "posventa.lookup";

export function saveLookup(credentials: LookupCredentials): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(credentials));
  } catch {
    // storage blocked: the page still works until reload
  }
}

export function loadLookup(): LookupCredentials | undefined {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<LookupCredentials>;
    return typeof value.orderNumber === "string" && typeof value.email === "string"
      ? { orderNumber: value.orderNumber, email: value.email }
      : undefined;
  } catch {
    return undefined;
  }
}
