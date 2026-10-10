import { test, type Page } from "@playwright/test";

/** Captures the README screenshots: npm run e2e -- --project=screenshots */
const OUT = "docs/screenshots";

async function lang(page: Page, value: string) {
  await page.locator(".lang-select select").selectOption(value);
}

async function login(page: Page) {
  await page.goto("/staff/login");
  await page.locator(".demo-credentials button").first().click();
  await page.locator(".login__card button[type=submit]").click();
  await page.waitForSelector(".claims-table");
}

test("desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto("/");
  await lang(page, "en");
  await page.waitForSelector(".demo-order");
  await page.screenshot({ path: `${OUT}/customer-home.png` });

  await page.locator(".demo-order").first().click();
  await page.locator(".lookup button[type=submit]").click();
  await page.waitForSelector(".item");
  await page.locator(".item").first().getByRole("button").nth(1).click(); // report a defect
  await page.locator(".claim-form select").selectOption("connectivity");
  await page.locator(".claim-form textarea").fill("The right ear cup disconnects every few minutes.");
  await page.screenshot({ path: `${OUT}/customer-order.png`, fullPage: true });

  await page.goto("/track");
  await page.locator(".examples .chip").nth(1).click();
  await page.waitForSelector(".tracking");
  await page.screenshot({ path: `${OUT}/customer-tracking.png`, fullPage: true });

  await login(page);
  await lang(page, "es");
  await page.screenshot({ path: `${OUT}/staff-queue.png` });

  await page.goto("/staff?status=open&productId=1");
  await page.waitForSelector(".claims-table");
  await page.locator(".claims-table .code-link").first().click();
  await page.waitForSelector(".detail__code");
  await page.screenshot({ path: `${OUT}/staff-claim.png`, fullPage: true });

  await page.goto("/staff/stats?period=all");
  await page.waitForSelector(".stat-tile");
  await lang(page, "it");
  await page.locator(".stacked__col").nth(10).hover();
  await page.screenshot({ path: `${OUT}/staff-numbers.png`, fullPage: true });

  await page.goto("/staff/login");
  await page.screenshot({ path: `${OUT}/staff-login.png` });
});

test("mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await lang(page, "es");
  await page.locator(".demo-order").nth(3).click();
  await page.locator(".lookup button[type=submit]").click();
  await page.waitForSelector(".item");
  await page.screenshot({ path: `${OUT}/mobile-order.png`, fullPage: true });
  await login(page);
  await page.screenshot({ path: `${OUT}/mobile-queue.png` });
});
