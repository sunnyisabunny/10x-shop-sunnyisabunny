// FULL outcome checks beyond the catalog: cart, promo, shipping and later features. Run by hand, not in CI: see tests/e2e/README.md.
// Usage: node tests/e2e/flow-full.mjs [baseUrl] [chromium|firefox|webkit]
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
const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const browser = await engines[browserName].launch();
const pageErrors = [];

/** A fresh browser profile, with a chosen cart already saved. */
async function freshPage(items = []) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript((saved) => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      if (saved.length > 0) localStorage.setItem("shop_cart", JSON.stringify({ items: saved, promoCode: null }));
    }
  }, items);
  const page = await context.newPage();
  // WebKit reports a fetch cancelled by navigating away as "...due to access control checks". A real CORS failure
  // would also leave the page without products, which the other checks would catch.
  page.on("pageerror", (e) => {
    if (!e.message.includes("due to access control checks")) pageErrors.push(e.message);
  });
  return page;
}
const line = (over) => ({ productId: 31, title: "Lemon", thumbnail: "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp", price: 10, discountPercentage: 0, stock: 50, quantity: 3, ...over });
async function logIn(page, base = BASE) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Username").fill("emilys");
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForSelector("[data-slot]");
}

// --- P4.4 promo code
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]); // subtotal 100
  await page.goto(`${BASE}/cart`);
  const summary = page.getByLabel("Order summary");
  await summary.waitFor();
  await eventually("P4.3 at $100 shipping is free", async () => [(await summary.innerText()).includes("Free")]);
  await page.getByLabel("Promo code").fill("abc");
  await page.getByRole("button", { name: "Apply" }).click();
  await eventually("P4.4 a wrong code shows the exact error", async () => [(await summary.innerText()).includes("Invalid promo code")]);
  await page.getByLabel("Promo code").fill("10x10");
  await page.getByRole("button", { name: "Apply" }).click();
  await eventually("P4.4 lowercase 10x10 works and shows the exact label", async () => [(await summary.innerText()).includes("Discount (10X10 −10%)")]);
  await eventually("P4.3 10% off $100 is $90 plus $10 shipping, so $100.00", async () => {
    const t = await summary.innerText();
    return [t.includes("−$10.00") && t.includes(money(10)) && t.includes(money(100)), t.replace(/\s+/g, " ")];
  });
  await page.reload();
  await summary.waitFor();
  await eventually("P4.4 the code survives a reload", async () => [(await summary.innerText()).includes("Discount (10X10 −10%)")]);
  await summary.getByRole("button", { name: "Remove" }).click();
  await eventually("P4.4 Remove takes the code off", async () => [!(await summary.innerText()).includes("10X10")]);
  await page.context().close();
}

// --- P4.3 shipping below the threshold
{
  const page = await freshPage([line({ price: 10, quantity: 3 })]); // subtotal 30
  await page.goto(`${BASE}/cart`);
  const summary = page.getByLabel("Order summary");
  await summary.waitFor();
  await eventually("P4.3 below $100 shipping costs $10, total $40", async () => {
    const t = await summary.innerText();
    return [t.includes(money(30)) && t.includes(money(10)) && t.includes(money(40)), t.replace(/\s+/g, " ")];
  });
  await page.context().close();
}

// --- P4 clear with the exact confirm text
{
  const page = await freshPage([line({})]);
  await page.goto(`${BASE}/cart`);
  await page.getByLabel("Order summary").waitFor();
  let confirmText = "";
  page.once("dialog", async (d) => {
    confirmText = d.message();
    await d.dismiss();
  });
  await page.getByRole("button", { name: "Clear cart" }).click();
  await eventually("P4 Clear cart asks with the exact text", async () => [confirmText === "Clear the cart? This cannot be undone.", confirmText]);
  await eventually("P4 dismissing keeps the cart", async () => [(await page.locator("main li").count()) === 1]);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Clear cart" }).click();
  await eventually("P4 accepting empties the cart", async () => [(await page.locator("main").innerText()).includes("Your cart is empty.")]);
  await page.context().close();
}

// --- P4 toasts and stock limits
{
  const page = await freshPage();
  await page.goto(`${BASE}/products/102`); // stock 1
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("P3 add shows the exact toast", async () => [(await page.locator("body").innerText()).includes("Added to cart ✓")]);
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("P3 over-stock shows the exact message", async () => [(await page.locator("body").innerText()).includes("Only 1 available. You already have 1 in your cart.")]);
  await page.goto(`${BASE}/cart`);
  await page.locator("main li").first().waitFor();
  await eventually("P4 stepper plus is disabled at the stock limit", async () => [await page.getByRole("button", { name: "One more" }).isDisabled()]);
  await page.getByRole("button", { name: "Remove" }).first().click();
  await eventually("P4 remove shows the exact toast", async () => [(await page.locator("body").innerText()).includes("Removed from cart")]);
  await page.context().close();
}

// --- two tabs stay in step
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const other = await page.context().newPage();
  await other.goto(`${BASE}/products/1`);
  await other.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("Review: a cart change in one tab reaches the other", async () => [(await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Cart" }).innerText()).includes("01")]);
  await page.context().close();
}

// --- P5 the total at checkout includes the promo and shipping
{
  const page = await freshPage([line({ price: 10, quantity: 3 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await eventually("P5 Checkout shows the same total as the Cart", async () => [(await page.getByLabel("Order summary").innerText()).includes(money(40))]);
  await page.context().close();
}

// --- P3.4 reviews
{
  const page = await freshPage();
  await page.goto(`${BASE}/products/78`);
  await page.getByRole("tab", { name: "Reviews (3)" }).waitFor();
  await eventually("P3.1 rating line shows average and count", async () => [(await page.locator("main").innerText()).includes("★ 4.7 · 3 reviews")]);
  await page.getByRole("tab", { name: "Reviews (3)" }).click();
  await page.getByRole("button", { name: "Submit review" }).click();
  await eventually("P3.4 empty review shows both exact errors", async () => {
    const t = await page.locator("main").innerText();
    return [t.includes("Please select a rating") && t.includes("Comment must be at least 10 characters")];
  });
  await page.getByLabel("Rating").selectOption("1");
  await page.getByLabel("Comment").fill("Far too heavy for the tray.");
  await page.getByRole("button", { name: "Submit review" }).click();
  await eventually("P3.4 success shows the exact toast", async () => [(await page.locator("body").innerText()).includes("Review added ✓")]);
  await eventually("P3.4 the new review is first and by Guest", async () => [(await page.locator('[role="tabpanel"] li').first().innerText()).includes("Guest")]);
  await eventually("P3.4 the form empties", async () => [(await page.getByLabel("Comment").inputValue()) === ""]);
  await eventually("P3.4 the average changes", async () => [(await page.locator("main").innerText()).includes("★ 3.8 · 4 reviews")]);
  await page.reload();
  await page.getByRole("tab", { name: "Reviews (4)" }).waitFor();
  await eventually("P3.4 the review survives a reload", async () => [(await page.locator("main").innerText()).includes("★ 3.8 · 4 reviews")]);
  await page.context().close();
}

// --- P3.5 related products
{
  const page = await freshPage();
  await page.goto(`${BASE}/products/78`);
  await page.getByRole("heading", { name: "Related products" }).waitFor();
  const related = page.locator("[data-slot]");
  await eventually("P3.5 four related products, without the current one", async () => [(await related.count()) === 4 && (await page.locator('[data-slot] a[href="/products/78"]').count()) === 0]);
  const firstHref = await related.first().getByRole("link").getAttribute("href");
  await related.first().getByRole("link").click();
  await page.waitForFunction((href) => location.pathname === href, firstHref, { polling: 100 });
  await eventually("P3.2 going to a related product really changes the data", async () => [(await page.locator("h1").innerText()) !== "Apple MacBook Pro 14 Inch Space Grey", await page.locator("h1").innerText()]);
  await page.context().close();
}

// --- single-photo products have no thumbnail row
{
  const page = await freshPage();
  await page.goto(`${BASE}/products/1`);
  await page.locator("h1").waitFor();
  await eventually("P3 a one-photo product has no thumbnail row", async () => [(await page.getByRole("button", { name: /Show photo/ }).count()) === 0]);
  await page.context().close();
}

/** Walks through Checkout's first two steps with valid values, ending on Review, where Place order is. */
async function fillCheckout(page, over = {}) {
  await page.getByLabel("Full name").fill("Emily Johnson");
  await page.getByLabel("Email").fill(over.email ?? "emily@example.com");
  await page.getByLabel("Phone").fill("+995 555 123 456");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Address", { exact: true }).fill("1 Rustaveli Avenue");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Postal code").fill(over.postal ?? "0108");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Place order" }).waitFor();
}

// --- P5.2 extra fields and blur validation
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  const main = () => page.locator("main").innerText();
  const summary = page.getByLabel("Order summary");
  const stepName = () => page.locator('[aria-current="step"]').innerText();
  await page.getByLabel("Phone").fill("12");
  await page.getByLabel("Phone").blur();
  await eventually("P0.5 leaving a field shows its error", async () => [(await main()).includes("Please enter a valid phone number")]);
  await eventually("P0.5 fields not reached yet stay quiet", async () => [!(await main()).includes("Full name must be")]);
  check("Steps: the first step is Contact", (await stepName()).includes("Contact"), await stepName());
  check("Steps: the order summary shows on Contact", await summary.isVisible());
  check("Steps: Place order isn't offered until Review", (await page.getByRole("button", { name: "Place order" }).count()) === 0);
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("P5.2 the Contact step's exact errors on an empty submit", async () => {
    const t = await main();
    return [["Full name must be at least 3 characters", "Please enter a valid email address", "Please enter a valid phone number"].every((x) => t.includes(x))];
  });
  check("Steps: errors keep you on the step", (await stepName()).includes("Contact"));
  check("Steps: later steps' errors stay quiet", !(await main()).includes("City is required"));
  await page.getByLabel("Full name").fill("Emily Johnson");
  await page.getByLabel("Email").fill("emily@example.com");
  await page.getByLabel("Phone").fill("+995 555 123 456");
  // Enter in a field means the same as the step's button.
  await page.getByLabel("Phone").press("Enter");
  await eventually("Steps: Enter moves on to Delivery", async () => [(await stepName()).includes("Delivery")]);
  await eventually("Steps: focus lands on the new step's heading", async () => [(await page.evaluate(() => document.activeElement?.tagName)) === "H2"]);
  check("Steps: the summary is still there", await summary.isVisible());
  await eventually("P5.2 Georgia is the default country", async () => [(await page.getByLabel("Country").inputValue()) === "Georgia"]);
  await eventually("P5.2 at least 5 countries are offered", async () => [(await page.getByLabel("Country").locator("option").count()) >= 6]);
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("P5.2 the Delivery step's exact errors", async () => {
    const t = await main();
    return [["Address must be at least 5 characters", "City is required", "Postal code must be 4-10 digits"].every((x) => t.includes(x))];
  });
  await page.getByLabel("Country").selectOption("");
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("P5.2 no country shows the exact error", async () => [(await main()).includes("Please select a country")]);
  await page.getByLabel("Address", { exact: true }).fill("1 Rustaveli Avenue");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Postal code").fill("0108");
  await page.getByLabel("Country").selectOption("Georgia");

  // Going back keeps everything typed, because it is all one form.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await eventually("Steps: Back keeps the first step's values", async () => [(await page.getByLabel("Full name").inputValue()) === "Emily Johnson"]);
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("Steps: forward again keeps the second step's values", async () => [(await page.getByLabel("Address", { exact: true }).inputValue()) === "1 Rustaveli Avenue"]);
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("Steps: Review shows what was typed", async () => {
    const t = await main();
    return [["Emily Johnson", "emily@example.com", "1 Rustaveli Avenue", "Tbilisi 0108", "Georgia"].every((x) => t.includes(x))];
  });
  check("Steps: the summary is on Review too", await summary.isVisible());
  await page.getByRole("button", { name: "Change delivery details" }).click();
  await eventually("Steps: Change goes back to that step", async () => [(await stepName()).includes("Delivery")]);
  await eventually("P5.2 no card fields anywhere", async () => [(await page.locator('input[name*="card" i], input[autocomplete^="cc-"], input[name*="cvv" i]').count()) === 0]);

  // The browser's own Back and Forward buttons move between steps, and keep what was typed.
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("Browser Back: back on Review", async () => [(await stepName()).includes("Review")]);
  await page.goBack();
  await eventually("Browser Back: goes back one step, staying on Checkout", async () => [new URL(page.url()).pathname === "/checkout" && (await stepName()).includes("Delivery"), await stepName()]);
  check("Browser Back: what was typed is still there", (await page.getByLabel("Address", { exact: true }).inputValue()) === "1 Rustaveli Avenue");
  await page.goForward();
  await eventually("Browser Forward: returns to Review", async () => [(await stepName()).includes("Review")]);

  // A reload keeps the step in history but loses the typing, so it can't show an empty Review.
  await page.reload();
  await page.waitForSelector("#fullName");
  await eventually("Reload: starts again from Contact, with no empty Review", async () => [(await stepName()).includes("Contact")]);
  await page.context().close();
}

// --- A double click must never place an order that nobody reviewed.
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  const stepName = () => page.locator('[aria-current="step"]').innerText();
  await page.getByLabel("Full name").fill("Emily Johnson");
  await page.getByLabel("Email").fill("emily@example.com");
  await page.getByLabel("Phone").fill("+995 555 123 456");
  await page.getByRole("button", { name: "Continue" }).dblclick();
  await eventually("Double click: Contact moves on one step", async () => [(await stepName()).includes("Delivery"), await stepName()]);
  check("Double click: Delivery isn't marked wrong", !(await page.locator("main").innerText()).includes("City is required"));
  await page.getByLabel("Address", { exact: true }).fill("1 Rustaveli Avenue");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Postal code").fill("0108");
  await page.getByRole("button", { name: "Continue" }).dblclick();
  await eventually("Double click: Delivery stops on Review", async () => [(await stepName()).includes("Review"), await stepName()]);
  await page.waitForTimeout(800);
  check("Double click: no order was placed", new URL(page.url()).pathname === "/checkout" && (await page.evaluate(() => localStorage.getItem("shop_orders"))) === null);
  await page.getByRole("button", { name: "Place order" }).dblclick();
  await eventually("Double click: Place order places one order", async () => [/\/orders\/\d+$/.test(new URL(page.url()).pathname)]);
  check("Double click: exactly one order", (await page.evaluate(() => JSON.parse(localStorage.getItem("shop_orders")).length)) === 1);
  await page.context().close();
}

// --- P6 orders
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await page.clock.install();
  await logIn(page);
  await page.getByRole("link", { name: "Orders" }).click();
  await eventually("P6.1 no orders shows the exact text", async () => [(await page.locator("main").innerText()).includes("You have no orders yet.") && (await page.getByRole("link", { name: "Browse products" }).count()) === 1]);

  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Place order" }).click();
  await page.clock.runFor(1000);
  await page.waitForFunction(() => location.pathname.startsWith("/orders/"), undefined, { polling: 100 });
  const body = () => page.locator("main").innerText();
  await eventually("P5.3 the exact Thank-you text shows", async () => [(await body()).includes("Thank you! Your order has been placed.")]);
  await eventually("P5.3 the total shows", async () => [(await body()).includes(money(100))]);
  await eventually("P5.3 the cart is empty and the counter hides", async () => [!/\d+ items?/.test(await page.getByRole("navigation", { name: "Main" }).textContent())]);
  await eventually("P6.3 the order number and heading", async () => [(await body()).includes("Order #10X-00001")]);
  await eventually("P6.3 the timeline shows Processing as current", async () => [(await body()).includes("Processing") && (await page.locator('[aria-current="step"]').innerText()).includes("Processing")]);
  await eventually("P6.3 the address shows", async () => [(await body()).includes("1 Rustaveli Avenue")]);
  await eventually("P6 no payment method is shown", async () => [!(await body()).includes("4242") && !(await body()).includes("Cash on delivery")]);

  const stored = await page.evaluate(() => localStorage.getItem("shop_orders"));
  await eventually("P6 no card data in the saved order", async () => [!/card|cvv|expiry/i.test(stored), stored.slice(0, 80)]);

  await page.getByRole("link", { name: "Orders" }).click();
  await eventually("P6.1 the new order is listed with its number", async () => [(await body()).includes("#10X-00001")]);
  await eventually("P6.1 starts as Processing", async () => [(await body()).includes("Processing")]);
  await page.clock.fastForward(90_000);
  await eventually("P6.2 becomes Shipped with no reload", async () => [(await body()).includes("Shipped"), await body()]);
  await page.clock.fastForward(120_000);
  await eventually("P6.2 becomes Delivered with no reload", async () => [(await body()).includes("Delivered"), await body()]);

  await page.getByRole("link", { name: /#10X-00001/ }).click();
  await page.getByRole("button", { name: "Reorder" }).waitFor();
  await page.getByRole("button", { name: "Reorder" }).click();
  await page.waitForFunction(() => location.pathname === "/cart", undefined, { polling: 100 });
  await eventually("P6 Reorder shows the exact toast", async () => [(await page.locator("body").innerText()).includes("Items added to cart ✓")]);
  await eventually("P6 Reorder adds the same items and quantities", async () => [(await page.locator("main li").count()) === 1 && (await page.locator("main").innerText()).includes("2 items")]);

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForFunction(() => location.pathname === "/", undefined, { polling: 100 });
  await eventually("P0 logout from elsewhere lands on the catalog", async () => [new URL(page.url()).pathname === "/"]);
  await page.getByRole("link", { name: "Log in" }).click();
  await page.getByLabel("Username").fill("emilys");
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByRole("link", { name: "Orders" }).click();
  await eventually("P6 orders survive logging out and back in", async () => [(await body()).includes("#10X-00001")]);

  // A second order gets the next number.
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Place order" }).click();
  await page.clock.runFor(1000);
  await eventually("P6 the next order is 10X-00002", async () => [(await body()).includes("Order #10X-00002")]);
  await page.getByRole("link", { name: "Orders" }).click();
  await eventually("P6.1 newest order first", async () => [(await page.locator("main li").first().innerText()).includes("#10X-00002")]);

  await page.evaluate(() => {
    history.pushState({}, "", "/orders/123456");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await eventually("P6 an unknown order shows NotFound", async () => [(await body()).includes("Page not found")]);
  await page.context().close();
}

// --- P5.3 a failed save keeps the form and the cart
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await fillCheckout(page);
  await page.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "shop_orders") throw new DOMException("Full", "QuotaExceededError");
      return real.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Place order" }).click();
  await eventually("P5.3 a failed save shows an inline message", async () => [(await page.locator("main").innerText()).includes("Your order could not be placed.")]);
  await eventually("P5.3 the form keeps what was typed", async () => [(await page.locator("main").innerText()).includes("Emily Johnson")]);
  await eventually("P5.3 the button works again", async () => [await page.getByRole("button", { name: "Place order" }).isEnabled()]);
  await eventually("P5.3 the cart isn't emptied", async () => [(await page.getByLabel("Order summary").innerText()).includes(money(100))]);
  await page.context().close();
}

// --- A field's error disappearing must not move the button away from under the mouse (DEBUG-LOG)
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await page.getByLabel("Full name").fill("Emily Johnson");
  await page.getByLabel("Email").fill("emily@example.com");
  await page.getByLabel("Phone").fill("+995 555 123 456");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Address", { exact: true }).fill("1 Rustaveli Avenue");
  await page.getByLabel("City").fill("Tbilisi");
  const postal = page.getByLabel("Postal code");
  await postal.fill("1");
  await page.getByLabel("City").focus();
  await eventually("Layout: the bad postal code shows its error", async () => [(await page.locator("main").innerText()).includes("Postal code must be 4-10 digits")]);
  await postal.fill("0100");
  // The mouse goes straight from the corrected field to the button, one click.
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("Layout: one click on the button is enough after fixing a field", async () => [(await page.getByRole("button", { name: "Place order" }).count()) === 1]);
  await page.context().close();
}

// --- P1 FULL: Formik and Yup on Login, Sign Up and password reset
{
  const page = await freshPage();
  const main = () => page.locator("main").innerText();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Username").waitFor();
  check("P1 an untouched form shows no errors", !(await main()).includes("is required"));
  await page.getByLabel("Username").focus();
  await page.getByLabel("Password").focus();
  await eventually("P1 Username is checked on leaving it", async () => [(await main()).includes("Username is required")]);
  check("P1 Password isn't checked yet, because it hasn't been left", !(await main()).includes("Password is required"));
  await page.evaluate(() => (window.noReload = true));
  await page.getByRole("button", { name: "Log In" }).click();
  await eventually("P1 empty submit shows the exact Password error", async () => [(await main()).includes("Password is required")]);
  check("P1 an empty password doesn't show the length error", !(await main()).includes("Password must be at least"));
  check("P1 submitting doesn't reload the page", await page.evaluate(() => window.noReload === true));
  await page.getByLabel("Username").fill("   ");
  await page.getByLabel("Password").fill("12345");
  await eventually("P1 a short password shows the exact error", async () => [(await main()).includes("Password must be at least 6 characters")]);
  await eventually("P1 spaces don't count as a username", async () => [(await main()).includes("Username is required")]);
  await page.getByLabel("Username").fill("  emilys ");
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await eventually("P1 a valid form logs in and goes to the catalog", async () => [new URL(page.url()).pathname === "/"]);
  await eventually("P1 the username is trimmed", async () => [(await page.locator("header").innerText()).includes("emilys")]);
  await eventually("P1 logging in says so", async () => [(await page.locator("body").innerText()).includes("Logged in as emilys.")]);
  check("P1 only the trimmed username is saved", (await page.evaluate(() => localStorage.getItem("shop_user"))) === '{"username":"emilys"}');
  await page.context().close();

  // Sign Up, arriving from a protected page, so the way back has to survive the link between the two forms.
  const signUp = await freshPage([line({ price: 50, quantity: 2 })]);
  const form = () => signUp.locator("main").innerText();
  await signUp.goto(`${BASE}/checkout`);
  await signUp.getByRole("link", { name: "Create an account" }).click();
  await signUp.getByRole("button", { name: "Sign Up" }).click();
  for (const message of ["Username is required", "Please enter a valid email address", "Password is required", "Please confirm your password"]) {
    await eventually(`Sign Up empty: ${message}`, async () => [(await form()).includes(message)]);
  }
  await signUp.getByLabel("Username").fill("newuser");
  await signUp.getByLabel("Email").fill("not-an-email");
  await signUp.getByLabel("Password", { exact: true }).fill("secretpass");
  await signUp.getByLabel("Confirm password").fill("different");
  await eventually("Sign Up: a bad email is refused", async () => [(await form()).includes("Please enter a valid email address")]);
  await eventually("Sign Up: different passwords are refused", async () => [(await form()).includes("Passwords do not match")]);
  await signUp.getByLabel("Email").fill("new@example.com");
  await signUp.getByLabel("Confirm password").fill("secretpass");
  await signUp.getByRole("button", { name: "Sign Up" }).click();
  await eventually("Sign Up: it logs in and returns to Checkout", async () => [new URL(signUp.url()).pathname === "/checkout"]);
  await eventually("Sign Up: the Header shows the username", async () => [(await signUp.locator("header").innerText()).includes("newuser")]);
  const everything = await signUp.evaluate(() => JSON.stringify(localStorage));
  check("Sign Up: no password anywhere in storage", !everything.includes("secretpass") && !/password/i.test(everything), everything);
  check("Sign Up: no accounts key exists", !everything.includes("shop_accounts"));
  check("Sign Up: the email is kept", (await signUp.evaluate(() => JSON.parse(localStorage.getItem("shop_profile")).newuser.email)) === "new@example.com");
  await signUp.evaluate(() => {
    history.pushState({}, "", "/profile");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await eventually("Sign Up: Profile starts with that email", async () => [(await signUp.getByLabel("Email").inputValue()) === "new@example.com"]);
  await signUp.context().close();

  // Password reset
  const reset = await freshPage();
  await reset.goto(`${BASE}/login`);
  await reset.getByRole("link", { name: "Forgot your password?" }).click();
  await reset.getByRole("button", { name: "Send reset link" }).click();
  await eventually("Reset: an empty email is refused", async () => [(await reset.locator("main").innerText()).includes("Please enter a valid email address")]);
  await reset.getByLabel("Email").fill("someone@example.com");
  await reset.getByRole("button", { name: "Send reset link" }).click();
  await eventually("Reset: it says plainly that it is simulated", async () => [(await reset.locator("main").innerText()).includes("This is simulated, so no email was sent")]);
  check("Reset: it stores nothing", (await reset.evaluate(() => JSON.stringify(localStorage))).includes("someone@example.com") === false);
  await reset.context().close();
}

// --- O1 route-level code splitting: pages arrive only when opened
{
  const page = await freshPage();
  const scripts = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url().split("/").pop());
  });
  const loaded = (start) => scripts.some((name) => name.startsWith(start));
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  check("O1 the first load includes the catalog's chunk", loaded("CatalogPage"), scripts.join(" "));
  check("O1 the first load has no Orders code", !loaded("OrdersPage"));
  check("O1 the first load has no Formik or Yup", !loaded("authSchemas"));
  await page.getByRole("link", { name: "Log in" }).click();
  await eventually("O1 opening Login downloads its chunk", async () => [loaded("LoginPage")]);
  await eventually("O1 and with it Formik and Yup", async () => [loaded("authSchemas")]);
  await page.getByLabel("Username").fill("emilys");
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByRole("link", { name: "Orders" }).waitFor();
  check("O1 Orders isn't downloaded until it is opened", !loaded("OrdersPage"));
  await page.getByRole("link", { name: "Orders" }).click();
  await eventually("O1 opening Orders downloads its chunk", async () => [loaded("OrdersPage")]);
  await page.context().close();

  // A page's code can fail to download, such as after a new deploy or on a bad connection.
  const broken = await freshPage();
  await broken.route(/ProductPage-.*\.js/, (route) => route.abort());
  await broken.goto(`${BASE}/`);
  await broken.waitForSelector("[data-slot]");
  await broken.locator("[data-slot] a").first().click();
  await eventually("O1 a chunk that fails to download shows the error fallback", async () => [(await broken.locator("main").innerText()).includes("Something went wrong.")]);
  await eventually("O1 the Header still works around it", async () => [(await broken.getByRole("link", { name: "Catalog" }).count()) === 1]);
  await broken.context().close();

  // The SPA rewrite must not swallow robots.txt (DEBUG-LOG 12).
  const robots = await freshPage();
  const response = await robots.request.get(`${BASE}/robots.txt`);
  check("O1 robots.txt is a real text file", (await response.text()).startsWith("User-agent:"));
  await robots.context().close();
}

// --- second review round: reproduced here before the fix
{
  // The way back to Checkout must survive a detour through "Forgot your password?".
  const detour = await freshPage([line({ price: 50, quantity: 2 })]);
  await detour.goto(`${BASE}/checkout`);
  await detour.getByRole("link", { name: "Forgot your password?" }).click();
  await detour.getByRole("link", { name: "Back to login" }).click();
  await detour.getByLabel("Username").fill("emilys");
  await detour.getByLabel("Password").fill("emilyspass");
  await detour.getByRole("button", { name: "Log In" }).click();
  await eventually("Detour: login still returns to Checkout", async () => [new URL(detour.url()).pathname === "/checkout", detour.url()]);

  // Someone already logged in has no use for the login form.
  await detour.goto(`${BASE}/login`);
  await eventually("Logged in: /login goes to the catalog", async () => [new URL(detour.url()).pathname === "/", detour.url()]);
  await detour.goto(`${BASE}/signup`);
  await eventually("Logged in: /signup goes to the catalog", async () => [new URL(detour.url()).pathname === "/", detour.url()]);

  // Logging out in one tab logs out the other tab too.
  const other = await detour.context().newPage();
  other.on("pageerror", (e) => pageErrors.push(e.message));
  await other.goto(`${BASE}/`);
  await other.waitForSelector("[data-slot]");
  await detour.getByRole("button", { name: "Log out" }).first().click();
  await eventually("Tabs: logging out reaches the other tab", async () => [(await other.getByRole("link", { name: "Log in" }).count()) === 1]);
  await detour.context().close();

  // Sign Up must not take over a username that already has a profile here.
  const taken = await freshPage();
  await taken.addInitScript(() => {
    localStorage.setItem("shop_profile", JSON.stringify({ alice: { firstName: "Alice", lastName: "Smith", email: "alice@example.com", phone: "" } }));
  });
  const signUpAs = async (page, username) => {
    await page.goto(`${BASE}/signup`);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel("Password", { exact: true }).fill("secretpass");
    await page.getByLabel("Confirm password").fill("secretpass");
    await page.getByRole("button", { name: "Sign Up" }).click();
  };
  await signUpAs(taken, "alice");
  await eventually("Sign Up: a taken username is refused", async () => [(await taken.locator("main").innerText()).includes("already taken")]);
  check("Sign Up: the old email is untouched", (await taken.evaluate(() => JSON.parse(localStorage.getItem("shop_profile")).alice.email)) === "alice@example.com");
  check("Sign Up: nobody got logged in", (await taken.evaluate(() => localStorage.getItem("shop_user"))) === null);
  await taken.context().close();

  // A failed email save must not be reported as a clean success.
  const full = await freshPage();
  await full.goto(`${BASE}/signup`);
  await full.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "shop_profile") throw new DOMException("Full", "QuotaExceededError");
      return real.call(this, key, value);
    };
  });
  await full.getByLabel("Username").fill("newuser");
  await full.getByLabel("Email").fill("someone@example.com");
  await full.getByLabel("Password", { exact: true }).fill("secretpass");
  await full.getByLabel("Confirm password").fill("secretpass");
  await full.getByRole("button", { name: "Sign Up" }).click();
  await eventually("Sign Up: full storage is reported", async () => [(await full.locator("body").innerText()).includes("could not be saved")]);
  await full.context().close();

  // Saved reviews are outside input too: a __proto__ key must not break every product page.
  const edited = await freshPage();
  await edited.addInitScript(() => {
    localStorage.setItem("shop_reviews", '{"__proto__":[{"rating":5,"comment":"Edited by hand","date":"2026-11-05T10:00:00.000Z","reviewerName":"X"},{"rating":5,"comment":"Edited by hand","date":"2026-11-05T10:00:00.000Z","reviewerName":"X"}]}');
  });
  await edited.goto(`${BASE}/products/1`);
  await eventually("Reviews: an edited __proto__ key doesn't crash the page", async () => [(await edited.getByRole("tab", { name: /Reviews/ }).count()) === 1 && !(await edited.locator("main").innerText()).includes("Something went wrong.")]);
  await edited.context().close();

  // Checkout: spaces around a value pass the check, so they mustn't be saved.
  const spaces = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(spaces);
  await spaces.getByRole("link", { name: "Cart" }).first().click();
  await spaces.getByRole("button", { name: "Proceed to checkout" }).click();
  await spaces.waitForSelector("#fullName");
  await fillCheckout(spaces, { email: "  emily@example.com ", postal: " 0100 " });
  await spaces.getByRole("button", { name: "Place order" }).click();
  await eventually("Checkout: the order is placed", async () => [/\/orders\/\d+$/.test(new URL(spaces.url()).pathname)]);
  const saved = await spaces.evaluate(() => JSON.parse(localStorage.getItem("shop_orders"))[0].shipping);
  check("Checkout: saved values are trimmed", saved.email === "emily@example.com" && saved.postalCode === "0100", JSON.stringify(saved));
  await spaces.context().close();

  // Checkout's summary is read-only, so the order saved can't differ from the total on screen.
  const promo = await freshPage();
  await promo.addInitScript((item) => {
    if (!localStorage.getItem("shop_cart")) localStorage.setItem("shop_cart", JSON.stringify({ items: [item], promoCode: "10X10" }));
  }, line({ price: 50, quantity: 2 }));
  await logIn(promo);
  await promo.getByRole("link", { name: "Cart" }).first().click();
  await promo.getByRole("button", { name: "Proceed to checkout" }).click();
  await promo.waitForSelector("#fullName");
  await eventually("Checkout: the summary shows the promo", async () => [(await promo.getByLabel("Order summary").innerText()).includes("Discount (10X10 −10%)")]);
  check("Checkout: the promo can't be removed here", (await promo.getByLabel("Order summary").getByRole("button", { name: "Remove" }).count()) === 0);
  await promo.context().close();
}

// --- review findings: each of these was reproduced here before the fix

// A failed save must not leave the order behind in memory, or the retry saves it twice.
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await fillCheckout(page);
  await page.evaluate(() => {
    window.realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "shop_orders") throw new DOMException("Full", "QuotaExceededError");
      return window.realSetItem.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Place order" }).click();
  await eventually("Retry: the first attempt fails", async () => [(await page.locator("main").innerText()).includes("Your order could not be placed.")]);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.realSetItem;
  });
  await page.getByRole("button", { name: "Place order" }).click();
  await eventually("Retry: the second attempt lands on the order", async () => [/\/orders\/\d+$/.test(new URL(page.url()).pathname)]);
  const orders = await page.evaluate(() => JSON.parse(localStorage.getItem("shop_orders")));
  check("Retry: exactly one order is saved", orders.length === 1, `${orders.length} saved`);
  check("Retry: it is numbered 10X-00001", orders[0]?.number === "10X-00001", orders.map((order) => order.number).join(", "));
  await page.context().close();
}

// Two tabs must not undo each other's saved data.
{
  // An order placed in one tab empties the shared cart, so a Checkout open in another tab goes back to the cart.
  const tabA = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(tabA);
  await tabA.getByRole("link", { name: "Cart" }).first().click();
  await tabA.getByRole("button", { name: "Proceed to checkout" }).click();
  await tabA.waitForSelector("#fullName");
  const tabB = await tabA.context().newPage();
  tabB.on("pageerror", (e) => pageErrors.push(e.message));
  await tabB.goto(`${BASE}/checkout`);
  await tabB.waitForSelector("#fullName");
  await fillCheckout(tabB);
  await tabB.getByRole("button", { name: "Place order" }).click();
  await eventually("Tabs: tab B places its order", async () => [/\/orders\/\d+$/.test(new URL(tabB.url()).pathname)]);
  await eventually("Tabs: the Checkout in tab A follows the emptied cart", async () => [new URL(tabA.url()).pathname === "/cart"]);
  await tabA.context().close();

  // Reviews written in two tabs must both survive.
  const reviewA = await freshPage();
  await reviewA.goto(`${BASE}/products/1`);
  await reviewA.getByRole("tab", { name: /Reviews/ }).click();
  const reviewB = await reviewA.context().newPage();
  reviewB.on("pageerror", (e) => pageErrors.push(e.message));
  await reviewB.goto(`${BASE}/products/2`);
  await reviewB.getByRole("tab", { name: /Reviews/ }).click();
  for (const [tab, comment] of [[reviewB, "Written in the second tab"], [reviewA, "Written in the first tab"]]) {
    await tab.getByLabel("Rating").selectOption("5");
    await tab.getByLabel("Comment").fill(comment);
    await tab.getByRole("button", { name: "Submit review" }).click();
    await eventually(`Tabs: the review is added (${comment})`, async () => [(await tab.locator("main").innerText()).includes(comment)]);
  }
  const reviews = await reviewA.evaluate(() => JSON.parse(localStorage.getItem("shop_reviews")));
  check("Tabs: both reviews survive", reviews[1]?.length === 1 && reviews[2]?.length === 1, JSON.stringify(Object.keys(reviews)));
  await reviewA.context().close();

  // An open Orders tab shows an order placed in another tab, without a reload.
  const first = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(first);
  await first.goto(`${BASE}/orders`);
  await first.waitForSelector("h1");
  const second = await first.context().newPage();
  await second.goto(`${BASE}/checkout`);
  await second.waitForSelector("#fullName");
  await fillCheckout(second);
  await second.getByRole("button", { name: "Place order" }).click();
  await eventually("Tabs: the other tab's order appears in the open Orders tab", async () => [(await first.locator("main").innerText()).includes("10X-00001")]);
  await first.context().close();
}

// "Any username works", including names that match built-in object properties.
for (const username of ["constructor", "__proto__"]) {
  const page = await freshPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForSelector("[data-slot]");
  const header = () => page.locator("header").innerText();
  await eventually(`Username ${username}: the Header shows it`, async () => [(await header()).includes(username) && !(await header()).includes("undefined"), await header()]);
  await page.getByRole("link", { name: "Profile" }).click();
  await page.waitForSelector("#firstName");
  await page.getByLabel("First name").fill("Emily");
  await page.getByLabel("Last name").fill("Johnson");
  await page.getByLabel("Email").fill("emily@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await eventually(`Username ${username}: the profile saves`, async () => [(await header()).includes("Emily Johnson")]);
  await page.reload();
  await page.waitForSelector("#firstName");
  await eventually(`Username ${username}: the profile survives a reload`, async () => [(await page.getByLabel("First name").inputValue()) === "Emily"]);
  await page.context().close();
}

// Success messages must be true: storage can be full.
{
  const page = await freshPage();
  await logIn(page);
  await page.getByRole("link", { name: "Profile" }).click();
  await page.waitForSelector("#firstName");
  await page.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "shop_profile" || key === "shop_reviews") throw new DOMException("Full", "QuotaExceededError");
      return real.call(this, key, value);
    };
  });
  await page.getByLabel("First name").fill("Emily");
  await page.getByLabel("Last name").fill("Johnson");
  await page.getByLabel("Email").fill("emily@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await eventually("Full storage: Profile says it could not save", async () => [(await page.locator("body").innerText()).includes("could not be saved")]);
  check("Full storage: Profile doesn't claim success", !(await page.locator("body").innerText()).includes("Changes saved ✓"));
  await page.evaluate(() => {
    history.pushState({}, "", "/products/1");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByRole("tab", { name: /Reviews/ }).click();
  await page.getByLabel("Rating").selectOption("5");
  await page.getByLabel("Comment").fill("A very good lemon indeed");
  await page.getByRole("button", { name: "Submit review" }).click();
  await eventually("Full storage: the review says it could not save", async () => [(await page.locator("body").innerText()).includes("could not be saved")]);
  check("Full storage: the review doesn't claim success", !(await page.locator("body").innerText()).includes("Review added ✓"));
  check("Full storage: the typed comment is kept", (await page.getByLabel("Comment").inputValue()) === "A very good lemon indeed");
  await page.context().close();
}

// Saved data is outside input: only the real promo code may give a discount.
{
  const page = await freshPage();
  await page.addInitScript((item) => {
    localStorage.setItem("shop_cart", JSON.stringify({ items: [item], promoCode: "ANYTHING" }));
  }, line({ price: 50, quantity: 2 }));
  await page.goto(`${BASE}/cart`);
  const summary = page.getByLabel("Order summary");
  await summary.waitFor();
  await eventually("Promo: a hand-edited code gives no discount", async () => [!(await summary.innerText()).includes("ANYTHING") && (await summary.innerText()).includes(money(100))]);
  await page.context().close();
}

// Reorder must add what fits and must say what really happened.
{
  const order = {
    id: 1,
    number: "10X-00001",
    items: [line({ productId: 31, price: 50, quantity: 3, stock: 3 })],
    shipping: { fullName: "Emily", email: "emily@example.com", phone: "+995555123456", address: "A street", city: "Tbilisi", postalCode: "0100", country: "Georgia" },
    subtotal: 150,
    discount: 0,
    shippingCost: 0,
    total: 150,
    placedAt: "2026-11-05T10:00:00.000Z",
  };
  for (const [inCart, expected, message, name] of [
    [1, 3, "Items added to cart ✓ Some were limited by stock.", "adds only what fits"],
    [3, 3, "Nothing added", "says when nothing fits"],
  ]) {
    const page = await freshPage([line({ productId: 31, price: 50, quantity: inCart, stock: 3 })]);
    await page.addInitScript((saved) => localStorage.setItem("shop_orders", JSON.stringify([saved])), order);
    await logIn(page);
    await page.evaluate(() => {
      history.pushState({}, "", "/orders/1");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.getByRole("button", { name: "Reorder" }).click();
    await eventually(`Reorder ${name}: the message is true`, async () => [(await page.locator("body").innerText()).includes(message), (await page.locator("body").innerText()).slice(0, 80)]);
    await eventually(`Reorder ${name}: the cart holds ${expected}`, async () => [(await page.evaluate(() => JSON.parse(localStorage.getItem("shop_cart")).items[0].quantity)) === expected]);
    await page.context().close();
  }
}

// The Thank-you banner belongs to the moment of ordering, not to every later visit.
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await logIn(page);
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await page.waitForSelector("#fullName");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Place order" }).click();
  const main = () => page.locator("main").innerText();
  await eventually("Banner: it shows after placing the order", async () => [(await main()).includes("Thank you! Your order has been placed.")]);
  // The effect clears the mark just after the banner paints. WebKit's reload can be fast enough to beat it, which no person can.
  await eventually("Banner: the mark is cleared from history", async () => [await page.evaluate(() => history.state?.usr === null)]);
  await page.reload();
  await page.waitForSelector("h1");
  await eventually("Banner: a reload shows the order", async () => [(await main()).includes("Order #10X-00001")]);
  check("Banner: a reload doesn't thank you again", !(await main()).includes("Thank you!"));
  await page.context().close();
}

// The phone's browser bar follows the theme.
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const barColor = () => page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  const dark = await barColor();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await eventually("Bar: the colour changes with the theme", async () => [(await barColor()) !== dark]);
  const light = await barColor();
  await page.reload();
  await page.waitForSelector("[data-slot]");
  check("Bar: a reload keeps it", (await barColor()) === light);
  await page.context().close();
}

// --- P0.4 the theme
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const background = () => page.evaluate(() => getComputedStyle(document.querySelector("header")).backgroundColor);
  await eventually("P0.4 the shop opens dark", async () => [(await theme()) === "dark"]);
  const darkBackground = await background();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await eventually("P0.4 the button changes data-theme", async () => [(await theme()) === "light"]);
  await eventually("P0.4 the colours really change", async () => [(await background()) !== darkBackground]);
  await eventually('P0.4 shop_theme holds "light"', async () => [(await page.evaluate(() => localStorage.getItem("shop_theme"))) === '"light"']);
  await page.reload();
  await page.waitForSelector("[data-slot]");
  await eventually("P0.4 the theme survives a reload", async () => [(await theme()) === "light"]);
  await eventually("P0.4 there is no rain in the light theme", async () => [(await page.evaluate(() => getComputedStyle(document.querySelector(".rain")).display)) === "none"]);

  // With the app's JavaScript blocked, only the small script in index.html can set the theme, so this proves it runs before React.
  await page.route(/\/(assets|src)\//, (route) => (route.request().resourceType() === "script" ? route.abort() : route.continue()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await eventually("P0.4 the saved theme is applied before React loads (no flash)", async () => [(await theme()) === "light"]);
  await page.unroute(/\/(assets|src)\//);
  await page.context().close();

  const broken = await freshPage();
  await broken.addInitScript(() => localStorage.setItem("shop_theme", "{broken"));
  await broken.goto(`${BASE}/`);
  await broken.waitForSelector("[data-slot]");
  await eventually("P0.4 a broken saved theme falls back to dark", async () => [(await broken.evaluate(() => document.documentElement.dataset.theme)) === "dark"]);
  await broken.context().close();
}

// --- P7 the profile
{
  const page = await freshPage([line({ price: 50, quantity: 2 })]);
  await page.goto(`${BASE}/profile`);
  await eventually("P7 a guest on /profile goes to /login", async () => [new URL(page.url()).pathname === "/login"]);
  await page.getByLabel("Username").fill("emilys");
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await eventually("P7 after login the guest lands back on /profile", async () => [new URL(page.url()).pathname === "/profile"]);
  const main = () => page.locator("main").innerText();
  const header = () => page.locator("header").innerText();
  await eventually("P7 Profile shows the username", async () => [(await main()).includes("emilys")]);

  await page.getByRole("button", { name: "Save changes" }).click();
  for (const message of ["First name must be at least 2 characters", "Last name must be at least 2 characters", "Please enter a valid email address"]) {
    await eventually(`P7.2 exact error: ${message}`, async () => [(await main()).includes(message)]);
  }
  await page.getByLabel("Phone").fill("123");
  await page.getByLabel("First name").focus();
  await eventually("P7.2 Phone is checked on leaving it", async () => [(await main()).includes("Please enter a valid phone number")]);
  await page.getByLabel("Phone").fill("");
  await page.getByLabel("First name").fill("  Emily ");
  await page.getByLabel("Last name").fill("Johnson");
  await page.getByLabel("Email").fill("emily@example.com");
  await page.getByRole("button", { name: "Save changes" }).click();
  await eventually("P7.2 an empty Phone is fine, and saving says so", async () => [(await page.locator("body").innerText()).includes("Changes saved ✓")]);
  await eventually("P7 the Header shows the new name", async () => [(await header()).includes("Emily Johnson")]);
  await eventually("P7 the saved name is trimmed", async () => [(await page.getByLabel("First name").inputValue()) === "Emily"]);

  // The login and the profile survive a reload, and nothing about a password is saved anywhere.
  await page.reload();
  await page.waitForSelector("#firstName");
  await eventually("P7 the login survives a reload", async () => [new URL(page.url()).pathname === "/profile"]);
  await eventually("P7 the profile survives a reload", async () => [(await page.getByLabel("Last name").inputValue()) === "Johnson"]);
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  check("A1.5 no password anywhere in localStorage", !saved.includes("emilyspass") && !/password/i.test(saved), saved);
  check("A1.5 shop_user holds the username only", (await page.evaluate(() => localStorage.getItem("shop_user"))) === '{"username":"emilys"}');

  // The theme switch on this page is the same one as in the Header.
  await page.getByRole("button", { name: "Switch to light theme" }).first().click();
  await eventually("P7 the Profile switch changes the theme", async () => [(await page.evaluate(() => document.documentElement.dataset.theme)) === "light"]);
  await eventually("P7 both switches show the same state", async () => [(await page.getByRole("button", { name: "Switch to dark theme" }).count()) === 2]);

  // Clear local data: first with some real data in place.
  await page.evaluate(() => {
    localStorage.setItem("shop_reviews", JSON.stringify({ 1: [{ rating: 5, comment: "Very good lemon", date: "2026-11-05T10:00:00.000Z", reviewerName: "Emily" }] }));
    localStorage.setItem(
      "shop_orders",
      JSON.stringify([
        {
          id: 1,
          number: "10X-00001",
          items: [],
          shipping: { fullName: "Emily", email: "emily@example.com", phone: "", address: "A street", city: "Tbilisi", postalCode: "0100", country: "Georgia" },
          subtotal: 10,
          discount: 0,
          shippingCost: 10,
          total: 20,
          placedAt: "2026-11-05T10:00:00.000Z",
        },
      ]),
    );
  });
  await page.reload();
  await page.waitForSelector("#firstName");
  await eventually("P7 Profile shows the order count", async () => [(await main()).includes("with 1 order.")]);
  await eventually("P7 the cart badge shows before clearing", async () => [/\d+ items?/.test(await header())]);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Clear local data" }).click();
  await eventually("P7 cancelling the confirm clears nothing", async () => [(await page.evaluate(() => localStorage.getItem("shop_reviews"))) !== null]);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear local data" }).click();
  await eventually("P7 Clear local data empties the saved orders", async () => [(await page.evaluate(() => localStorage.getItem("shop_orders"))) === null]);
  await eventually("P7 Clear local data empties the saved reviews", async () => [(await page.evaluate(() => localStorage.getItem("shop_reviews"))) === null]);
  await eventually("P7 Clear local data empties the saved cart", async () => [(await page.evaluate(() => JSON.parse(localStorage.getItem("shop_cart")).items.length)) === 0]);
  await eventually("P7 the order count on the page updates at once", async () => [(await main()).includes("with 0 orders")]);
  await eventually("P7 the cart badge hides at once", async () => [!/\d+ items?/.test(await header())]);
  check("P7 the session is kept", new URL(page.url()).pathname === "/profile" && (await page.evaluate(() => localStorage.getItem("shop_user"))) !== null);
  check("P7 the theme is kept", (await page.evaluate(() => localStorage.getItem("shop_theme"))) === '"light"');
  await page.reload();
  await page.waitForSelector("#firstName");
  await eventually("P7 the empty cart stays empty after a reload (the provider doesn't write it back)", async () => [!/\d+ items?/.test(await header())]);

  // A1.3 step 6: edit, log out, log back in, and everything is still there.
  await page.getByRole("button", { name: "Log out" }).first().click();
  await eventually("P0.3 Log out on Profile lands on the catalog", async () => [new URL(page.url()).pathname === "/"]);
  await eventually("P0.3 the guest sees no Profile link", async () => [!(await header()).includes("Profile")]);
  check("P0.3 logging out removes the saved login", (await page.evaluate(() => localStorage.getItem("shop_user"))) === null);
  await page.getByRole("link", { name: "Log in" }).click();
  await page.getByLabel("Username").fill("emilys");
  await page.getByLabel("Password").fill("emilyspass");
  await page.getByRole("button", { name: "Log In" }).click();
  await eventually("A1.3 after logging back in, the profile name is back", async () => [(await header()).includes("Emily Johnson")]);
  await page.context().close();
}

await eventually("No uncaught page errors", async () => [pageErrors.length === 0, pageErrors.join(" | ")], 0);
await browser.close();
console.log(`\n${browserName}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
