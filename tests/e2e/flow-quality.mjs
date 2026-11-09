// The quality checks the plan asks for at the FULL tag: keyboard path, phone width, reduced motion, locale, corrupted
// storage, and whether the rain repaints. Run by hand, not in CI: see tests/e2e/README.md. Usage: node tests/e2e/flow-quality.mjs [baseUrl] [browser]
import { chromium, firefox, webkit } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:4173";
const browserName = process.argv[3] ?? "chromium";
const engines = { chromium, firefox, webkit };

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? `  -> ${detail}` : ""}`);
  }
}
async function eventually(name, fn, ms = 4000) {
  const start = Date.now();
  let last = [false];
  do {
    last = await fn().catch((e) => [false, e.message.split("\n")[0]]);
    if (last[0]) break;
    await new Promise((r) => setTimeout(r, 100));
  } while (Date.now() - start < ms);
  check(name, Boolean(last[0]), last[1] ?? "");
}

const browser = await engines[browserName].launch();
const pageErrors = [];
const watch = (page) => page.on("pageerror", (e) => {
  if (!e.message.includes("due to access control checks")) pageErrors.push(e.message);
});
const lemon = { productId: 31, title: "Lemon", thumbnail: "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp", price: 50, discountPercentage: 0, stock: 50, quantity: 2 };
const savedOrder = {
  id: 1,
  number: "10X-00001",
  items: [lemon],
  shipping: { fullName: "Emily Johnson", email: "emily@example.com", phone: "+995555123456", address: "1 Rustaveli Avenue", city: "Tbilisi", postalCode: "0108", country: "Georgia" },
  subtotal: 100,
  discount: 0,
  shippingCost: 0,
  total: 100,
  placedAt: "2026-11-05T10:00:00.000Z",
};

// --- O3 the full keyboard path from the annex: Tab through the catalog, Enter opens a product, Tab to Add to cart, fill Checkout.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    }
  });
  const page = await context.newPage();
  watch(page);
  const tabKey = "Tab";
  const active = () => page.evaluate(() => ({
    text: (document.activeElement?.innerText || document.activeElement?.getAttribute("aria-label") || "").trim(),
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id,
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  async function tabTo(matches, limit = 60) {
    for (let i = 0; i < limit; i += 1) {
      await page.keyboard.press(tabKey);
      const now = await active();
      if (matches(now)) return now;
    }
    return null;
  }

  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  // Safari and WebKit leave links out of the Tab order by default, which is a browser setting and can't be changed
  // from a page. So on WebKit the two link steps focus the link directly, and buttons and fields still go by Tab.
  const linksInTabOrder = browserName !== "webkit";
  let card;
  if (linksInTabOrder) {
    card = await tabTo((now) => now.tag === "A" && now.text.includes("Essence Mascara"));
  } else {
    await page.locator("[data-slot] a").first().focus();
    card = await active();
  }
  check("Keyboard: Tab reaches the first product card", card !== null);
  check("Keyboard: the focus is visible", card?.outline !== "none", JSON.stringify(card));
  await page.keyboard.press("Enter");
  await eventually("Keyboard: Enter opens the product", async () => [/\/products\/\d+$/.test(new URL(page.url()).pathname)]);
  await page.getByRole("heading", { level: 1 }).waitFor();
  const add = await tabTo((now) => now.tag === "BUTTON" && now.text === "Add to cart");
  check("Keyboard: Tab reaches Add to cart", add !== null);
  await page.keyboard.press("Enter");
  await eventually("Keyboard: Enter adds it", async () => [(await page.locator("body").innerText()).includes("Added to cart ✓")]);

  // Back to the header, by going around through the top of the page.
  await page.evaluate(() => document.activeElement.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
  let cart;
  if (linksInTabOrder) {
    await page.locator("header a").first().focus();
    cart = await tabTo((now) => now.tag === "A" && now.text.startsWith("Cart"), 8);
  } else {
    await page.locator('#main-nav a[href="/cart"]').focus();
    cart = await active();
  }
  check("Keyboard: Tab reaches the Cart link", cart !== null);
  await page.keyboard.press("Enter");
  await eventually("Keyboard: Enter opens the cart", async () => [new URL(page.url()).pathname === "/cart"]);
  await page.getByRole("button", { name: "Proceed to checkout" }).waitFor();
  const proceed = await tabTo((now) => now.text === "Proceed to checkout");
  check("Keyboard: Tab reaches Proceed to checkout", proceed !== null);
  await page.keyboard.press("Enter");
  await eventually("Keyboard: Enter opens Checkout", async () => [new URL(page.url()).pathname === "/checkout"]);
  await page.locator("#fullName").waitFor();

  const first = await tabTo((now) => now.id === "fullName");
  check("Keyboard: Tab reaches the first field", first !== null);
  await page.keyboard.type("Emily Johnson");
  for (const value of ["emily@example.com", "+995555123456"]) {
    await page.keyboard.press("Tab");
    await page.keyboard.type(value);
  }
  await page.keyboard.press("Enter"); // In a field, Enter means Continue.
  await page.locator("#address").waitFor();
  await eventually("Keyboard: focus lands on the new step's heading", async () => [(await active()).tag === "H2", JSON.stringify(await active())]);
  await page.keyboard.press("Tab");
  await page.keyboard.type("1 Rustaveli Avenue");
  for (const value of ["Tbilisi", "0108"]) {
    await page.keyboard.press("Tab");
    await page.keyboard.type(value);
  }
  check("Keyboard: every field was filled", (await page.getByLabel("Postal code").inputValue()) === "0108");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Place order" }).waitFor();
  const place = await tabTo((now) => now.text === "Place order", 8);
  check("Keyboard: Tab reaches Place order", place !== null);
  await page.keyboard.press("Enter");
  await eventually("Keyboard: Enter places the order", async () => [(await page.locator("main").innerText()).includes("Thank you! Your order has been placed.")]);
  await context.close();
}

// --- O3 the spec's mobile width: no sideways scrolling on any route, in either theme.
for (const theme of ["dark", "light"]) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript(([chosen, item, order]) => {
    localStorage.setItem("shop_theme", JSON.stringify(chosen));
    localStorage.setItem("shop_cart", JSON.stringify({ items: [item], promoCode: null }));
    localStorage.setItem("shop_orders", JSON.stringify([order]));
    if (/^\/(login|signup)/.test(location.pathname)) localStorage.removeItem("shop_user");
    else localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
  }, [theme, lemon, savedOrder]);
  const page = await context.newPage();
  watch(page);
  for (const route of ["/", "/products/1", "/products/117", "/cart", "/login", "/signup", "/reset-password", "/checkout", "/orders", "/orders/1", "/profile", "/nope"]) {
    await page.goto(`${BASE}${route}`);
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`375px ${theme} ${route}: no sideways scroll`, overflow <= 0, `${overflow}px too wide`);
  }
  await context.close();
}

// --- O3 grid columns at the spec's widths.
for (const [width, columns] of [[375, 1], [768, 3], [1024, 3], [1440, 4]]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const count = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-slot]")];
    return cards.filter((card) => card.getBoundingClientRect().top === cards[0].getBoundingClientRect().top).length;
  });
  check(`Grid at ${width}px has ${columns} column(s)`, count === columns, `${count} columns`);
  await context.close();
}

// --- Reduced motion: no rain and nothing running, on any route.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  watch(page);
  for (const route of ["/", "/products/1", "/cart", "/login"]) {
    await page.goto(`${BASE}${route}`);
    await page.locator("h1").first().waitFor();
    await page.waitForLoadState("load");
    const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
    const rain = await page.evaluate(() => getComputedStyle(document.querySelector(".rain")).display);
    check(`Reduced motion ${route}: the rain is off`, rain === "none", rain);
    check(`Reduced motion ${route}: nothing is animating`, running === 0, `${running} running`);
  }
  await context.close();
}

// --- A Georgian browser still shows prices as the spec writes them.
{
  const context = await browser.newContext({ locale: "ka-GE", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const prices = await page.locator("[data-slot] .led-text").allInnerTexts();
  check("Locale ka-GE: prices keep the $1,234.56 shape", prices.filter((text) => text.startsWith("$")).every((text) => /^\$[\d,]+\.\d{2}$/.test(text)) && prices.some((text) => text.startsWith("$")), prices.slice(0, 4).join(" "));
  await context.close();
}

// --- Corrupted saved data must never stop the shop from opening.
{
  const junk = ["{broken", "null", "[]", "12", '"text"', '{"items":"nope"}', '{"__proto__":{"x":1}}'];
  for (const value of junk) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript((text) => {
      for (const key of ["shop_cart", "shop_orders", "shop_reviews", "shop_user", "shop_profile", "shop_theme"]) localStorage.setItem(key, text);
    }, value);
    const page = await context.newPage();
    watch(page);
    let opened = true;
    for (const route of ["/", "/products/1", "/cart"]) {
      await page.goto(`${BASE}${route}`);
      await page.locator("h1").first().waitFor();
      if ((await page.locator("main").innerText()).includes("Something went wrong.")) opened = false;
    }
    check(`Corrupted storage ${value}: the shop still opens`, opened);
    await context.close();
  }
}

// --- The rain: it must not repaint the screen. The CRM project once repainted 60 times a second, so this is measured.
if (browserName === "chromium") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const cdp = await context.newCDPSession(page);
  const events = [];
  cdp.on("Tracing.dataCollected", ({ value }) => events.push(...value));
  await cdp.send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline"] }, transferMode: "ReportEvents" });
  await page.waitForTimeout(3000);
  const done = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  await cdp.send("Tracing.end");
  await done;
  const count = (name) => events.filter((event) => event.name === name).length;
  const paints = count("Paint");
  console.log(`Rain over 3 seconds: ${paints} paints, ${count("Layout")} layouts, ${count("UpdateLayoutTree")} style recalculations`);
  check("Rain: the page doesn't keep repainting while idle", paints / 3 < 5, `${paints} paints in 3 seconds`);
  check("Rain: the page doesn't keep doing layout while idle", count("Layout") === 0, `${count("Layout")} layouts`);
  await context.close();
}

check("No uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
await browser.close();
console.log(`\n${browserName}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
