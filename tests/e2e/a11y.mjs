// Accessibility audit with axe-core plus a 44px touch-target check. Run by hand, not in CI: see tests/e2e/README.md.
// Usage: node tests/e2e/a11y.mjs [baseUrl] [theme]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.argv[2] ?? "http://127.0.0.1:4173";
const THEME = process.argv[3];
const routes = (process.argv[4] ?? "/,/products/1,/products/117,/cart,/login,/signup,/reset-password,/nope,/checkout,/orders,/profile").split(",");

const browser = await chromium.launch();
let problems = 0;
for (const [label, width, height] of [["phone", 375, 812], ["desktop", 1440, 1000]]) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript((theme) => {
    if (theme) localStorage.setItem("shop_theme", JSON.stringify(theme));
    // The login survives a reload now, so the protected pages can be audited too. Login and Sign Up send a
    // logged-in visitor away, so those two are audited as a guest.
    if (!/^\/(login|signup)/.test(location.pathname)) localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" }));
    else localStorage.removeItem("shop_user");
    if (!localStorage.getItem("shop_cart")) {
      localStorage.setItem("shop_cart", JSON.stringify({ promoCode: null, items: [{ productId: 31, title: "Lemon", thumbnail: "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp", price: 0.79, discountPercentage: 9.7, stock: 31, quantity: 3 }] }));
    }
  }, THEME);
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(`${BASE}${route}`);
    await page.waitForSelector("h1");
    await page.waitForLoadState("networkidle");
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ["violations"] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, first: v.nodes[0].target.join(" "), why: v.nodes[0].failureSummary?.split("\n")[1]?.trim() }));
    });
    for (const v of result) {
      problems += 1;
      console.log(`AXE  ${label} ${route}: ${v.id} (${v.impact}) x${v.count} e.g. ${v.first} :: ${v.why}`);
    }
    // Every visible link and button should be at least 44px tall, or be inline text inside a sentence.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, input, select, textarea")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // A card's title link is stretched over the whole card by ::after, so its box understates its size.
          if (el.closest("[data-slot]") && el.tagName === "A") return false;
          return r.width > 0 && r.height > 0 && r.height < 44 && getComputedStyle(el).position !== "fixed";
        })
        .map((el) => `${el.tagName.toLowerCase()}:${(el.innerText || el.getAttribute("aria-label") || el.name || "").slice(0, 30)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
    );
    for (const s of small) {
      problems += 1;
      console.log(`TAP  ${label} ${route}: ${s}`);
    }
  }
  await context.close();
}
await browser.close();
console.log(problems === 0 ? "No accessibility problems found." : `${problems} problem(s).`);
