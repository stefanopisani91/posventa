import { expect, test, type Page } from "@playwright/test";

/**
 * The full journey on a real deployment: a customer opens a return, the shop
 * approves it, the change survives a reload (it is in the database), the
 * customer sees it, the UI works in three languages, and the demo reset
 * restores the initial data.
 */
test.describe.configure({ mode: "serial" });

let claimCode = "";

async function setLanguage(page: Page, value: "es" | "en" | "it") {
  await page.locator(".lang-select select").selectOption(value);
}

test("customer opens a return for a recent order", async ({ page }) => {
  await page.goto("/");
  await setLanguage(page, "es");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Devoluciones y garantía");

  await page.locator(".demo-order", { hasText: "Entregado hace 3 días" }).click();
  await page.getByRole("button", { name: "Ver mis opciones" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pedido CG-");
  const firstItem = page.locator(".item").first();
  await expect(firstItem.locator(".right-panel--open").first()).toContainText("Quedan");

  // A previous run may have left an open claim on the first line; use the first line still open.
  const items = page.locator(".item");
  let index = 0;
  while ((await items.nth(index).getByRole("button", { name: "Devolverlo" }).count()) === 0) index++;
  const item = items.nth(index);
  await item.getByRole("button", { name: "Devolverlo" }).click();
  await item.getByRole("button", { name: "Enviar solicitud" }).click();

  const code = item.getByTestId("claim-code");
  await expect(code).toHaveText(/^PV-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  claimCode = (await code.textContent()) ?? "";

  await item.getByRole("link", { name: "Seguir esta solicitud" }).click();
  await expect(page.locator(".tracking__code")).toHaveText(claimCode);
  await expect(page.locator(".tracking .badge")).toHaveText("Recibida");
});

test("shop approves it and the change is stored in the database", async ({ page }) => {
  expect(claimCode).not.toBe("");
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login/);
  await setLanguage(page, "es");

  await page.getByRole("button", { name: "Usar estas credenciales" }).click();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Solicitudes");

  await page.getByRole("searchbox").fill(claimCode);
  const link = page.getByRole("link", { name: claimCode });
  await expect(link).toBeVisible();
  await link.click();

  await expect(page.locator(".detail__code")).toHaveText(claimCode);
  await page.locator(".choice", { hasText: "Aprobada" }).click();
  await page.getByLabel("Mensaje para el cliente").fill("Te enviamos la etiqueta de devolución por email.");
  await page.getByRole("button", { name: "Actualizar estado" }).click();
  await expect(page.locator(".detail__badges .badge")).toHaveText("Aprobada");

  await page.getByLabel("Nota interna", { exact: true }).fill("Prueba E2E: nota solo para la tienda.");
  await page.getByRole("button", { name: "Añadir nota" }).click();
  await expect(page.locator(".timeline__item--internal").first()).toContainText("Prueba E2E");

  // Reload: the new status comes back from the database.
  await page.reload();
  await expect(page.locator(".detail__badges .badge")).toHaveText("Aprobada");
  await expect(page.locator(".timeline")).toContainText("Te enviamos la etiqueta");
});

test("customer sees the update but not the internal note", async ({ page }) => {
  await page.goto(`/track/${claimCode}`);
  await setLanguage(page, "es");
  await expect(page.locator(".tracking .badge")).toHaveText("Aprobada");
  await expect(page.locator(".timeline")).toContainText("Te enviamos la etiqueta");
  await expect(page.locator(".timeline")).not.toContainText("Prueba E2E");
});

test("the interface works in Spanish, English and Italian", async ({ page }) => {
  await page.goto("/");
  const h1 = page.getByRole("heading", { level: 1 });
  await setLanguage(page, "en");
  await expect(h1).toHaveText("Returns and warranty");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await setLanguage(page, "it");
  await expect(h1).toHaveText("Resi e garanzia");
  await page.reload();
  await expect(h1).toHaveText("Resi e garanzia"); // the choice is remembered
  await page.goto(`/track/${claimCode}`);
  await expect(page.locator(".tracking .badge")).toHaveText("Approvata");
  await setLanguage(page, "en");
  await expect(page.locator(".tracking .badge")).toHaveText("Approved");
  await setLanguage(page, "es");
});

test("the numbers page loads", async ({ page }) => {
  await page.goto("/staff/login");
  await setLanguage(page, "en");
  await page.getByRole("button", { name: "Use these credentials" }).click();
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Numbers" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Numbers");
  await expect(page.locator(".stat-tile")).toHaveCount(4);
  await expect(page.locator(".chart-card").nth(2)).toContainText("Ondaluz Buds Pro");
  await setLanguage(page, "es");
});

test("restoring the demo data removes the test claim", async ({ page }) => {
  await page.goto("/staff/login");
  await setLanguage(page, "es");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Restaurar datos de demostración" }).click();
  await expect(page.locator(".alert--success")).toContainText("restaurados");

  await page.goto(`/track/${claimCode}`);
  await expect(page.locator(".alert--error")).toContainText("No hay ninguna solicitud con ese código");
});
