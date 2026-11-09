// BONUS outcome checks. Run by hand, not in CI: see tests/e2e/README.md. Usage: node tests/e2e/flow-bonus.mjs [baseUrl] [chromium|firefox|webkit]
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The printed invoice and the price filter's screenshots land here. Git ignores this folder.
const OUTPUT = fileURLToPath(new URL("./output/", import.meta.url));
mkdirSync(OUTPUT, { recursive: true });

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
async function freshPage(width = 1280, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on("pageerror", (e) => {
    if (!e.message.includes("due to access control checks")) pageErrors.push(e.message);
  });
  return page;
}
const search = (page) => new URL(page.url()).search;
const columnCount = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-slot]")];
  return cards.filter((card) => card.getBoundingClientRect().top === cards[0].getBoundingClientRect().top).length;
});

// --- Grid and list view
{
  const page = await freshPage();
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("dummyjson.com/products?")) requests.push(request.url());
  });
  await page.goto(`${BASE}/?page=2`);
  await page.waitForSelector("[data-slot]");
  check("View: it starts as a grid", (await columnCount(page)) === 4);
  check("View: Grid is marked as on", (await page.getByRole("button", { name: "Grid view" }).getAttribute("aria-pressed")) === "true");
  const before = requests.length;
  await page.getByRole("button", { name: "List view" }).click();
  await eventually("View: the URL holds it", async () => [search(page).includes("view=list"), search(page)]);
  await eventually("View: one column", async () => [(await columnCount(page)) === 1]);
  check("View: List is marked as on", (await page.getByRole("button", { name: "List view" }).getAttribute("aria-pressed")) === "true");
  check("View: it keeps the page", search(page).includes("page=2"), search(page));
  check("View: switching sends no new request", requests.length === before, `${requests.length - before} extra`);
  const row = await page.locator("[data-slot]").first().boundingBox();
  const button = await page.locator("[data-slot]").first().getByRole("button", { name: "Add to cart" }).boundingBox();
  check("View: the button sits on the right of the row", button.x > row.x + row.width / 2, JSON.stringify({ row, button }));
  check("View: buttons stay 44px tall", button.height >= 44, String(button.height));
  await page.reload();
  await page.waitForSelector("[data-slot]");
  check("View: a reload keeps it", (await columnCount(page)) === 1);
  await page.getByLabel("Category").selectOption("laptops");
  await eventually("View: a filter keeps it", async () => [search(page).includes("view=list") && search(page).includes("category=laptops"), search(page)]);
  await page.locator("[data-slot]").first().getByRole("button", { name: "Add to cart" }).click();
  await eventually("View: Add to cart still works in a row", async () => [(await page.locator("body").innerText()).includes("Added to cart ✓")]);
  await page.locator("[data-slot] a").first().click();
  await eventually("View: a row still opens the product", async () => [/\/products\/\d+$/.test(new URL(page.url()).pathname)]);
  await page.goBack();
  await page.waitForSelector("[data-slot]");
  await page.getByRole("button", { name: "Grid view" }).click();
  await eventually("View: back to grid leaves a clean URL", async () => [!search(page).includes("view")]);
  await page.context().close();

  // No sideways scroll, and on a phone the switch is hidden because both views look the same.
  const phone = await freshPage(375, 812);
  await phone.goto(`${BASE}/?view=list`);
  await phone.waitForSelector("[data-slot]");
  check("View: the switch is hidden on a phone", !(await phone.getByRole("button", { name: "List view" }).isVisible()));
  check("View: no sideways scroll on a phone", (await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  await phone.context().close();

  const tablet = await freshPage(768, 900);
  await tablet.goto(`${BASE}/?view=list`);
  await tablet.waitForSelector("[data-slot]");
  check("View: no sideways scroll on a tablet", (await tablet.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  await tablet.context().close();
}

// --- Wishlist
{
  const page = await freshPage();
  const header = () => page.locator("header").innerText();
  await page.goto(`${BASE}/wishlist`);
  await page.locator("h1").waitFor();
  await eventually("Wishlist: empty, it says how to use it", async () => [(await page.locator("main").innerText()).includes("Your wishlist is empty.")]);
  check("Wishlist: empty, it offers a way back", (await page.getByRole("link", { name: "Browse products" }).count()) === 1);
  await page.getByRole("link", { name: "Catalog" }).click();
  await page.waitForSelector("[data-slot]");
  const firstCard = page.locator("[data-slot]").first();
  const heart = firstCard.getByRole("button", { name: /Wishlist:/ });
  check("Wishlist: a heart starts off", (await heart.getAttribute("aria-pressed")) === "false");
  const box = await heart.boundingBox();
  check("Wishlist: the heart is 44px", box.width >= 43.99 && box.height >= 43.99, JSON.stringify(box));
  await heart.click();
  await eventually("Wishlist: pressing it turns it on", async () => [(await heart.getAttribute("aria-pressed")) === "true"]);
  await eventually("Wishlist: pressing it doesn't open the product", async () => [new URL(page.url()).pathname === "/"]);
  await eventually("Wishlist: it says so", async () => [(await page.locator("body").innerText()).includes("Added to wishlist ♥")]);
  await eventually("Wishlist: the Header shows the count", async () => [/Wishlist\s*01/.test(await header()), await header()]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("shop_wishlist")));
  check("Wishlist: it saves card fields only", saved.length === 1 && saved[0].title.length > 0 && saved[0].images === undefined && saved[0].reviews === undefined, Object.keys(saved[0] ?? {}).join(","));
  await page.locator("[data-slot]").nth(1).getByRole("button", { name: /Wishlist:/ }).click();
  await page.reload();
  await page.waitForSelector("[data-slot]");
  await eventually("Wishlist: a reload keeps it", async () => [(await page.locator("[data-slot]").first().getByRole("button", { name: /Wishlist:/ }).getAttribute("aria-pressed")) === "true"]);

  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("dummyjson.com/products")) requests.push(request.url());
  });
  await page.getByRole("link", { name: /^Wishlist/ }).click();
  await eventually("Wishlist: the page shows both products", async () => [(await page.locator("[data-slot]").count()) === 2]);
  check("Wishlist: the page asks the API for nothing", requests.length === 0, requests.join(" "));
  await page.locator("[data-slot]").first().getByRole("button", { name: "Add to cart" }).click();
  await eventually("Wishlist: Add to cart works from here", async () => [(await page.locator("body").innerText()).includes("Added to cart ✓")]);
  await page.locator("[data-slot]").first().getByRole("button", { name: /Wishlist:/ }).click();
  await eventually("Wishlist: removing takes the card away", async () => [(await page.locator("[data-slot]").count()) === 1]);
  await eventually("Wishlist: focus moves to the heading, not out of the page", async () => [(await page.evaluate(() => document.activeElement?.tagName)) === "H1"]);

  // The product page has the same heart, with words.
  await page.goto(`${BASE}/products/5`);
  const labelled = page.getByRole("button", { name: "Add to wishlist" });
  await labelled.waitFor();
  await labelled.click();
  await eventually("Wishlist: the product page's button changes its words", async () => [(await page.getByRole("button", { name: "In your wishlist" }).count()) === 1]);
  await page.context().close();

  // Saved data is outside input, and Clear local data has to reach it.
  const edited = await freshPage();
  await edited.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      const good = { id: 1, title: "Good", price: 5, discountPercentage: 0, rating: 4, stock: 3, thumbnail: "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp", category: "groceries" };
      localStorage.setItem("shop_wishlist", JSON.stringify([good, good, { id: "bad" }, 12, { ...good, id: 2, price: -4 }, { ...good, id: 3, discountPercentage: 150 }, { ...good, id: 4, stock: -1 }, { ...good, id: 5, stock: 2.5 }, { ...good, id: 6, rating: 99 }]));
      localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    }
  });
  await edited.goto(`${BASE}/wishlist`);
  await eventually("Wishlist: broken and repeated entries are dropped", async () => [(await edited.locator("[data-slot]").count()) === 1]);
  await edited.goto(`${BASE}/profile`);
  await edited.waitForSelector("#firstName");
  edited.once("dialog", (dialog) => dialog.accept());
  await edited.getByRole("button", { name: "Clear local data" }).click();
  await eventually("Wishlist: Clear local data empties it", async () => [(await edited.evaluate(() => localStorage.getItem("shop_wishlist"))) === null]);
  await eventually("Wishlist: the Header's count goes too", async () => [!/Wishlist\s*\d/.test(await edited.locator("header").innerText())]);
  await edited.context().close();

  // The longer row of links must still fit at the narrowest desktop width.
  const narrow = await freshPage(1025, 800);
  await narrow.addInitScript(() => localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" })));
  await narrow.goto(`${BASE}/`);
  await narrow.waitForSelector("[data-slot]");
  const headerBox = await narrow.locator("header").boundingBox();
  check("Wishlist: the Header stays one row at 1025px", headerBox.height < 90, `${headerBox.height}px tall`);
  await narrow.context().close();
}

// --- Printable invoice
{
  const order = {
    id: 1,
    number: "10X-00001",
    items: [
      { productId: 31, title: "Lemon", thumbnail: "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp", price: 10, discountPercentage: 0, stock: 50, quantity: 3 },
      { productId: 5, title: "Red Nail Polish", thumbnail: "https://cdn.dummyjson.com/product-images/beauty/red-nail-polish/thumbnail.webp", price: 100, discountPercentage: 10, stock: 50, quantity: 1 },
    ],
    shipping: { fullName: "Emily Johnson", email: "emily@example.com", phone: "+995555123456", address: "1 Rustaveli Avenue", city: "Tbilisi", postalCode: "0108", country: "Georgia" },
    subtotal: 120,
    discount: 12,
    shippingCost: 0,
    total: 108,
    placedAt: "2026-11-05T10:00:00.000Z",
  };
  const page = await freshPage();
  await page.addInitScript((saved) => {
    localStorage.setItem("shop_orders", JSON.stringify([saved]));
    localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    localStorage.setItem("shop_theme", '"dark"');
    window.print = () => {
      window.printed = true;
    };
  }, order);
  await page.goto(`${BASE}/orders/1`);
  const invoice = page.getByRole("region", { name: "Printable invoice" });
  await page.getByRole("button", { name: "Print invoice" }).waitFor();
  check("Invoice: hidden on screen", !(await page.locator("section[aria-label='Printable invoice']").isVisible()));
  await page.getByRole("button", { name: "Print invoice" }).click();
  check("Invoice: the button opens the print dialog", await page.evaluate(() => window.printed === true));
  await page.emulateMedia({ media: "print" });
  check("Invoice: visible on paper", await invoice.isVisible());
  const paper = await invoice.innerText();
  for (const text of ["Order #10X-00001", "Emily Johnson", "1 Rustaveli Avenue", "Lemon", "Red Nail Polish", "$90.00", "−$12.00", "Free", "$108.00", "No payment was taken"]) {
    check(`Invoice: it shows ${text}`, paper.includes(text), paper.slice(0, 200));
  }
  check("Invoice: the Header stays off paper", !(await page.locator("header").first().isVisible()));
  check("Invoice: the footer stays off paper", !(await page.locator("footer").isVisible()));
  check("Invoice: the buttons stay off paper", !(await page.getByRole("button", { name: "Reorder" }).isVisible()));
  check("Invoice: the street stays off paper", !(await page.locator(".street").isVisible()));
  check("Invoice: a toast stays off paper", !(await page.locator("[data-screen-only][role=status]").isVisible()));
  check("Invoice: the paper is white", (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(255, 255, 255)");
  if (browserName === "chromium") {
    await page.pdf({ path: OUTPUT + "invoice.pdf", format: "A4" });
    await page.screenshot({ path: OUTPUT + "invoice.png" });
  }
  await page.emulateMedia({ media: "screen" });
  await page.context().close();

  // Saving a PDF suggests the page title as its name, so it should say which order this is, only for that moment.
  const titled = await freshPage();
  await titled.addInitScript((saved) => {
    localStorage.setItem("shop_orders", JSON.stringify([saved]));
    localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    window.print = () => {
      window.titleWhilePrinting = document.title;
    };
  }, order);
  await titled.goto(`${BASE}/orders/1`);
  await titled.getByRole("button", { name: "Print invoice" }).click();
  check("Invoice: the title names the order while printing", (await titled.evaluate(() => window.titleWhilePrinting)) === "Invoice 10X-00001");
  check("Invoice: the title goes back afterwards", (await titled.title()) === "10X Shop");

  // Printing any other page must not be changed: its own background stays with its own text colour.
  await titled.goto(`${BASE}/cart`);
  await titled.locator("h1").first().waitFor();
  await titled.emulateMedia({ media: "print" });
  check("Other pages: the Header still prints", await titled.locator("header").first().isVisible());
  const machine = await titled.evaluate(() => getComputedStyle(document.querySelector("[data-paper].relative")).backgroundColor);
  check("Other pages: the machine keeps its colour, so its text stays readable", machine !== "rgb(255, 255, 255)", machine);
  await titled.context().close();
}

// --- Price range
{
  const page = await freshPage();
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("dummyjson.com/products") && !request.url().includes("categories")) requests.push(request.url());
  });
  const shownPrices = async () => {
    const texts = await page.locator("[data-slot] .led-text.block").allInnerTexts();
    return texts.map((text) => Number(text.replace(/[$,]/g, "")));
  };
  const main = () => page.locator("main").innerText();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const before = requests.length;
  await page.getByLabel("Min price").fill("10");
  await page.getByLabel("Max price").fill("20");
  check("Price: typing alone changes nothing", !search(page).includes("min"));
  await page.getByRole("button", { name: "Set price" }).click();
  await eventually("Price: the URL holds the range", async () => [search(page).includes("min=10") && search(page).includes("max=20"), search(page)]);
  await eventually("Price: every price shown is in the range", async () => {
    const prices = await shownPrices();
    return [prices.length > 0 && prices.every((price) => price >= 10 && price <= 20), prices.join(" ")];
  });
  check("Price: it fetches the whole list once, with only card fields", requests.length === before + 1 && requests.at(-1).includes("limit=0") && requests.at(-1).includes("select="), requests.at(-1));
  const firstTotal = (await main()).match(/Showing \d+–\d+ of (\d+)/)?.[1];
  check("Price: Showing uses the filtered count", Number(firstTotal) > 0 && Number(firstTotal) < 194, firstTotal);
  await eventually("Price: the count beside the heading matches", async () => [(await main()).includes(`${firstTotal} items`)]);
  await eventually("Price: the page says what it filters on", async () => [(await main()).includes("Filtered on the price shown, after discount.")]);
  const afterFilter = requests.length;
  await page.getByLabel("Max price").fill("50");
  await page.getByRole("button", { name: "Set price" }).click();
  await eventually("Price: changing the range needs no request", async () => [search(page).includes("max=50") && requests.length === afterFilter, `${requests.length - afterFilter} extra`]);
  await eventually("Price: the wider range still fits", async () => {
    const prices = await shownPrices();
    return [prices.length === 12 && prices.every((price) => price >= 10 && price <= 50), prices.join(" ")];
  });
  await page.getByRole("button", { name: "Next page" }).click().catch(() => {});
  await page.waitForTimeout(100);
  const pager = page.getByRole("navigation", { name: /page|Pagination/i });
  if (!search(page).includes("page=2")) await pager.getByRole("button", { name: "2", exact: true }).click();
  await eventually("Price: page 2 works", async () => [search(page).includes("page=2") && (await main()).includes("Showing 13–"), search(page)]);
  check("Price: page 2 needs no request", requests.length === afterFilter, `${requests.length - afterFilter} extra`);
  await page.reload();
  await page.waitForSelector("[data-slot]");
  check("Price: a reload restores the fields", (await page.getByLabel("Min price").inputValue()) === "10" && (await page.getByLabel("Max price").inputValue()) === "50");
  await page.getByLabel("Category").selectOption("beauty");
  await eventually("Price: a category keeps the range and goes back to page 1", async () => [search(page).includes("category=beauty") && search(page).includes("min=10") && !search(page).includes("page="), search(page)]);
  await eventually("Price: it uses the category's list", async () => [requests.at(-1).includes("/category/beauty") && requests.at(-1).includes("limit=0"), requests.at(-1)]);
  await page.getByRole("button", { name: "Clear price" }).click();
  await eventually("Price: Clear price removes the range", async () => [!search(page).includes("min=") && !search(page).includes("max="), search(page)]);
  await eventually("Price: and the fields empty", async () => [(await page.getByLabel("Min price").inputValue()) === ""]);
  await eventually("Price: and it goes back to one page at a time", async () => [requests.at(-1).includes("limit=12"), requests.at(-1)]);
  await page.goBack();
  await eventually("Price: Back brings the range back", async () => [(await page.getByLabel("Min price").inputValue()) === "10"]);

  // Slips and nonsense.
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.getByLabel("Min price").fill("50");
  await page.getByLabel("Max price").fill("10");
  await page.getByRole("button", { name: "Set price" }).click();
  await eventually("Price: a range entered backwards is read the right way round", async () => [(await page.getByLabel("Min price").inputValue()) === "10" && (await page.getByLabel("Max price").inputValue()) === "50"]);
  await eventually("Price: and it filters", async () => {
    const prices = await shownPrices();
    return [prices.length > 0 && prices.every((price) => price >= 10 && price <= 50), prices.join(" ")];
  });
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  for (const bad of ["-5", "1e3", "1.999"]) {
    await page.getByLabel("Min price").fill(bad);
    await page.getByRole("button", { name: "Set price" }).click();
    await eventually(`Price: ${bad} gets a message instead of doing nothing`, async () => [(await main()).includes("Enter a price like 10 or 9.99")]);
    check(`Price: ${bad} stays out of the URL`, !search(page).includes("min="), search(page));
  }
  await page.getByLabel("Min price").fill("10");
  await page.getByRole("button", { name: "Set price" }).click();
  await eventually("Price: a good value clears the message", async () => [!(await main()).includes("Enter a price like")]);
  await page.getByLabel("Max price").focus();
  await page.getByLabel("Max price").fill("40");
  await page.keyboard.press("Enter");
  await eventually("Price: Enter applies the range", async () => [search(page).includes("max=40"), search(page)]);
  check("Price: focus stays in the field after Enter", (await page.evaluate(() => document.activeElement?.getAttribute("type"))) === "number");

  // The frame between clearing the filter and the new page loading must never show the whole list.
  await page.goto(`${BASE}/?min=1`);
  await page.waitForSelector("[data-slot]");
  await page.evaluate(() => {
    window.mostCards = 0;
    new MutationObserver(() => {
      window.mostCards = Math.max(window.mostCards, document.querySelectorAll("[data-slot]").length);
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "Clear price" }).click();
  await eventually("Price: clearing goes back to 12 cards", async () => [requests.at(-1).includes("limit=12") && (await page.locator("[data-slot]").count()) === 12]);
  const most = await page.evaluate(() => window.mostCards);
  check("Price: clearing never draws the whole list, even for a moment", most <= 12, `${most} cards drawn`);
  await page.goto(`${BASE}/?min=20000&page=3`);
  await eventually("Past the end: one page reads as one page", async () => [(await main()).includes("There is 1 page."), (await main()).slice(0, 160)]);
  await page.goto(`${BASE}/?min=abc&max=1e3`);
  await page.waitForSelector("[data-slot]");
  check("Price: nonsense in the URL is ignored", (await page.locator("[data-slot]").count()) === 12 && (await page.getByLabel("Min price").inputValue()) === "");
  await page.goto(`${BASE}/?min=50&max=10`);
  await page.waitForSelector("[data-slot]");
  const flipped = await shownPrices();
  check("Price: a range written backwards in the URL still works", flipped.every((price) => price >= 10 && price <= 50), flipped.join(" "));
  await page.goto(`${BASE}/?min=999999`);
  await eventually("Price: nothing in range shows the exact empty message", async () => [(await main()).includes("No products found.")]);
  check("Price: Clear filters is offered", (await page.getByRole("link", { name: "Clear filters" }).count()) === 1);
  await page.goto(`${BASE}/?min=0&sort=price-desc`);
  await page.waitForSelector("[data-slot]");
  check("Price: min 0 is a real range, and sorting still works", requests.at(-1).includes("limit=0") && requests.at(-1).includes("sortBy=price"), requests.at(-1));
  await page.context().close();

  const phone = await freshPage(375, 812);
  await phone.goto(`${BASE}/?min=10&max=50`);
  await phone.waitForSelector("[data-slot]");
  check("Price: no sideways scroll on a phone", (await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  await phone.screenshot({ path: OUTPUT + "price-phone.png", animations: "disabled" });
  await phone.context().close();
  const desktop = await freshPage(1440, 900);
  await desktop.goto(`${BASE}/?min=10&max=50`);
  await desktop.waitForSelector("[data-slot]");
  await desktop.screenshot({ path: OUTPUT + "price-desktop.png", animations: "disabled" });
  await desktop.context().close();
}

// --- Address book
{
  const lemon = { productId: 31, title: "Lemon", thumbnail: "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp", price: 50, discountPercentage: 0, stock: 50, quantity: 2 };
  const page = await freshPage();
  await page.addInitScript((item) => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("shop_cart", JSON.stringify({ items: [item], promoCode: null }));
      localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    }
  }, lemon);
  const toDelivery = async () => {
    await page.getByLabel("Full name").fill("Emily Johnson");
    await page.getByLabel("Email").fill("emily@example.com");
    await page.getByLabel("Phone").fill("+995 555 123 456");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#address").waitFor();
  };
  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#fullName");
  await toDelivery();
  check("Address: no picker before anything is saved", (await page.getByLabel("Saved addresses").count()) === 0);
  check("Address: saving is off by default", !(await page.getByLabel("Save this address for next time").isChecked()));
  const row = await page.locator("label", { hasText: "Save this address" }).boundingBox();
  check("Address: the checkbox row is 44px tall", row.height >= 44, String(row.height));
  await page.getByLabel("Address", { exact: true }).fill("  1 Rustaveli Avenue ");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Postal code").fill("0108");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  await eventually("Address: without the box, the order goes through", async () => [/\/orders\/\d+$/.test(new URL(page.url()).pathname)]);
  check("Address: without the box, nothing is saved", (await page.evaluate(() => localStorage.getItem("shop_addresses"))) === null);

  // Placing an order empties the cart a moment after the page changes. Refilling too soon would be written over.
  const refillCart = async () => {
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("shop_cart")).items.length === 0, undefined, { polling: 50 });
    await page.evaluate((item) => localStorage.setItem("shop_cart", JSON.stringify({ items: [item], promoCode: null })), lemon);
  };
  const secondOrder = async (address, city, postal, tick) => {
    await refillCart();
    await page.goto(`${BASE}/checkout`);
    await page.waitForSelector("#fullName");
    await toDelivery();
    await page.getByLabel("Address", { exact: true }).fill(address);
    await page.getByLabel("City").fill(city);
    await page.getByLabel("Postal code").fill(postal);
    if (tick) await page.getByLabel("Save this address for next time").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Place order" }).click();
    await page.waitForURL(/\/orders\/\d+$/);
  };
  await secondOrder("  1 Rustaveli Avenue ", "Tbilisi", "0108", true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("shop_addresses")));
  check("Address: ticking the box saves it, trimmed", saved.length === 1 && saved[0].address === "1 Rustaveli Avenue" && saved[0].country === "Georgia", JSON.stringify(saved));
  check("Address: no name or phone is kept with it", saved[0].fullName === undefined && saved[0].phone === undefined);
  await secondOrder("1 Rustaveli Avenue", "Tbilisi", "0108", true);
  check("Address: the same address isn't saved twice", (await page.evaluate(() => JSON.parse(localStorage.getItem("shop_addresses")).length)) === 1);
  await secondOrder("5 Chavchavadze Avenue", "Batumi", "6000", true);

  // The picker fills the form.
  await refillCart();
  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#fullName");
  await toDelivery();
  const picker = page.getByLabel("Saved addresses");
  check("Address: newest first", (await picker.locator("option").nth(1).innerText()).startsWith("5 Chavchavadze"));
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("Address: errors show on empty fields", async () => [(await page.locator("main").innerText()).includes("City is required")]);
  await picker.selectOption({ index: 2 });
  await eventually("Address: picking fills the fields", async () => [(await page.getByLabel("Address", { exact: true }).inputValue()) === "1 Rustaveli Avenue" && (await page.getByLabel("Postal code").inputValue()) === "0108"]);
  check("Address: picking clears the errors", !(await page.locator("main").innerText()).includes("City is required"));
  check("Address: the picker shows the choice", (await picker.inputValue()) === "1");
  await picker.selectOption("");
  check("Address: going back to the prompt changes nothing", (await page.getByLabel("Address", { exact: true }).inputValue()) === "1 Rustaveli Avenue");
  await picker.selectOption({ index: 2 });
  await page.getByRole("button", { name: "Continue" }).click();
  await eventually("Address: a picked address passes to Review", async () => [(await page.getByRole("button", { name: "Place order" }).count()) === 1]);

  // Profile lists and removes them, and Clear local data reaches them.
  await page.goto(`${BASE}/profile`);
  await page.waitForSelector("#firstName");
  const list = page.locator("aside ul li");
  check("Address: Profile lists both", (await list.count()) === 2);
  await page.getByRole("button", { name: /Remove 5 Chavchavadze/ }).click();
  await eventually("Address: Remove takes one away", async () => [(await list.count()) === 1]);
  check("Address: and it stays gone", (await page.evaluate(() => JSON.parse(localStorage.getItem("shop_addresses")).length)) === 1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear local data" }).click();
  await eventually("Address: Clear local data empties them", async () => [(await page.evaluate(() => localStorage.getItem("shop_addresses"))) === null]);
  await eventually("Address: Profile says there are none", async () => [(await page.locator("main").innerText()).includes("None yet.")]);
  await page.context().close();

  const edited = await freshPage();
  await edited.addInitScript(() => {
    localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    localStorage.setItem("shop_addresses", JSON.stringify([{ address: "Good", city: "Tbilisi", postalCode: "0108", country: "Georgia" }, { address: "Good", city: "Tbilisi", postalCode: "0108", country: "Georgia" }, { address: "Elsewhere", city: "Paris", postalCode: "75000", country: "France" }, { address: "", city: "x", postalCode: "1", country: "Georgia" }, { city: "no address" }, 12]));
  });
  await edited.goto(`${BASE}/profile`);
  await edited.waitForSelector("#firstName");
  check("Address: broken, repeated and unknown-country entries are dropped", (await edited.locator("aside ul li").count()) === 1);
  await edited.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "shop_addresses") throw new DOMException("Full", "QuotaExceededError");
      return real.call(this, key, value);
    };
  });
  await edited.getByRole("button", { name: /Remove Good/ }).click();
  await eventually("Address: a failed removal says so", async () => [(await edited.locator("body").innerText()).includes("could not be removed")]);
  await edited.context().close();
}

// --- Endless
{
  // Turns off automatic loading, so the button can be tested on its own.
  const withoutObserver = async (page) => page.addInitScript(() => {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  const track = (page) => {
    const asked = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.hostname === "dummyjson.com" && url.pathname.startsWith("/products") && !url.pathname.endsWith("categories")) asked.push(url);
    });
    return asked;
  };
  const skips = (asked) => asked.filter((url) => url.searchParams.has("skip")).map((url) => Number(url.searchParams.get("skip")));
  const cards = (page) => page.locator("[data-slot]").count();
  const main = (page) => page.locator("main").innerText();
  const toBottom = (page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Switching on, and scrolling
  const page = await freshPage();
  const asked = track(page);
  await page.goto(`${BASE}/?page=3`);
  await page.waitForSelector("[data-slot]");
  check("Endless: Pages is the default", (await page.getByRole("button", { name: "Pages", exact: true }).getAttribute("aria-pressed")) === "true");
  const historyBefore = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await waitFor(150);
  check("Endless: pressing the lit Pages button keeps the page", search(page) === "?page=3", search(page));
  check("Endless: pressing the lit Pages button adds no Back step", (await page.evaluate(() => history.length)) === historyBefore);
  await page.getByRole("button", { name: "Grid view" }).click();
  await waitFor(150);
  check("Endless: pressing the lit Grid button adds no Back step", (await page.evaluate(() => history.length)) === historyBefore);
  await page.getByRole("button", { name: "Endless", exact: true }).click();
  await eventually("Endless: the URL has the mode and no page", async () => [search(page) === "?mode=endless", search(page)]);
  await eventually("Endless: it starts from the top with 12", async () => [(await cards(page)) === 12 && skips(asked).at(-1) === 0, `${await cards(page)} ${skips(asked)}`]);
  check("Endless: the button is pressed", (await page.getByRole("button", { name: "Endless", exact: true }).getAttribute("aria-pressed")) === "true");
  check("Endless: no page buttons", (await page.getByRole("navigation", { name: "Pages" }).count()) === 0);
  await toBottom(page);
  await eventually("Endless: scrolling down loads 12 more", async () => [(await cards(page)) === 24, String(await cards(page))]);
  await eventually("Endless: the count follows", async () => [(await main(page)).includes("Showing 1–24 of 194")]);
  check("Endless: it asked from 12", skips(asked).at(-1) === 12, String(skips(asked)));
  check("Endless: chunks ask for the card fields only", asked.at(-1).searchParams.get("select")?.includes("thumbnail") && !asked.at(-1).searchParams.get("select")?.includes("reviews"));
  check("Endless: Pages still asks the plain way", !asked[0].searchParams.has("select"), asked[0].search);
  await waitFor(800);
  check("Endless: it waits for the next scroll", (await cards(page)) === 24, String(await cards(page)));
  await toBottom(page);
  await eventually("Endless: scrolling again loads more", async () => [(await cards(page)) === 36, String(await cards(page))]);
  const links = await page.locator("[data-slot] a[href^='/products/']").evaluateAll((all) => all.map((link) => link.getAttribute("href")));
  check("Endless: no product appears twice", new Set(links).size === links.length && links.length >= 36, `${new Set(links).size} of ${links.length}`);
  const slots = await page.locator("[data-slot]").evaluateAll((all) => all.map((card) => card.getAttribute("data-slot")));
  check("Endless: slot codes keep counting", new Set(slots).size === 36 && slots[35] === "I4", slots[35]);

  // Keeping what has loaded, and losing it
  const before = skips(asked).length;
  await page.getByRole("button", { name: "List view" }).click();
  await eventually("Endless: list view keeps the mode", async () => [search(page).includes("mode=endless") && search(page).includes("view=list"), search(page)]);
  check("Endless: list view keeps the depth, with no new request", (await cards(page)) >= 36 && skips(asked).length - before <= 1, `${await cards(page)} ${skips(asked).length - before}`);
  await page.getByRole("button", { name: "Grid view" }).click();
  await page.reload();
  await page.waitForSelector("[data-slot]");
  check("Endless: a refresh keeps the mode", search(page).includes("mode=endless"), search(page));
  check("Endless: a refresh starts from the top", (await cards(page)) === 12, String(await cards(page)));
  await page.locator("[data-slot] a[href^='/products/']").first().click();
  await page.waitForURL(/products\/\d+/);
  await page.goBack();
  await page.waitForSelector("[data-slot]");
  check("Endless: Back keeps the mode", search(page).includes("mode=endless"), search(page));

  // Back to Pages
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await eventually("Endless: Pages takes the mode out of the URL", async () => [!search(page).includes("mode="), search(page)]);
  await eventually("Endless: Pages brings the buttons back", async () => [(await page.getByRole("navigation", { name: "Pages" }).count()) === 1]);
  check("Endless: Pages shows 12", (await cards(page)) === 12, String(await cards(page)));
  await page.getByRole("button", { name: "Endless", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("[data-slot]").length === 12);
  await toBottom(page);
  await eventually("Endless: loading again before leaving", async () => [(await cards(page)) === 24, String(await cards(page))]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await page.getByRole("navigation", { name: "Pages" }).waitFor();
  await page.getByRole("button", { name: "Endless", exact: true }).click();
  await eventually("Endless: leaving forgets the depth", async () => [search(page).includes("mode=endless") && (await cards(page)) === 12, String(await cards(page))]);
  await page.context().close();

  // The button, and one request at a time
  const buttons = await freshPage();
  await withoutObserver(buttons);
  const askedByButton = track(buttons);
  // Long enough for all three presses to land while it waits. WebKit is slow enough to press after a shorter wait, which is a real new request.
  await buttons.route(/dummyjson\.com\/products\?.*skip=12/, async (route) => {
    await waitFor(2500);
    await route.continue();
  });
  await buttons.goto(`${BASE}/?mode=endless`);
  await buttons.waitForSelector("[data-slot]");
  const loadMore = buttons.getByRole("button", { name: "Load more" });
  check("Endless: Load more is there", await loadMore.isVisible());
  await loadMore.focus();
  await buttons.keyboard.press("Enter");
  await loadMore.click();
  await loadMore.click();
  await eventually("Endless: it says it's loading", async () => [(await main(buttons)).includes("Loading more products…")]);
  await eventually("Endless: the button loads 12 more", async () => [(await cards(buttons)) === 24, String(await cards(buttons))]);
  await waitFor(300);
  check("Endless: pressing three times asks once", skips(askedByButton).filter((skip) => skip === 12).length === 1 && (await cards(buttons)) === 24, String(skips(askedByButton)));
  await eventually("Endless: focus moves to the first new product", async () => [await buttons.evaluate(() => document.activeElement === document.querySelectorAll("[data-slot] a[href^='/products/']")[12])], 1500);

  // A failed chunk
  await buttons.route(/dummyjson\.com\/products\?.*skip=24/, (route) => route.fulfill({ status: 500, body: "{}" }));
  await loadMore.click();
  const retryChunk = buttons.getByRole("button", { name: "Retry" });
  await retryChunk.waitFor();
  check("Endless: a failed chunk keeps the list", (await cards(buttons)) === 24, String(await cards(buttons)));
  check("Endless: a failed chunk says why", (await main(buttons)).includes("The server answered with status 500."));
  check("Endless: Retry takes the button's place", (await buttons.getByRole("button", { name: "Load more" }).count()) === 0);
  await buttons.unroute(/dummyjson\.com\/products\?.*skip=24/);
  await retryChunk.click();
  await eventually("Endless: Retry loads the chunk", async () => [(await cards(buttons)) === 36, String(await cards(buttons))]);
  await eventually("Endless: after Retry, focus moves to the first new product", async () => [await buttons.evaluate(() => document.activeElement === document.querySelectorAll("[data-slot] a[href^='/products/']")[24])], 1500);
  await buttons.context().close();

  // A failed chunk doesn't repeat by itself
  const looping = await freshPage();
  const askedLooping = track(looping);
  await looping.route(/dummyjson\.com\/products\?.*skip=12/, (route) => route.fulfill({ status: 500, body: "{}" }));
  await looping.goto(`${BASE}/?mode=endless`);
  await looping.waitForSelector("[data-slot]");
  await toBottom(looping);
  await looping.getByRole("button", { name: "Retry" }).waitFor();
  await waitFor(1500);
  check("Endless: a failure asks only once while the footer is in view", skips(askedLooping).filter((skip) => skip === 12).length === 1, String(skips(askedLooping)));
  await looping.context().close();

  // A filter change in the middle of a chunk
  const filters = await freshPage();
  await withoutObserver(filters);
  const failedRequests = [];
  filters.on("requestfailed", (request) => failedRequests.push(request.url()));
  let releaseChunk = () => {};
  await filters.route(/dummyjson\.com\/products\?.*skip=12/, async (route) => {
    await new Promise((resolve) => { releaseChunk = resolve; });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [{ id: 999, title: "OLD CHUNK", price: 1, discountPercentage: 0, rating: 1, stock: 1, thumbnail: "", category: "x" }], total: 194, skip: 12, limit: 12 }) }).catch(() => {});
  });
  await filters.goto(`${BASE}/?mode=endless`);
  await filters.waitForSelector("[data-slot]");
  await filters.getByRole("button", { name: "Load more" }).click();
  await eventually("Endless: the chunk is in flight", async () => [(await main(filters)).includes("Loading more products…")]);
  await filters.getByLabel("Category").selectOption("smartphones");
  await eventually("Endless: a filter keeps the mode", async () => [search(filters).includes("category=smartphones") && search(filters).includes("mode=endless"), search(filters)]);
  await eventually("Endless: a filter starts a new list", async () => [(await main(filters)).includes("Showing 1–12 of 16"), (await main(filters)).slice(0, 80)]);
  await eventually("Endless: a filter aborts the chunk in flight", async () => [failedRequests.some((url) => url.includes("skip=12")), failedRequests.join(" ")]);
  releaseChunk();
  await waitFor(400);
  check("Endless: the old chunk never appears", !(await main(filters)).includes("OLD CHUNK") && (await cards(filters)) === 12, String(await cards(filters)));
  await filters.context().close();

  // The end of the list
  const ending = await freshPage();
  const askedEnding = track(ending);
  await ending.goto(`${BASE}/?mode=endless&category=smartphones`);
  await ending.waitForSelector("[data-slot]");
  await toBottom(ending);
  await eventually("Endless: it stops at the total", async () => [(await cards(ending)) === 16 && (await main(ending)).includes("Showing 1–16 of 16"), String(await cards(ending))]);
  await eventually("Endless: it says it has finished", async () => [(await main(ending)).includes("That's everything. The machine has nothing else.")]);
  check("Endless: Load more goes away at the end", (await ending.getByRole("button", { name: "Load more" }).count()) === 0);
  check("Endless: the end is announced", (await ending.getByRole("status").filter({ hasText: "That's everything." }).count()) === 1);
  const backToTop = ending.getByRole("button", { name: "Back to top" });
  await backToTop.click();
  await eventually("Endless: Back to top goes to the top", async () => [(await ending.evaluate(() => window.scrollY)) === 0, String(await ending.evaluate(() => window.scrollY))]);
  check("Endless: Back to top moves focus to the heading", await ending.evaluate(() => document.activeElement === document.querySelector("h1")));
  await toBottom(ending);
  await waitFor(800);
  check("Endless: nothing is asked past the end", Math.max(...skips(askedEnding)) === 12 && skips(askedEnding).length === 2, String(skips(askedEnding)));
  await ending.context().close();

  // A chunk that comes back empty ends the list, even if the total disagrees
  const wrongTotal = await freshPage();
  const askedWrong = track(wrongTotal);
  await wrongTotal.route(/dummyjson\.com\/products\?.*skip=12/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [], total: 194, skip: 12, limit: 12 }) }));
  await wrongTotal.goto(`${BASE}/?mode=endless`);
  await wrongTotal.waitForSelector("[data-slot]");
  await toBottom(wrongTotal);
  await eventually("Endless: an empty chunk ends the list", async () => [(await main(wrongTotal)).includes("That's everything.")]);
  await waitFor(600);
  check("Endless: an empty chunk isn't asked for again", skips(askedWrong).filter((skip) => skip === 12).length === 1, String(skips(askedWrong)));
  await wrongTotal.context().close();

  // The first chunk behaves like any first load
  const first = await freshPage();
  let shouldFail = true;
  await first.route(/dummyjson\.com\/products\?.*skip=0/, (route) => (shouldFail ? route.fulfill({ status: 500, body: "{}" }) : route.continue()));
  await first.goto(`${BASE}/?mode=endless`);
  await first.getByRole("button", { name: "Retry" }).waitFor();
  check("Endless: a failed first chunk shows the normal error", (await cards(first)) === 0);
  shouldFail = false;
  await first.getByRole("button", { name: "Retry" }).click();
  await eventually("Endless: Retry recovers the first chunk", async () => [(await cards(first)) === 12, String(await cards(first))]);
  await first.goto(`${BASE}/?mode=endless&q=zzzzqqqq`);
  await eventually("Endless: an empty search says so", async () => [(await main(first)).includes("No products found.")]);
  check("Endless: an empty search has no footer", (await first.getByRole("button", { name: "Back to top" }).count()) === 0 && !(await main(first)).includes("That's everything."));
  const clear = first.getByRole("link", { name: "Clear filters" });
  check("Endless: Clear filters keeps the mode", (await clear.getAttribute("href")) === "/?mode=endless", await clear.getAttribute("href"));
  await clear.click();
  await eventually("Endless: Clear filters reloads the list", async () => [(await cards(first)) === 12, String(await cards(first))]);
  await first.context().close();

  // A price range and Endless don't combine
  const priced = await freshPage();
  const askedPriced = track(priced);
  await priced.goto(`${BASE}/?mode=endless`);
  await priced.waitForSelector("[data-slot]");
  await priced.getByLabel("Min price").fill("5");
  await priced.getByRole("button", { name: "Set price" }).click();
  await eventually("Endless: a price range drops the mode", async () => [search(priced).includes("min=5") && !search(priced).includes("mode="), search(priced)]);
  await eventually("Endless: the page says Endless is off", async () => [(await main(priced)).includes("Endless is off while a price range is set.")]);
  check("Endless: its button is disabled during a range", await priced.getByRole("button", { name: "Endless", exact: true }).isDisabled());
  await eventually("Endless: a range brings the page buttons back", async () => [(await priced.getByRole("navigation", { name: "Pages" }).count()) === 1]);
  await priced.getByRole("button", { name: "Clear price" }).click();
  await eventually("Endless: clearing the range enables it again", async () => [await priced.getByRole("button", { name: "Endless", exact: true }).isEnabled()]);
  check("Endless: clearing the range doesn't switch it back on", !search(priced).includes("mode="), search(priced));
  await priced.goto(`${BASE}/?mode=endless&min=5&page=2`);
  await priced.waitForSelector("[data-slot]");
  await priced.getByRole("button", { name: "Clear price" }).click();
  await eventually("Endless: clearing a shared link's range doesn't switch it on", async () => [search(priced) === "", search(priced)]);
  await priced.goto(`${BASE}/?mode=endless`);
  await priced.waitForSelector("[data-slot]");
  await priced.getByRole("button", { name: "Set price" }).click();
  await waitFor(150);
  check("Endless: setting no range keeps it on", search(priced).includes("mode=endless"), search(priced));
  askedPriced.length = 0;
  await priced.goto(`${BASE}/?mode=endless&min=5`);
  await priced.waitForSelector("[data-slot]");
  check("Endless: a URL with both gets the range", askedPriced.some((url) => url.searchParams.get("limit") === "0") && !askedPriced.some((url) => url.searchParams.has("skip")), askedPriced.map(String).join(" "));
  check("Endless: a URL with both shows Pages", (await priced.getByRole("button", { name: "Pages", exact: true }).getAttribute("aria-pressed")) === "true");
  askedPriced.length = 0;
  await priced.goto(`${BASE}/?mode=endless&page=5`);
  await priced.waitForSelector("[data-slot]");
  check("Endless: a page number in the URL is ignored", skips(askedPriced).length > 0 && skips(askedPriced)[0] === 0, String(skips(askedPriced)));
  await priced.goto(`${BASE}/?mode=nonsense`);
  await priced.waitForSelector("[data-slot]");
  check("Endless: a nonsense mode means Pages", (await priced.getByRole("button", { name: "Pages", exact: true }).getAttribute("aria-pressed")) === "true");
  await priced.context().close();

  // On a phone
  const phone = await freshPage(375, 800);
  await phone.goto(`${BASE}/?mode=endless`);
  await phone.waitForSelector("[data-slot]");
  check("Endless: the switch is there on a phone", await phone.getByRole("button", { name: "Endless", exact: true }).isVisible());
  check("Endless: no sideways scroll on a phone", await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const switchHeights = await phone.getByRole("group", { name: "Browsing" }).getByRole("button").evaluateAll((all) => all.map((button) => button.getBoundingClientRect().height));
  check("Endless: the switch's buttons are 44px tall", switchHeights.every((height) => height >= 44), String(switchHeights));
  await toBottom(phone);
  await eventually("Endless: scrolling works on a phone", async () => [(await cards(phone)) === 24, String(await cards(phone))]);
  await phone.context().close();
}

await eventually("No uncaught page errors", async () => [pageErrors.length === 0, pageErrors.join(" | ")], 0);
await browser.close();
console.log(`\n${browserName}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
