// CORE outcome checks, driven in a real browser. Run by hand, not in CI: see tests/e2e/README.md.
// Usage: node tests/e2e/flow-core.mjs [baseUrl] [chromium|firefox|webkit]
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

// Polls a condition instead of reading it once, because pages update a moment after a click, at a different
// speed in each browser. A real bug still fails: the condition simply never becomes true within the time.
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
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("404") && !m.text().includes("Image corrupt or truncated")) consoleErrors.push(m.text());
});

const path = () => new URL(page.url()).pathname;

// --- P2 catalog
await page.goto(`${BASE}/`);
await page.waitForSelector("[data-slot]");
await eventually("P2 catalog shows 12 cards from the API", async () => [(await page.locator("[data-slot]").count()) === 12]);
await eventually("P2 heading is Catalog", async () => [(await page.locator("h1").innerText()) === "Catalog"]);
await eventually("P2 first slot code is A1", async () => [(await page.locator("[data-slot]").first().getAttribute("data-slot")) === "A1"]);
await eventually("P0 badge hidden when cart is empty", async () => [!/\d+ items?/.test(await page.getByRole("navigation", { name: "Main" }).textContent())]);

// --- P4 add from the card
await page.locator("[data-slot]").first().getByRole("button", { name: "Add to cart" }).click();
await page.waitForFunction(() => document.body.innerText.includes("Added to cart ✓"), undefined, { polling: 100 });
await eventually("P2 Add to cart shows exact feedback", async () => [true]);
await eventually("P0 badge shows quantity after add", async () => [(await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Cart" }).innerText()).includes("01")]);

// --- card opens details without adding
await page.locator("[data-slot]").nth(1).getByRole("link").click();
await page.waitForURL("**/products/2");
await eventually("P2 clicking a card opens its details", async () => [path() === "/products/2"]);

// --- P3 product
await page.goto(`${BASE}/products/1`);
await page.waitForSelector("h1");
const api1 = await (await fetch("https://dummyjson.com/products/1")).json();
const expected = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.round(api1.price * (1 - api1.discountPercentage / 100) * 100) / 100);
await eventually("P3 price matches the formula", async () => [(await page.locator("body").innerText()).includes(expected), expected]);
await eventually("P3 in stock text on product 1", async () => [(await page.locator("main").innerText()).includes("In stock")]);

await page.goto(`${BASE}/products/9`);
await page.waitForSelector("h1");
await eventually("P3 low stock text on product 9", async () => [(await page.locator("main").innerText()).includes("Only 4 left!")]);

await page.goto(`${BASE}/products/117`);
await page.waitForSelector("h1");
const main117 = await page.locator("main").innerText();
await eventually("P3 out of stock text on product 117", async () => [main117.includes("Out of stock")]);
await eventually("P3 Add disabled when out of stock", async () => [await page.getByRole("button", { name: "Out of stock" }).first().isDisabled()]);

let apiCalls = 0;
page.on("request", (r) => {
  if (r.url().includes("dummyjson.com/products/")) apiCalls += 1;
});
await page.goto(`${BASE}/products/abc`);
await page.waitForFunction(() => document.body.innerText.includes("Page not found"), undefined, { polling: 100 });
await eventually("P3 /products/abc shows NotFound", async () => [true]);
await eventually("P3 /products/abc sends no request", async () => [apiCalls === 0, `calls ${apiCalls}`]);

await page.goto(`${BASE}/products/999999`);
await page.waitForFunction(() => document.body.innerText.includes("Page not found"), undefined, { polling: 100 });
await eventually("P3 /products/999999 shows NotFound", async () => [true]);

await page.goto(`${BASE}/no/such/page`);
await page.waitForFunction(() => document.body.innerText.includes("The page you are looking for does not exist."), undefined, { polling: 100 });
await eventually("P0 unknown URL shows the 404 page with the exact text", async () => [(await page.getByRole("link", { name: "Go to catalog" }).count()) === 1]);

// --- stepper limits and adding a quantity
await page.goto(`${BASE}/products/9`);
await page.waitForSelector("h1");
await eventually("P3 stepper minus disabled at 1", async () => [await page.getByRole("button", { name: "One less" }).isDisabled()]);
for (let i = 0; i < 3; i += 1) await page.getByRole("button", { name: "One more" }).click();
await eventually("P3 stepper plus disabled at stock", async () => [await page.getByRole("button", { name: "One more" }).isDisabled()]);
await page.getByRole("button", { name: "Add to cart" }).first().click();
await eventually("P3 add quantity 4 succeeds", async () => [(await page.locator("body").innerText()).includes("Added to cart ✓")]);
await page.getByRole("button", { name: "Add to cart" }).first().click();
await eventually("P3 over-stock add is refused with a message", async () => [(await page.locator("body").innerText()).includes("Only 4 available. You already have 4 in your cart.")]);

// --- P4 cart survives a reload, stepper, remove, total
await page.goto(`${BASE}/cart`);
await page.waitForSelector("h1");
await eventually("P4 cart survives a full page load", async () => [(await page.locator("main li").count()) === 2]);
const line = page.locator("main li").filter({ hasText: "Dolce Shine" });
await line.getByRole("button", { name: "One less" }).click();
const dolcePrice = await (await fetch("https://dummyjson.com/products/9")).json();
const unit = Math.round(dolcePrice.price * (1 - dolcePrice.discountPercentage / 100) * 100) / 100;
const mascara = Math.round(api1.price * (1 - api1.discountPercentage / 100) * 100) / 100;
const expectTotal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(unit * 3 + mascara);
await eventually("P4 total follows quantity changes", async () => [(await page.getByLabel("Order summary").innerText()).includes(expectTotal), expectTotal]);
await page.locator("main li").filter({ hasText: "Essence" }).getByRole("button", { name: "Remove" }).click();
await eventually("P4 remove deletes the line", async () => [(await page.locator("main li").count()) === 1]);

// --- P0.2 guard and login
await page.getByRole("button", { name: "Proceed to checkout" }).click();
await page.waitForURL("**/login");
await eventually("P0 guest is sent from checkout to login", async () => [path() === "/login"]);

await page.evaluate(() => {
  window.__noReload = true;
});
await page.getByRole("button", { name: "Log In" }).click();
let body = await page.locator("main").innerText();
await eventually("P1 empty submit shows both exact errors", async () => [body.includes("Username is required") && body.includes("Password is required")]);
await eventually("P1 submit does not reload", async () => [await page.evaluate(() => window.__noReload === true)]);
await page.getByLabel("Username").fill("emilys");
await page.getByLabel("Password").fill("short");
await page.getByRole("button", { name: "Log In" }).click();
await eventually("P1 short password shows the exact error", async () => [(await page.locator("main").innerText()).includes("Password must be at least 6 characters")]);
await page.getByLabel("Password").fill("emilyspass");
await page.getByRole("button", { name: "Log In" }).click();
await page.waitForURL("**/checkout");
await eventually("P0 login returns to checkout", async () => [path() === "/checkout"]);
await eventually("P1 header shows the username and Log out", async () => [(await page.getByRole("navigation", { name: "Main" }).innerText()).includes("emilys") && (await page.getByRole("button", { name: "Log out" }).count()) === 1]);

// --- P5 checkout
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForFunction(() => document.body.innerText.includes("Full name must be"), undefined, { polling: 100 });
body = await page.locator("main").innerText();
check(
  "P5 empty submit shows exact errors",
  ["Full name must be at least 3 characters", "Please enter a valid email address"].every((t) => body.includes(t)),
);
await eventually("P5 no card fields", async () => [(await page.locator('input[name*="card" i], input[autocomplete^="cc-"]').count()) === 0]);

// --- logout from the protected page must land on the catalog, and keep the cart
await page.getByRole("button", { name: "Log out" }).click();
await page.waitForTimeout(400);
await eventually("P0 logout from /checkout lands on the catalog", async () => [path() === "/", `landed on ${path()}`]);
await page.goto(`${BASE}/cart`);
await page.waitForSelector("main li");
await eventually("P0 logout keeps the cart", async () => [(await page.locator("main li").count()) === 1]);

// --- log in again from the header goes to the catalog, then full order
await page.getByRole("link", { name: "Log in" }).click();
await page.getByLabel("Username").fill("emilys");
await page.getByLabel("Password").fill("emilyspass");
await page.getByRole("button", { name: "Log In" }).click();
await page.waitForURL(`${BASE}/`);
await eventually("P1 login from the header goes to the catalog", async () => [path() === "/"]);
await page.getByRole("link", { name: "Cart" }).first().click();
await page.getByRole("button", { name: "Proceed to checkout" }).click();
await page.waitForURL("**/checkout");
await page.getByLabel("Full name").fill("Emily Johnson");
await page.getByLabel("Email").fill("emily@example.com");
await page.getByLabel("Phone").fill("+995 555 123 456");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForFunction(() => document.body.innerText.includes("City is required"), undefined, { polling: 100 });
body = await page.locator("main").innerText();
check("P5 the next step's exact errors", ["Address must be at least 5 characters", "City is required"].every((t) => body.includes(t)));
await page.getByLabel("Address", { exact: true }).fill("1 Rustaveli Avenue");
await page.getByLabel("City").fill("Tbilisi");
await page.getByLabel("Postal code").fill("0108");
await page.getByRole("button", { name: "Continue" }).click();
const placeButton = page.getByRole("button", { name: "Place order" });
await placeButton.dblclick();
await eventually("P5 button is disabled while placing", async () => [await placeButton.isDisabled()]);
await page.waitForFunction(() => document.body.innerText.includes("Thank you! Your order has been placed."), undefined, { polling: 100 });
const thanks = await page.locator("main").innerText();
await eventually("P5 confirmation shows the exact text", async () => [thanks.includes("Thank you! Your order has been placed.")]);
await eventually("P5 confirmation shows the total", async () => [thanks.includes(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(unit * 3))]);
await eventually("P5 cart is emptied and the badge hides", async () => [!/\d+ items?/.test(await page.getByRole("navigation", { name: "Main" }).textContent())]);
await eventually("P5 confirmation lands on the order page", async () => [path().startsWith("/orders/"), path()]);

await page.goto(`${BASE}/cart`);
await page.waitForFunction(() => document.body.innerText.includes("Your cart is empty."), undefined, { polling: 100 });
await eventually("P4 empty cart shows the exact text and link", async () => [(await page.getByRole("link", { name: "Browse products" }).count()) === 1]);

// --- from FULL the login survives a reload (shop_user), so check the empty-cart redirect without logging in again
await eventually("FULL the login survives the reload", async () => [(await page.getByRole("link", { name: "Log in" }).count()) === 0]);
await page.evaluate(() => {
  history.pushState({}, "", "/checkout");
  dispatchEvent(new PopStateEvent("popstate"));
});
await page.waitForURL("**/cart");
await eventually("P5 empty cart at checkout returns to /cart", async () => [path() === "/cart"]);

// --- API failure, empty and slow states
const failing = await context.newPage();
await failing.route("**/dummyjson.com/products?**", (route) => route.fulfill({ status: 500, body: "{}" }));
await failing.goto(`${BASE}/`);
await failing.waitForSelector('[role="alert"]');
await eventually("P0 API failure shows an error, no crash", async () => [(await failing.locator('[role="alert"]').innerText()).length > 0]);
await failing.close();

const empty = await context.newPage();
await empty.route("**/dummyjson.com/products?**", (route) => route.fulfill({ json: { products: [], total: 0, skip: 0, limit: 12 } }));
await empty.goto(`${BASE}/`);
await empty.waitForFunction(() => document.body.innerText.includes("No products found."), undefined, { polling: 100 });
await eventually("P0 empty response shows No products found.", async () => [true]);
await empty.close();

const slow = await context.newPage();
await slow.route("**/dummyjson.com/products?**", async (route) => {
  await new Promise((r) => setTimeout(r, 800));
  await route.continue();
});
await slow.goto(`${BASE}/`);
await eventually("P0 loading text shows while waiting", async () => [(await slow.locator("main").innerText()).includes("Loading")]);
await slow.close();

const corrupt = await context.newPage();
await corrupt.goto(`${BASE}/`);
await corrupt.evaluate(() => localStorage.setItem("shop_cart", "{not json"));
await corrupt.goto(`${BASE}/cart`);
await corrupt.waitForFunction(() => document.body.innerText.includes("Your cart is empty."), undefined, { polling: 100 });
await eventually("O2 corrupted saved cart gives an empty cart, no crash", async () => [true]);
await corrupt.close();

const impossible = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await impossible.addInitScript(() => {
  const line = { productId: 31, title: "Lemon", thumbnail: "x", price: 10, discountPercentage: 0, stock: 5, quantity: -3 };
  localStorage.setItem("shop_cart", JSON.stringify({ promoCode: null, items: [line, { ...line, quantity: 2 }, { ...line, productId: 32, quantity: 2 }, { ...line, productId: 32, quantity: 1 }] }));
});
const imp = await impossible.newPage();
await imp.goto(`${BASE}/cart`);
await imp.waitForSelector("h1");
await eventually("O2 saved negative quantity and repeated products are dropped", async () => [(await imp.locator("main li").count()) === 2]);
await eventually("O2 saved cart total is never negative", async () => [!(await imp.getByLabel("Order summary").innerText()).includes("-$")]);
await impossible.close();

const blocked = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await blocked.addInitScript(() => {
  Storage.prototype.setItem = () => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  };
});
const blockedPage = await blocked.newPage();
await blockedPage.goto(`${BASE}/`);
await blockedPage.waitForSelector("[data-slot]");
await blockedPage.locator("[data-slot]").first().getByRole("button", { name: "Add to cart" }).click();
await eventually("O2 storage that refuses writes doesn't crash, and the cart still works", async () => [(await blockedPage.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Cart" }).innerText()).includes("01")]);
await blocked.close();

// --- labels on the card don't swallow clicks
const cardPage = await context.newPage();
await cardPage.goto(`${BASE}/`);
await cardPage.waitForSelector("[data-slot]");
// A real mouse click at the label's position. Playwright's normal click refuses, because the click
// correctly passes through the label to the card's link underneath.
const codeBox = await cardPage.locator('[data-slot="A1"]').getByText("A1", { exact: true }).boundingBox();
await cardPage.mouse.click(codeBox.x + codeBox.width / 2, codeBox.y + codeBox.height / 2);
await cardPage.waitForURL("**/products/1");
await eventually("P2 clicking a card's slot code opens the product", async () => [true]);
await cardPage.getByRole("link", { name: "← Back to catalog" }).click();
await cardPage.waitForURL(`${BASE}/`);
await eventually("P3 Back to catalog returns to the catalog", async () => [true]);
await cardPage.goto(`${BASE}/cart`);
await cardPage.goto(`${BASE}/products/1`);
await cardPage.getByRole("link", { name: "← Back to catalog" }).click();
await cardPage.waitForURL(`${BASE}/`);
await eventually("P3 Back to catalog goes to the catalog even when the previous page was not", async () => [true]);
await cardPage.close();

// --- responsive: no sideways scroll, grid columns
for (const [width, cols] of [[375, 1], [1024, 3], [1440, 4]]) {
  const p = await context.newPage();
  await p.setViewportSize({ width, height: 900 });
  await p.goto(`${BASE}/`);
  await p.waitForSelector("[data-slot]");
  const noScroll = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await eventually(`O3 no sideways scroll on catalog at ${width}px`, async () => [noScroll]);
  const first = await p.locator("[data-slot]").first().boundingBox();
  const inRow = await p.locator("[data-slot]").evaluateAll((els, top) => els.filter((e) => Math.abs(e.getBoundingClientRect().top - top) < 2).length, first.y);
  await eventually(`TW3 ${cols} column(s) at ${width}px`, async () => [inRow === cols, `got ${inRow}`]);
  for (const route of ["/products/1", "/cart", "/login", "/no/such/page"]) {
    await p.goto(`${BASE}${route}`);
    await p.waitForSelector("h1");
    await eventually(`O3 no sideways scroll on ${route} at ${width}px`, async () => [await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)]);
  }
  await p.close();
}

// --- no unhandled errors during all of the above
await eventually("No uncaught page errors", async () => [pageErrors.length === 0, pageErrors.join(" | ")]);
await eventually("No console errors other than expected 404s", async () => [consoleErrors.length === 0, consoleErrors.join(" | ").slice(0, 300)]);

await browser.close();
console.log(`\n${browserName}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
