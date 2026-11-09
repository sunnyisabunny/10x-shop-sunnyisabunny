// FULL catalog outcome checks (PRD P2). Run by hand, not in CI: see tests/e2e/README.md.
// Usage: node tests/e2e/flow-catalog.mjs [baseUrl] [chromium|firefox|webkit]
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
page.on("pageerror", (e) => pageErrors.push(e.message));
const search = () => new URL(page.url()).search;
const settle = () => page.waitForLoadState("networkidle");

// --- debounce: 5 letters, 1 request
await page.goto(`${BASE}/`);
await page.waitForSelector("[data-slot]");
await settle();
let requests = [];
page.on("request", (r) => {
  if (r.url().includes("dummyjson.com/products")) requests.push(r.url());
});
await page.getByLabel("Search").pressSequentially("phone", { delay: 60 });
await page.waitForTimeout(700);
await settle();
const searchCalls = requests.filter((u) => u.includes("/products/search"));
await eventually("P2.4 typing 5 letters sends exactly 1 search request", async () => [searchCalls.length === 1, `got ${searchCalls.length}: ${searchCalls.join(", ")}`]);
await eventually("P2.4 search is in the URL", async () => [search().includes("q=phone"), search()]);
await eventually("P2 heading count follows the search", async () => [(await page.locator("main").innerText()).includes("23 items")]);
await eventually("P2 Showing text matches", async () => [(await page.locator("main").innerText()).includes("Showing 1–12 of 23")]);

// --- search and category clear each other
await page.getByLabel("Category").selectOption("smartphones");
await page.waitForFunction((s) => new RegExp(s).test(location.href), /category=smartphones/.source, { polling: 100 });
await settle();
await eventually("P2.5 choosing a category clears the search from the URL", async () => [!search().includes("q="), search()]);
await eventually("P2.5 the search box empties too", async () => [(await page.getByLabel("Search").inputValue()) === ""]);
await page.waitForTimeout(600);
await eventually("P2.8 the cleared search does not come back after the debounce", async () => [!search().includes("q="), search()]);
await eventually("P2.5 category shows its products", async () => [(await page.locator("main").innerText()).includes("16 items")]);

await page.getByLabel("Search").fill("laptop");
await page.waitForFunction((s) => new RegExp(s).test(location.href), /q=laptop/.source, { polling: 100 });
await settle();
await eventually("P2.4 searching clears the category", async () => [!search().includes("category="), search()]);

// --- sort
await page.goto(`${BASE}/`);
await page.waitForSelector("[data-slot]");
await settle();
requests = [];
await page.getByLabel("Sort").selectOption("rating-desc");
await page.waitForFunction((s) => new RegExp(s).test(location.href), /sort=rating-desc/.source, { polling: 100 });
await settle();
await eventually("P2.6 sort adds sortBy and order to the request", async () => [requests.some((u) => u.includes("sortBy=rating") && u.includes("order=desc")), requests.join(", ")]);
await eventually("P2.6 no price caption on a rating sort", async () => [!(await page.locator("main").innerText()).includes("Sorted by list price")]);
await page.getByLabel("Sort").selectOption("price-asc");
await page.waitForFunction((s) => new RegExp(s).test(location.href), /sort=price-asc/.source, { polling: 100 });
await settle();
await eventually("P2.6 price sort shows the honest caption", async () => [(await page.locator("main").innerText()).includes("Sorted by list price, before discount.")]);
const sortOptions = await page.getByLabel("Sort").locator("option").allInnerTexts();
await eventually("P2.6 the five exact sort labels", async () => [sortOptions.join("|") === "Default|Price: low to high|Price: high to low|Rating: high to low|Name A→Z", sortOptions.join("|")]);

// --- pagination
await page.goto(`${BASE}/?sort=title-asc`);
await page.waitForSelector("[data-slot]");
await settle();
await eventually("P2.7 previous is disabled on page 1", async () => [await page.getByRole("button", { name: "Previous page" }).isDisabled()]);
requests = [];
await page.evaluate(() => window.scrollTo(0, 500));
await page.getByRole("button", { name: "Page 2" }).click();
await page.waitForFunction((s) => new RegExp(s).test(location.href), /page=2/.source, { polling: 100 });
await settle();
await eventually("P2.7 page 2 sends skip=12", async () => [requests.some((u) => u.includes("skip=12")), requests.join(", ")]);
await eventually("P2.7 changing page keeps the sort", async () => [search().includes("sort=title-asc"), search()]);
await eventually("P2.7 Showing 13–24 of 194", async () => [(await page.locator("main").innerText()).includes("Showing 13–24 of 194")]);
await eventually("P2 element 6: page change scrolls to the top", async () => [(await page.evaluate(() => window.scrollY)) === 0]);

await page.goto(`${BASE}/?page=17`);
await page.waitForSelector("[data-slot]");
await settle();
await eventually("P2.7 next is disabled on the last page", async () => [await page.getByRole("button", { name: "Next page" }).isDisabled()]);
await eventually("P2.7 the last page shows the right range", async () => [(await page.locator("main").innerText()).includes("Showing 193–194 of 194")]);

// --- URL as the source of truth
await page.goto(`${BASE}/?category=laptops&sort=price-desc`);
await page.waitForSelector("[data-slot]");
await settle();
await eventually("P2.8 a shared link restores the category dropdown", async () => [(await page.getByLabel("Category").inputValue()) === "laptops"]);
await eventually("P2.8 a shared link restores the sort dropdown", async () => [(await page.getByLabel("Sort").inputValue()) === "price-desc"]);
await page.reload();
await page.waitForSelector("[data-slot]");
await eventually("P2.8 refresh keeps the view", async () => [search().includes("category=laptops") && (await page.locator("[data-slot]").count()) === 5]);

await page.goto(`${BASE}/`);
await page.waitForSelector("[data-slot]");
await settle();
await page.getByLabel("Category").selectOption("laptops");
await page.waitForFunction((s) => new RegExp(s).test(location.href), /category=laptops/.source, { polling: 100 });
await settle();
await page.getByLabel("Sort").selectOption("rating-desc");
await page.waitForFunction((s) => new RegExp(s).test(location.href), /sort=rating-desc/.source, { polling: 100 });
await settle();
await page.goBack();
await page.waitForFunction(() => !location.search.includes("sort="), undefined, { polling: 100 });
await settle();
await eventually("P2.8 Back undoes the last filter", async () => [search() === "?category=laptops", search()]);
await page.goForward();
await page.waitForFunction(() => location.search.includes("sort="), undefined, { polling: 100 });
await eventually("P2.8 Forward restores it", async () => [search().includes("sort=rating-desc"), search()]);

// --- Back from a product keeps the filters
await page.locator("[data-slot]").first().getByRole("link").click();
await page.waitForURL(/products\/\d+/);
await page.getByRole("link", { name: "← Back to catalog" }).click();
await page.waitForFunction(() => location.pathname === "/", undefined, { polling: 100 });
await eventually("P3 Back to catalog keeps the filters", async () => [search().includes("category=laptops") && search().includes("sort=rating-desc"), search()]);

// --- empty result and Clear filters
await page.goto(`${BASE}/?q=zzzzzzzz`);
await page.waitForFunction(() => document.body.innerText.includes("No products found."), undefined, { polling: 100 });
await eventually("P2.3 no results shows the exact text", async () => [true]);
await page.getByRole("link", { name: "Clear filters" }).click();
await page.waitForSelector("[data-slot]");
await eventually("P2.3 Clear filters empties the URL", async () => [search() === "", search()]);
await eventually("P2.3 Clear filters empties the search box", async () => [(await page.getByLabel("Search").inputValue()) === ""]);

// --- nonsense URL values do not break anything
await page.goto(`${BASE}/?page=abc&sort=hack`);
await page.waitForSelector("[data-slot]");
await eventually("O2 a nonsense page and sort in the URL fall back safely", async () => [(await page.locator("[data-slot]").count()) === 12]);

// --- a search with special characters
await page.goto(`${BASE}/`);
await page.waitForSelector("[data-slot]");
await page.getByLabel("Search").fill("50% & up?");
await page.waitForFunction(() => document.body.innerText.includes("No products found."), undefined, { polling: 100 });
await eventually("O2 special characters in a search don't break the request", async () => [(await page.locator('[role="alert"]').count()) === 0]);

// --- stale answers: a slow old response must never overwrite a newer one
const stale = await context.newPage();
await stale.route("**/dummyjson.com/products/search?**", async (route) => {
  if (route.request().url().includes("q=slow")) {
    await new Promise((r) => setTimeout(r, 1500));
  }
  await route.continue().catch(() => {});
});
await stale.goto(`${BASE}/`);
await stale.waitForSelector("[data-slot]");
await stale.getByLabel("Search").fill("slow");
await stale.waitForFunction((s) => new RegExp(s).test(location.href), /q=slow/.source, { polling: 100 });
await stale.getByLabel("Search").fill("phone");
await stale.waitForFunction((s) => new RegExp(s).test(location.href), /q=phone/.source, { polling: 100 });
await stale.waitForFunction(() => document.body.innerText.includes("23 items"), undefined, { polling: 100 });
await stale.waitForTimeout(1800);
await eventually("P2.2 a slow old search can't overwrite a newer one", async () => [(await stale.locator("main").innerText()).includes("23 items")]);
await stale.close();

// --- skeleton and Retry
const flaky = await context.newPage();
let failFirst = true;
await flaky.route("**/dummyjson.com/products?**", async (route) => {
  if (failFirst) {
    failFirst = false;
    await route.fulfill({ status: 500, body: "{}" });
  } else {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  }
});
await flaky.goto(`${BASE}/`);
await flaky.getByRole("button", { name: "Retry" }).waitFor();
await eventually("P2.2 failure shows Retry", async () => [(await flaky.locator('[role="alert"]').count()) >= 1]);
await flaky.getByRole("button", { name: "Retry" }).click();
// The route holds the answer for 500ms, so the skeleton must appear well inside that window.
const skeletonShown = await flaky.locator('main [role="status"]').first().waitFor({ timeout: 400 }).then(() => true, () => false);
await eventually("P2.2 Retry shows the skeleton while loading", async () => [skeletonShown]);
await flaky.waitForSelector("[data-slot]");
await eventually("P2.2 Retry then shows products", async () => [(await flaky.locator("[data-slot]").count()) === 12]);
await flaky.close();

// --- edge cases from code review
const edge = await context.newPage();
await edge.goto(`${BASE}/`);
await edge.waitForSelector("[data-slot]");
await edge.getByLabel("Search").pressSequentially("ph");
await edge.getByLabel("Category").selectOption("laptops");
await edge.waitForTimeout(700);
await eventually("Review: a category picked mid-typing stays chosen", async () => [new URL(edge.url()).search === "?category=laptops", new URL(edge.url()).search]);
await eventually("Review: the half-typed search text is dropped", async () => [(await edge.getByLabel("Search").inputValue()) === ""]);

await edge.goto(`${BASE}/?category=laptops&page=1`);
await edge.waitForSelector("[data-slot]");
await edge.getByLabel("Search").fill("   ");
await edge.waitForTimeout(700);
await eventually("Review: searching only spaces does nothing", async () => [new URL(edge.url()).search.includes("category=laptops"), new URL(edge.url()).search]);

await edge.goto(`${BASE}/`);
await edge.waitForSelector("[data-slot]");
await edge.getByLabel("Search").pressSequentially("red ", { delay: 40 });
await edge.waitForTimeout(700);
await edge.getByLabel("Search").pressSequentially("shoes", { delay: 40 });
await eventually("Review: a pause doesn't eat the space inside a search", async () => [(await edge.getByLabel("Search").inputValue()) === "red shoes", await edge.getByLabel("Search").inputValue()]);

await edge.goto(`${BASE}/?page=99`);
await edge.getByRole("button", { name: "Go to the last page" }).waitFor();
await eventually("Review: a page past the end says so, not 'no products'", async () => [!(await edge.locator("main").innerText()).includes("No products found.")]);
await edge.getByRole("button", { name: "Go to the last page" }).click();
await eventually("Review: Go to the last page works", async () => [(await edge.locator("main").innerText()).includes("Showing 193–194 of 194")]);

await edge.goto(`${BASE}/?page=1e3`);
await edge.waitForSelector("[data-slot]");
await eventually("Review: ?page=1e3 falls back to page 1", async () => [(await edge.locator("main").innerText()).includes("Showing 1–12 of 194")]);

await edge.goto(`${BASE}/?q=phone&category=laptops`);
await edge.waitForSelector("[data-slot]");
await eventually("Review: a URL with both search and category follows the search", async () => [(await edge.getByLabel("Category").inputValue()) === "" && (await edge.locator("main").innerText()).includes("23 items")]);

await edge.goto(`${BASE}/?category=bogus`);
await edge.waitForFunction(() => document.body.innerText.includes("No products found."), undefined, { polling: 100 });
await eventually("Review: an unknown category still shows in the dropdown", async () => [(await edge.getByLabel("Category").inputValue()) === "bogus"]);
await edge.getByLabel("Category").selectOption("");
await eventually("Review: All categories clears an unknown category", async () => [new URL(edge.url()).search === "" && (await edge.locator("[data-slot]").count()) === 12]);

await edge.goto(`${BASE}/?category=laptops`);
await edge.waitForSelector("[data-slot]");
await edge.getByLabel("Search").fill("phone");
await edge.waitForFunction(() => location.search.includes("q=phone"), undefined, { polling: 100 });
await edge.getByLabel("Search").fill("phones");
await edge.waitForFunction(() => location.search.includes("q=phones"), undefined, { polling: 100 });
await edge.goBack();
await eventually("Review: Back from a search returns to the view before it", async () => [new URL(edge.url()).search === "?category=laptops", new URL(edge.url()).search]);

await edge.goto(`${BASE}/?q=Lemon`);
await edge.waitForSelector("[data-slot]");
await eventually("Review: one result says 1 item", async () => [(await edge.locator("main").innerText()).includes("1 item") && !(await edge.locator("main").innerText()).includes("1 items")]);

await edge.goto(`${BASE}/`);
await edge.waitForSelector("[data-slot]");
await edge.getByRole("button", { name: "Page 2" }).focus();
await edge.keyboard.press("Enter");
await edge.waitForFunction(() => location.search.includes("page=2"), undefined, { polling: 100 });
await eventually("Review: changing page moves keyboard focus to the heading", async () => [await edge.evaluate(() => document.activeElement?.tagName === "H1")]);
await edge.close();

// --- phone layout of the new controls
const phone = await browser.newContext({ viewport: { width: 375, height: 812 } });
const pp = await phone.newPage();
await pp.goto(`${BASE}/`);
await pp.waitForSelector("[data-slot]");
await pp.waitForLoadState("networkidle");
await eventually("O3 no sideways scroll on the catalog at 375px", async () => [await pp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)]);
await pp.goto(`${BASE}/?page=9`);
await pp.waitForSelector("[data-slot]");
await eventually("O3 pagination with many buttons fits at 375px", async () => [await pp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)]);
await phone.close();

await eventually("No uncaught page errors", async () => [pageErrors.length === 0, pageErrors.join(" | ")]);

await browser.close();
console.log(`\n${browserName}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
