// Checks for the extras: scenes and sound so far. Run by hand, not in CI: see tests/e2e/README.md.
// Usage: node tests/e2e/flow-extras.mjs [baseUrl] [chromium|firefox|webkit]
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
async function eventually(name, fn, ms = 5000) {
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
async function freshPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.on("pageerror", (e) => {
    if (!e.message.includes("due to access control checks")) pageErrors.push(e.message);
  });
  return page;
}
const sceneFiles = (requests) => requests.filter((url) => url.includes("/scenes/")).map((url) => url.split("/").pop());

// --- The art: only what is needed gets downloaded.
{
  const page = await freshPage();
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await eventually("Scene: the night art loads", async () => [sceneFiles(requests).includes("night.svg") && sceneFiles(requests).includes("night-road.svg"), sceneFiles(requests).join(" ")]);
  check("Scene: the day art isn't downloaded at night", !sceneFiles(requests).some((name) => name.startsWith("day")), sceneFiles(requests).join(" "));
  const nightSign = await page.evaluate(() => getComputedStyle(document.querySelector(".sign")).display);
  check("Scene: the old signs step aside", nightSign === "none", nightSign);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await eventually("Scene: switching theme loads the day art", async () => [sceneFiles(requests).includes("day.svg") && sceneFiles(requests).includes("day-canal.svg"), sceneFiles(requests).join(" ")]);
  check("Scene: the bonsai shows on top of the machine", await page.locator(".scene-bonsai").isVisible());
  check("Scene: no night parts in daylight", !(await page.locator(".scene-train").isVisible()));
  check("Scene: koi exist in daylight", (await page.locator(".scene-koi").count()) === 6);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await eventually("Scene: the train part is back at night", async () => [(await page.locator(".scene-night").evaluate((el) => getComputedStyle(el).display)) === "block"]);
  check("Scene: no bonsai at night", !(await page.locator(".scene-bonsai").isVisible()));
  await page.context().close();

  const phone = await freshPage({ viewport: { width: 375, height: 812 } });
  const phoneRequests = [];
  phone.on("request", (request) => phoneRequests.push(request.url()));
  await phone.goto(`${BASE}/`);
  await phone.waitForSelector("[data-slot]");
  await phone.waitForLoadState("networkidle");
  check("Scene: a phone downloads no art at all", sceneFiles(phoneRequests).length === 0, sceneFiles(phoneRequests).join(" "));
  check("Scene: a phone has no sideways scroll", (await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  await phone.context().close();
}

// --- The rule behind the performance: moving parts animate only transform and opacity.
for (const theme of ["dark", "light"]) {
  const page = await freshPage();
  await page.addInitScript((chosen) => localStorage.setItem("shop_theme", JSON.stringify(chosen)), theme);
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.waitForTimeout(800);
  const properties = await page.evaluate(() => {
    const found = new Set();
    for (const animation of document.getAnimations()) {
      for (const frame of animation.effect.getKeyframes()) {
        for (const key of Object.keys(frame)) {
          if (!["offset", "computedOffset", "easing", "composite"].includes(key)) found.add(key);
        }
      }
    }
    return [...found];
  });
  const allowed = new Set(["transform", "opacity"]);
  check(`Scene ${theme}: only transform and opacity animate`, properties.length > 0 && properties.every((name) => allowed.has(name)), properties.join(", "));
  await page.context().close();
}

// --- Measured: nothing repaints while the scene runs, including while the train crosses.
if (browserName === "chromium") {
  for (const theme of ["dark", "light"]) {
    const page = await freshPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript((chosen) => localStorage.setItem("shop_theme", JSON.stringify(chosen)), theme);
    await page.goto(`${BASE}/`);
    await page.waitForSelector("[data-slot]");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5500);
    const cdp = await page.context().newCDPSession(page);
    const events = [];
    cdp.on("Tracing.dataCollected", ({ value }) => events.push(...value));
    await cdp.send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline"] }, transferMode: "ReportEvents" });
    await page.waitForTimeout(5000);
    const done = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.end");
    await done;
    const count = (name) => events.filter((event) => event.name === name).length;
    console.log(`  ${theme} over 5 seconds: ${count("Paint")} paints, ${count("Layout")} layouts, ${count("UpdateLayoutTree")} style recalculations`);
    check(`Scene ${theme}: it doesn't keep repainting`, count("Paint") / 5 < 5, `${count("Paint")} paints`);
    check(`Scene ${theme}: it doesn't keep doing layout`, count("Layout") === 0, `${count("Layout")} layouts`);
    await page.context().close();
  }
}

// --- Reduced motion: a still picture, with the fish and boats placed where they can be seen.
{
  const page = await freshPage({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("shop_theme", '"light"'));
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.waitForTimeout(500);
  const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  check("Reduced motion: nothing moves", running === 0, `${running} running`);
  const koi = await page.locator(".scene-koi-1").boundingBox();
  check("Reduced motion: a koi rests in view", koi !== null && koi.x > 0 && koi.x < 1440, JSON.stringify(koi));
  await page.context().close();
}

// --- Print: the scene stays off paper. (Checked properly with the invoice.)

// --- Sound: silent until asked for. A spy records every AudioContext, and taps its output to measure the real signal.
const spy = () => {
  window.__contexts = [];
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) {
      super(...args);
      window.__contexts.push(this);
      this.__analyser = this.createAnalyser();
      this.__analyser.fftSize = 2048;
    }
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode && this.context.__analyser) {
      connect.call(this, this.context.__analyser);
    }
    return connect.call(this, target, ...rest);
  };
};
const level = (page) => page.evaluate(() => {
  const context = window.__contexts.at(-1);
  if (!context) return 0;
  const data = new Float32Array(2048);
  context.__analyser.getFloatTimeDomainData(data);
  return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
});
const contextState = (page) => page.evaluate(() => window.__contexts.at(-1)?.state ?? "none");

// Playwright's WebKit on Windows has no Web Audio at all, so the sound checks can't run there. Asked at run time, so they start
// running by themselves if a later build has it.
const hasWebAudio = await (async () => {
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  const answer = await page.evaluate(() => typeof AudioContext !== "undefined");
  await page.context().close();
  return answer;
})();

// A browser without Web Audio, here or simulated: no button that does nothing, and a saved "on" can't throw on the first click.
{
  const page = await freshPage();
  await page.addInitScript(() => {
    delete window.AudioContext;
    localStorage.setItem("shop_sound", "true");
  });
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.locator(".ticker-track").first().waitFor({ state: "attached" });
  check("No Web Audio: there is no speaker button", (await page.getByRole("button", { name: "Background sound" }).count()) === 0);
  const before = pageErrors.length;
  await page.getByRole("heading", { name: "Catalog" }).click();
  await page.waitForTimeout(200);
  check("No Web Audio: the first click throws nothing", pageErrors.length === before, pageErrors.slice(before).join(" | "));
  await page.context().close();
}

if (hasWebAudio) {
  const page = await freshPage();
  await page.addInitScript(spy);
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const button = page.getByRole("button", { name: "Background sound" });
  await button.waitFor();
  check("Sound: it is off by default", (await button.getAttribute("aria-pressed")) === "false");
  await page.locator("[data-slot]").first().getByRole("button", { name: "Add to cart" }).click();
  check("Sound: clicking elsewhere doesn't start it", (await page.evaluate(() => window.__contexts.length)) === 0);
  check("Sound: nothing is saved until it is chosen", (await page.evaluate(() => localStorage.getItem("shop_sound"))) !== "true");
  await button.click();
  await eventually("Sound: pressing the button turns it on", async () => [(await button.getAttribute("aria-pressed")) === "true"]);
  await eventually("Sound: the audio really runs", async () => [(await contextState(page)) === "running", await contextState(page)]);
  await eventually("Sound: the choice is saved", async () => [(await page.evaluate(() => localStorage.getItem("shop_sound"))) === "true"]);
  if (browserName === "chromium") {
    await eventually("Sound: a real signal reaches the output", async () => {
      const value = await level(page);
      return [value > 0.005, `rms ${value}`];
    }, 7000);
  }
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await eventually("Sound: switching theme keeps it running", async () => [(await contextState(page)) === "running" && (await button.getAttribute("aria-pressed")) === "true"]);
  check("Sound: only one audio connection exists", (await page.evaluate(() => window.__contexts.length)) === 1);
  await button.click();
  await eventually("Sound: pressing again turns it off", async () => [(await button.getAttribute("aria-pressed")) === "false"]);
  await eventually("Sound: turned off, the audio stops using the processor", async () => [(await contextState(page)) === "suspended", await contextState(page)], 6000);
  await button.click();
  await eventually("Sound: it can be turned back on", async () => [(await contextState(page)) === "running", await contextState(page)]);

  // A saved "on" waits for the visitor's first click, which is the browser's rule.
  await page.reload();
  await page.waitForSelector("[data-slot]");
  await button.waitFor();
  check("Sound: after a reload the button remembers", (await button.getAttribute("aria-pressed")) === "true");
  check("Sound: after a reload it waits for a click", (await page.evaluate(() => window.__contexts.length)) === 0);
  await page.getByRole("heading", { name: "Catalog" }).click();
  await eventually("Sound: the first click anywhere brings it back", async () => [(await contextState(page)) === "running", await contextState(page)]);
  await page.context().close();
}

// --- Machine sounds run without errors, and a broken extra can't take the shop down.
{
  const page = await freshPage();
  await page.route(/ExtrasHost-.*\.js/, (route) => route.abort());
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  check("Failure: the shop works when the extras fail to download", (await page.locator("[data-slot]").count()) === 12);
  check("Failure: no error message appears", !(await page.locator("body").innerText()).includes("Something went wrong."));
  await page.context().close();
}

// --- Shared test data
const cartItem = (overrides = {}) => ({ productId: 1, title: "Essence Mascara Lash Princess", thumbnail: "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp", price: 150, discountPercentage: 0, stock: 50, quantity: 1, ...overrides });
const withStorage = (page, entries) => page.addInitScript((pairs) => {
  // Only the first visit is set up, so a test can change things and reload.
  if (sessionStorage.getItem("set-up")) return;
  sessionStorage.setItem("set-up", "yes");
  for (const [key, value] of pairs) localStorage.setItem(key, JSON.stringify(value));
}, entries);
const anOrder = (overrides = {}) => ({ id: 123, number: "10X-00001", items: [cartItem({ price: 10, quantity: 2 })], shipping: { fullName: "Test Person", email: "t@example.com", phone: "+995555123456", address: "1 Rustaveli Avenue", city: "Tbilisi", postalCode: "0108", country: "Georgia" }, subtotal: 20, discount: 0, shippingCost: 10, total: 30, placedAt: new Date().toISOString(), ...overrides });

// --- LED ticker
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const track = page.locator("#ticker-slot .ticker-track");
  await track.waitFor();
  const text = () => track.innerText();
  check("Ticker: it has the promo code", (await text()).includes("USE CODE 10X10 FOR 10% OFF"));
  check("Ticker: an empty cart is $100 from free shipping", (await text()).includes("$100.00 TO FREE SHIPPING"), await text());
  check("Ticker: it has the machine's remarks", (await text()).includes("THE LEMON IS 71 CENTS") && (await text()).includes("THE CAR IS NOT"));
  check("Ticker: screen readers skip it", (await track.getAttribute("aria-hidden")) === "true");
  check("Ticker: only transform moves", await track.evaluate((element) => element.getAnimations().length === 1 && element.getAnimations()[0].effect.getKeyframes().every((frame) => !("left" in frame) && !("width" in frame) && !("marginLeft" in frame))));
  const firstPrice = await page.evaluate(async () => {
    const response = await fetch("https://dummyjson.com/products/1?select=price,discountPercentage");
    const { price, discountPercentage } = await response.json();
    return Math.round(price * (1 - discountPercentage / 100) * 100) / 100;
  });
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  const expected = `$${(100 - firstPrice).toFixed(2)} TO FREE SHIPPING`;
  await eventually("Ticker: it follows the cart", async () => [(await text()).includes(expected), `${expected} / ${(await text()).slice(0, 70)}`]);
  check("Ticker: the strip is written twice for the loop", (await text()).split("THE CAR IS NOT").length === 3);
  await page.locator("#ticker-slot").hover();
  check("Ticker: pointing at it pauses it", await track.evaluate((element) => element.getAnimations()[0].playState === "paused"));
  await page.context().close();

  const rich = await freshPage();
  await withStorage(rich, [["shop_cart", { items: [cartItem()], promoCode: null }]]);
  await rich.goto(`${BASE}/`);
  await rich.locator("#ticker-slot .ticker-track").waitFor();
  check("Ticker: over the limit, shipping is free", (await rich.locator("#ticker-slot .ticker-track").innerText()).includes("SHIPPING IS FREE NOW"));
  await rich.context().close();

  const promo = await freshPage();
  await withStorage(promo, [["shop_cart", { items: [cartItem({ price: 105 })], promoCode: "10X10" }]]);
  await promo.goto(`${BASE}/`);
  await promo.locator("#ticker-slot .ticker-track").waitFor();
  check("Ticker: it uses the amount after the promo, like the cart", (await promo.locator("#ticker-slot .ticker-track").innerText()).includes("$5.50 TO FREE SHIPPING"), (await promo.locator("#ticker-slot .ticker-track").innerText()).slice(0, 80));
  await promo.context().close();

  const ordered = await freshPage();
  await withStorage(ordered, [["shop_user", { username: "emilys" }], ["shop_orders", [anOrder()]]]);
  await ordered.goto(`${BASE}/orders/123`);
  await ordered.locator("#ticker-slot .ticker-track").waitFor();
  await eventually("Ticker: an order's page has its own lines", async () => [(await ordered.locator("#ticker-slot .ticker-track").innerText()).includes("NOTHING WAS CHARGED")]);
  await ordered.context().close();

  const still = await freshPage({ reducedMotion: "reduce" });
  await still.goto(`${BASE}/`);
  await still.locator("#ticker-slot .ticker-track").waitFor();
  check("Ticker: reduced motion stops it", await still.locator("#ticker-slot .ticker-track").evaluate((element) => element.getAnimations().every((animation) => animation.playState !== "running")));
  await still.context().close();
}

// --- The night-shift cat
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const cat = page.locator(".night-cat");
  await cat.waitFor();
  check("Cat: it is on the machine at night", await cat.isVisible());
  check("Cat: it starts asleep", (await cat.getAttribute("data-awake")) === "false" && (await page.locator(".night-cat-zz").count()) === 1);
  check("Cat: it is a button with a name", (await page.getByRole("button", { name: "Startle the cat" }).count()) === 1);
  check("Cat: it covers no other control", await page.evaluate(() => {
    const box = document.querySelector(".night-cat").getBoundingClientRect();
    return [...document.querySelectorAll("a, button, input, select")].filter((element) => !element.classList.contains("night-cat")).every((element) => {
      const other = element.getBoundingClientRect();
      return other.width === 0 || other.right <= box.left || other.left >= box.right || other.bottom <= box.top || other.top >= box.bottom;
    });
  }));
  check("Cat: it is big enough to press", await cat.evaluate((element) => element.offsetWidth >= 44 && element.offsetHeight >= 44));
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("Cat: adding to the cart wakes it", async () => [(await cat.getAttribute("data-awake")) === "true" && (await page.locator(".night-cat-zz").count()) === 0]);
  await eventually("Cat: it goes back to sleep", async () => [(await cat.getAttribute("data-awake")) === "false"], 4000);
  await page.goto(`${BASE}/cart`);
  await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  await page.waitForTimeout(300);
  check("Cat: removing something doesn't wake it", (await cat.getAttribute("data-awake")) === "false");
  check("Cat: adding something doesn't frighten it", (await cat.getAttribute("data-startled")) === "false");
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await cat.waitFor();

  // A click.
  await cat.click();
  check("Cat: a click frightens it", (await cat.getAttribute("data-startled")) === "true");
  check("Cat: it jumps", await page.locator(".night-cat-body").evaluate((element) => element.getAnimations().some((animation) => animation.animationName === "cat-jump")));
  check("Cat: the jump only uses transform", await page.locator(".night-cat-body").evaluate((element) => {
    const [jump] = element.getAnimations().filter((animation) => animation.animationName === "cat-jump");
    return jump.effect.getKeyframes().every((frame) => Object.keys(frame).every((key) => ["transform", "offset", "computedOffset", "easing", "composite"].includes(key)));
  }));
  check("Cat: it raises the alarm", (await page.locator(".night-cat-shock").count()) === 1);
  check("Cat: it wakes up", (await cat.getAttribute("data-awake")) === "true");
  await eventually("Cat: it says something happened", async () => [(await page.locator("body").innerText()).includes("The cat has noted this.")]);
  await eventually("Cat: the fright ends", async () => [(await cat.getAttribute("data-startled")) === "false"], 2000);
  check("Cat: the alarm goes with it", (await page.locator(".night-cat-shock").count()) === 0);
  await eventually("Cat: it goes back to sleep after a fright", async () => [(await cat.getAttribute("data-awake")) === "false"], 4000);

  // Clicking again in mid-air doesn't start another jump, and the fright still ends on time.
  await page.evaluate(() => {
    const button = document.querySelector(".night-cat");
    button.click();
    button.click();
    button.click();
  });
  await page.waitForTimeout(100);
  check("Cat: more clicks in mid-air don't pile up", await page.locator(".night-cat-body").evaluate((element) => element.getAnimations().filter((animation) => animation.animationName === "cat-jump").length === 1));
  await eventually("Cat: and the fright still ends", async () => [(await cat.getAttribute("data-startled")) === "false"], 2000);

  // The keyboard.
  await cat.focus();
  await page.keyboard.press("Enter");
  check("Cat: Enter works too", (await cat.getAttribute("data-startled")) === "true");
  await eventually("Cat: and that fright ends", async () => [(await cat.getAttribute("data-startled")) === "false"], 2000);
  await page.evaluate(() => document.activeElement.blur());

  // The machine shaking.
  await page.getByRole("button", { name: "Shake the machine" }).click();
  await eventually("Cat: a shake frightens it", async () => [(await cat.getAttribute("data-startled")) === "true"], 1000);
  await eventually("Cat: and that fright ends too", async () => [(await cat.getAttribute("data-startled")) === "false"], 2000);
  await page.keyboard.press("1");
  await page.keyboard.press("0");
  await page.keyboard.press("x");
  await eventually("Cat: the overload frightens it", async () => [(await cat.getAttribute("data-startled")) === "true"], 1000);
  await page.context().close();

  const still = await freshPage({ reducedMotion: "reduce" });
  await still.goto(`${BASE}/`);
  await still.waitForSelector("[data-slot]");
  const stillCat = still.locator(".night-cat");
  await stillCat.waitFor();
  await stillCat.click();
  check("Cat: with less motion, it doesn't move", await still.locator(".night-cat-body").evaluate((element) => element.getAnimations().length === 0));
  check("Cat: with less motion, it still looks alarmed", (await still.locator(".night-cat-shock").count()) === 1);
  await eventually("Cat: with less motion, the fright still ends", async () => [(await stillCat.getAttribute("data-startled")) === "false"], 2000);
  await still.context().close();

  // The cars: real drawings, in the lanes Japan would put them in.
  const street = await freshPage({ viewport: { width: 1920, height: 1080 } });
  await street.goto(`${BASE}/`);
  await street.locator(".scene-car-near").waitFor({ state: "attached" });
  const carFacts = await street.evaluate(() => {
    const look = (selector) => {
      const element = document.querySelector(selector);
      const [animation] = element.getAnimations();
      animation.pause();
      const { duration, delay } = animation.effect.getTiming();
      animation.currentTime = delay + duration * 0.02;
      const early = element.getBoundingClientRect();
      animation.currentTime = delay + duration * 0.12;
      const later = element.getBoundingClientRect();
      return {
        drawn: getComputedStyle(element).backgroundImage.includes("svg"),
        width: later.width,
        height: later.height,
        moves: later.left - early.left,
        bottom: later.bottom,
      };
    };
    return { far: look(".scene-car-far"), near: look(".scene-car-near") };
  });
  check("Cars: the near one is a real drawing", carFacts.near.drawn && carFacts.near.width >= 150 && carFacts.near.height >= 40, JSON.stringify(carFacts.near));
  check("Cars: the far one is a real drawing", carFacts.far.drawn && carFacts.far.width >= 120 && carFacts.far.height >= 30, JSON.stringify(carFacts.far));
  check("Cars: the far one is the smaller", carFacts.far.width < carFacts.near.width);
  check("Cars: the near lane runs left, as in Japan", carFacts.near.moves < 0, String(carFacts.near.moves));
  check("Cars: the far lane runs right", carFacts.far.moves > 0, String(carFacts.far.moves));
  check("Cars: both stay on the road", carFacts.near.bottom <= 1080 && carFacts.far.bottom <= carFacts.near.bottom);
  await street.context().close();

  const day = await freshPage();
  await withStorage(day, [["shop_theme", "light"]]);
  await day.goto(`${BASE}/`);
  await day.locator(".night-cat").waitFor({ state: "attached" });
  check("Cat: it is off duty by day", !(await day.locator(".night-cat").isVisible()));
  check("Cat: the bonsai has the cabinet by day", await day.locator(".scene-bonsai").isVisible());
  await day.context().close();

  const phone = await freshPage({ viewport: { width: 375, height: 800 } });
  await phone.goto(`${BASE}/`);
  await phone.locator(".night-cat").waitFor({ state: "attached" });
  check("Cat: no cat on a phone", !(await phone.locator(".night-cat").isVisible()));
  check("Ticker: it is there on a phone", await phone.locator("#ticker-slot .ticker-track").isVisible());
  check("Ticker: no sideways scroll on a phone", await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await phone.context().close();
}

// --- The pickup tray and the falling product
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const tray = page.getByRole("link", { name: /Pickup tray/ });
  await tray.waitFor();
  check("Tray: it starts empty", (await tray.innerText()).includes("0 items in the tray") && (await tray.locator("img").count()) === 0);
  check("Tray: its spoken name says what it is and how many", (await page.getByRole("link", { name: /^Pickup tray: 0 items in the tray \.? ?Open cart$/ }).count()) === 1);
  check("Tray: the Japanese is hidden from screen readers", (await tray.locator("b").getAttribute("aria-hidden")) === "true");
  await page.addScriptTag({ content: "window.falls = 0; new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) if (node.classList && node.classList.contains('item-fall')) window.falls += 1; }).observe(document.body, { childList: true });" });
  const cardTop = () => page.locator("[data-slot] img").first().evaluate((image) => image.getBoundingClientRect().top + window.scrollY);
  const before = await cardTop();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("Drop: the product's picture falls", async () => [(await page.evaluate(() => window.falls)) === 1, String(await page.evaluate(() => window.falls))], 1500);
  await eventually("Drop: the falling picture cleans up after itself", async () => [(await page.locator(".item-fall").count()) === 0], 1500);
  check("Drop: the card stays where it was", (await cardTop()) === before, `${before} ${await cardTop()}`);
  await eventually("Tray: the product lands in it", async () => [(await tray.locator("img").count()) === 1 && (await tray.innerText()).includes("1 item in the tray")]);
  check("Tray: its spoken name follows", (await page.getByRole("link", { name: /^Pickup tray: 1 item in the tray \.? ?Open cart$/ }).count()) === 1);
  await eventually("Tray: a landing plays only once", async () => [(await tray.locator("img.is-landing").count()) === 0], 2500);
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("Tray: a second of the same product adds to the count, not the pictures", async () => [(await tray.innerText()).includes("2 items in the tray") && (await tray.locator("img").count()) === 1]);
  await eventually("Drop: each add drops again", async () => [(await page.evaluate(() => window.falls)) === 2, String(await page.evaluate(() => window.falls))], 1500);
  await page.getByRole("button", { name: "Add to cart" }).nth(1).click();
  check("Tray: a new picture plays its landing", (await tray.locator("img.is-landing").count()) === 1);
  await eventually("Tray: the newest comes first", async () => [(await tray.locator("img").first().getAttribute("src")) === (await page.locator("[data-slot] img").nth(1).getAttribute("src")), await tray.locator("img").first().getAttribute("src")]);
  await page.reload();
  await page.waitForSelector("[data-slot]");
  await tray.waitFor();
  check("Tray: it survives a reload", (await tray.locator("img").count()) === 2);
  check("Tray: a reload doesn't replay the landing", (await tray.locator("img.is-landing").count()) === 0);
  await tray.click();
  await page.waitForURL(/\/cart$/);
  check("Tray: it opens the cart", true);
  await page.evaluate(() => localStorage.setItem("shop_user", JSON.stringify({ username: "emilys" })));
  await page.goto(`${BASE}/checkout`);
  await page.waitForSelector("#fullName");
  await page.waitForTimeout(500);
  check("Tray: it stays off Checkout", (await page.locator(".pickup-tray").count()) === 0);
  await page.goto(`${BASE}/cart`);
  await tray.waitFor();
  check("Tray: it comes back after Checkout", await tray.isVisible());
  await page.context().close();

  // On the product's own page
  const product = await freshPage();
  await product.goto(`${BASE}/products/1`);
  await product.getByRole("button", { name: "Add to cart" }).first().waitFor();
  await product.locator(".pickup-tray").waitFor();
  await product.addScriptTag({ content: "window.falls = 0; new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) if (node.classList && node.classList.contains('item-fall')) window.falls += 1; }).observe(document.body, { childList: true });" });
  await product.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("Drop: it also falls from a product's own page", async () => [(await product.evaluate(() => window.falls)) === 1], 1500);
  await product.context().close();

  // Less motion, a phone, several at once
  const still = await freshPage({ reducedMotion: "reduce" });
  await still.goto(`${BASE}/`);
  await still.waitForSelector("[data-slot]");
  await still.locator(".pickup-tray").waitFor();
  await still.addScriptTag({ content: "window.falls = 0; new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) if (node.classList && node.classList.contains('item-fall')) window.falls += 1; }).observe(document.body, { childList: true });" });
  await still.getByRole("button", { name: "Add to cart" }).first().click();
  await eventually("Tray: with less motion, the cart still updates", async () => [(await still.locator(".pickup-tray").innerText()).includes("1 item in the tray")]);
  check("Drop: with less motion, nothing falls", (await still.evaluate(() => window.falls)) === 0);
  await still.context().close();

  const phone = await freshPage({ viewport: { width: 375, height: 800 } });
  await withStorage(phone, [["shop_cart", { items: Array.from({ length: 12 }, (_, index) => cartItem({ productId: index + 1, price: 1 })), promoCode: null }]]);
  await phone.goto(`${BASE}/`);
  await phone.locator(".pickup-tray").waitFor();
  check("Tray: it shows the newest nine", (await phone.locator(".pickup-tray img").count()) === 9);
  check("Tray: no sideways scroll on a phone", await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  check("Tray: the whole slot is a tap target", (await phone.locator(".pickup-tray").boundingBox()).height >= 44);
  const firstPicture = await phone.locator(".pickup-tray img").first().boundingBox();
  const label = await phone.locator(".pickup-tray-label").boundingBox();
  check("Tray: the newest is in sight on a phone", firstPicture.x + firstPicture.width <= label.x, `${firstPicture.x + firstPicture.width} ${label.x}`);
  const clippedAt = (await phone.locator(".pickup-tray-items").boundingBox());
  check("Tray: pictures stop before the label", clippedAt.x + clippedAt.width <= label.x, `${clippedAt.x + clippedAt.width} ${label.x}`);
  await phone.context().close();
}

// --- The receipt: a real order, placed through the real form
{
  const page = await freshPage();
  await withStorage(page, [["shop_user", { username: "emilys" }], ["shop_cart", { items: [cartItem({ price: 10, quantity: 2, title: "Test lemon" }), cartItem({ productId: 2, price: 5, quantity: 1, title: "A second thing with quite a long name to wrap" })], promoCode: null }]]);
  await page.goto(`${BASE}/checkout`);
  await page.getByLabel("Full name").fill("Test Person");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Phone").fill("+995555123456");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Address", { exact: true }).fill("1 Rustaveli Avenue");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Postal code").fill("0108");
  await page.getByLabel("Country").selectOption("Georgia");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  const receipt = page.locator(".receipt");
  await receipt.waitFor();
  const text = await receipt.innerText();
  check("Receipt: it appears after ordering", true);
  check("Receipt: it has the real order number", /10X-\d{5}/.test(text), text.slice(0, 80));
  check("Receipt: it has the real lines", text.includes("2 x Test lemon") && text.includes("$20.00") && text.includes("1 x A second thing"), text);
  check("Receipt: it has the real total", text.includes("TOTAL") && text.includes("$35.00"), text);
  check("Receipt: it charges nothing, and says so", text.includes("NO PAYMENT WAS TAKEN.") && text.includes("IT PROVES NOTHING."));
  check("Receipt: screen readers skip the copy", (await page.locator(".receipt-printer").getAttribute("aria-hidden")) === "true");
  check("Receipt: the exact thank-you text is still there", (await page.locator("main").innerText()).includes("Thank you! Your order has been placed."));
  await page.waitForFunction(() => document.fonts.check('15px "DotGothic16 Extras"'));
  check("Receipt: its font loads", await page.evaluate(() => [...document.fonts].some((font) => font.family.includes("DotGothic16 Extras") && font.status === "loaded")));
  check("Receipt: only transform moves", await receipt.evaluate((element) => element.getAnimations().every((animation) => animation.effect.getKeyframes().every((frame) => !("top" in frame) && !("height" in frame)))));
  await page.reload();
  await page.waitForSelector("h1");
  await page.waitForTimeout(300);
  check("Receipt: it only prints once, not on a reload", (await page.locator(".receipt").count()) === 0);
  await page.context().close();
}

// --- The truck, read from the real timings
{
  const ages = [
    ["Processing", 10_000, "The truck is warming up."],
    ["Shipped", 120_000, "It is a small truck."],
    ["Delivered", 400_000, "The truck has gone home."],
  ];
  for (const [status, ageMs, caption] of ages) {
    const page = await freshPage();
    await withStorage(page, [["shop_user", { username: "emilys" }], ["shop_orders", [anOrder({ placedAt: new Date(Date.now() - ageMs).toISOString() })]]]);
    await page.goto(`${BASE}/orders/123`);
    const run = page.locator(".truck-run");
    await run.waitFor();
    await page.locator(".truck-road svg").waitFor();
    check(`Truck: ${status} has its caption`, (await page.locator(".truck-caption").innerText()).includes(caption), await page.locator(".truck-caption").innerText());
    const { road, truck } = await page.evaluate(() => ({ road: document.querySelector(".truck-road").getBoundingClientRect(), truck: document.querySelector(".truck-road svg").getBoundingClientRect() }));
    const progress = (truck.left - road.left) / (road.width - truck.width);
    const expected = status === "Processing" ? progress < 0.1 : status === "Shipped" ? progress > 0.35 && progress < 0.7 : progress > 0.93;
    check(`Truck: ${status} puts it in the right place`, expected, progress.toFixed(2));
    check(`Truck: ${status} doesn't widen the page`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    check(`Truck: ${status} fills the room set aside for it`, (await page.locator(".truck-road").boundingBox()).height <= (await page.locator(".truck-road").locator("xpath=ancestor::div[contains(@class,'min-h-')]").boundingBox()).height);
    check(`Truck: ${status} has a screen reader's timeline instead`, (await page.locator(".truck-road").getAttribute("aria-hidden")) === "true" && (await page.locator("main").innerText()).includes(status));
    await page.context().close();
  }
  const still = await freshPage({ reducedMotion: "reduce" });
  await withStorage(still, [["shop_user", { username: "emilys" }], ["shop_orders", [anOrder({ placedAt: new Date(Date.now() - 400_000).toISOString() })]]]);
  await still.goto(`${BASE}/orders/123`);
  await still.locator(".truck-road svg").waitFor();
  const placed = await still.evaluate(() => {
    const road = document.querySelector(".truck-road").getBoundingClientRect();
    const truck = document.querySelector(".truck-road svg").getBoundingClientRect();
    return (truck.left - road.left) / (road.width - truck.width);
  });
  check("Truck: with less motion, it is still in the right place", placed > 0.93, placed.toFixed(2));
  await still.context().close();
}

// --- The keypad
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const panel = page.getByRole("group", { name: "Machine controls" });
  await panel.waitFor();
  const led = panel.locator(".machine-panel-led");
  check("Keypad: the display starts empty", (await led.innerText()) === "--", await led.innerText());
  const keyTops = await panel.locator(".machine-panel-keys button").evaluateAll((all) => all.map((button) => button.getBoundingClientRect().height));
  check("Keypad: every key is 44px", keyTops.length === 8 && keyTops.every((height) => height >= 43.99), String(keyTops));
  check("Keypad: the grid keeps 4 columns beside it", (await page.evaluate(() => { const cards = [...document.querySelectorAll("[data-slot]")]; return cards.filter((card) => card.getBoundingClientRect().top === cards[0].getBoundingClientRect().top).length; })) === 4);
  await panel.getByRole("button", { name: "Key B" }).click();
  check("Keypad: a letter shows", (await led.innerText()) === "B-", await led.innerText());
  await panel.getByRole("button", { name: "Key 2" }).click();
  await eventually("Keypad: the code shows", async () => [(await led.innerText()) === "B2", await led.innerText()], 500);
  const lit = page.locator('[data-slot="B2"][data-hit]');
  check("Keypad: the slot lights up", (await lit.count()) === 1);
  check("Keypad: only that slot lights up", (await page.locator("[data-slot][data-hit]").count()) === 1);
  check("Keypad: its link gets focus, so Enter opens it", await page.evaluate(() => document.activeElement === document.querySelector('[data-slot="B2"] a[href^="/products/"]')));
  await eventually("Keypad: it says which product", async () => {
    const title = await page.locator('[data-slot="B2"] a[href^="/products/"]').innerText();
    return [(await page.locator("body").innerText()).split(title).length >= 3, title];
  }, 1000);
  await eventually("Keypad: the light goes out", async () => [(await page.locator("[data-slot][data-hit]").count()) === 0], 3000);
  await eventually("Keypad: the display clears", async () => [(await led.innerText()) === "--", await led.innerText()], 3000);

  await page.keyboard.press("c");
  await page.keyboard.press("9");
  check("Keypad: a number past 4 does nothing", (await led.innerText()) === "C-", await led.innerText());
  await page.keyboard.press("Escape");
  check("Keypad: Escape clears it", (await led.innerText()) === "--", await led.innerText());
  await page.keyboard.press("c");
  await page.keyboard.press("3");
  await eventually("Keypad: the real keyboard works", async () => [(await page.locator('[data-slot="C3"][data-hit]').count()) === 1]);
  const before = new URL(page.url()).pathname;
  await page.keyboard.press("Enter");
  await eventually("Keypad: Enter then opens the product", async () => [/\/products\/\d+$/.test(new URL(page.url()).pathname), `${before} ${page.url()}`]);
  await page.goBack();
  await page.waitForSelector("[data-slot]");
  await panel.waitFor();

  await panel.getByRole("button", { name: "Key A" }).click();
  await panel.getByRole("button", { name: "Clear the code" }).click();
  check("Keypad: Clear clears it", (await led.innerText()) === "--", await led.innerText());
  await page.keyboard.press("z");
  await page.keyboard.press("1");
  await eventually("Keypad: a slot that doesn't exist says so", async () => [(await page.locator("body").innerText()).includes("No slot Z1. The machine checked.")]);
  await page.keyboard.press("Escape");

  await page.getByLabel("Search").fill("ab1");
  await page.waitForTimeout(100);
  check("Keypad: typing in Search doesn't reach it", (await led.innerText()) === "--", await led.innerText());
  await page.goto(`${BASE}/`);
  await panel.waitFor();
  await page.keyboard.press("Control+a");
  check("Keypad: shortcuts don't reach it", (await led.innerText()) === "--", await led.innerText());
  await page.getByRole("link", { name: "Cart" }).first().click();
  await page.waitForURL(/\/cart$/);
  check("Keypad: it is only on the catalog", (await panel.count()) === 0);
  await page.context().close();

  // Georgian layout: `key` is a Georgian letter, and `code` is still the physical key.
  const georgian = await freshPage();
  await georgian.goto(`${BASE}/`);
  await georgian.getByRole("group", { name: "Machine controls" }).waitFor();
  await georgian.waitForSelector("[data-slot]");
  const pressGeorgian = (code, key) => georgian.evaluate(([physical, produced]) => window.dispatchEvent(new KeyboardEvent("keydown", { code: physical, key: produced, bubbles: true })), [code, key]);
  await pressGeorgian("KeyA", "ა");
  await pressGeorgian("Digit1", "1");
  await eventually("Keypad: it works with a Georgian keyboard layout", async () => [(await georgian.locator('[data-slot="A1"][data-hit]').count()) === 1]);
  await georgian.context().close();

  // Narrower screens have no panel, and the products keep their full width
  const narrow = await freshPage({ viewport: { width: 1100, height: 800 } });
  await narrow.goto(`${BASE}/`);
  await narrow.waitForSelector("[data-slot]");
  await narrow.waitForTimeout(600);
  check("Keypad: no panel at 1100px", !(await narrow.getByRole("group", { name: "Machine controls" }).isVisible()));
  check("Keypad: no sideways scroll at 1100px", await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await narrow.keyboard.press("a");
  await narrow.keyboard.press("1");
  await narrow.waitForTimeout(200);
  check("Keypad: with no panel showing, the keys do nothing", (await narrow.locator("[data-slot][data-hit]").count()) === 0 && !(await narrow.locator("body").innerText()).includes("No slot"));
  await narrow.context().close();

  const layoutShift = await freshPage();
  await layoutShift.route(/ExtrasHost-.*\.js/, (route) => route.abort());
  await layoutShift.goto(`${BASE}/`);
  await layoutShift.waitForSelector("[data-slot]");
  const widthWithout = (await layoutShift.locator(".machine-window").boundingBox()).width;
  await layoutShift.context().close();
  const withExtras = await freshPage();
  await withExtras.goto(`${BASE}/`);
  await withExtras.getByRole("group", { name: "Machine controls" }).waitFor();
  const widthWith = (await withExtras.locator(".machine-window").boundingBox()).width;
  check("Keypad: its place is kept, so the products don't jump when it loads", widthWithout === widthWith, `${widthWithout} ${widthWith}`);
  await withExtras.context().close();
}

// --- Shake the machine
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  const shake = page.getByRole("button", { name: "Shake the machine" });
  await shake.waitFor();
  check("Shake: it comes with a warning", (await page.getByRole("group", { name: "Machine controls" }).innerText()).includes("Not recommended."));
  const cartBefore = await page.evaluate(() => localStorage.getItem("shop_cart"));
  await shake.click();
  check("Shake: the machine shakes", await page.locator("#machine.is-shaking").count() === 1);
  await eventually("Shake: something rattles", async () => [(await page.locator("body").innerText()).includes("Something rattled:")]);
  check("Shake: one slot lights up", (await page.locator("[data-slot][data-hit]").count()) === 1);
  await eventually("Shake: the machine stops", async () => [(await page.locator("#machine.is-shaking").count()) === 0], 1000);
  await page.waitForTimeout(200);
  check("Shake: nothing goes in the cart", (await page.evaluate(() => localStorage.getItem("shop_cart"))) === cartBefore);
  await page.context().close();

  // Only slots with stock can rattle
  const empty = await freshPage();
  await empty.route(/dummyjson\.com\/products\?/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, products: body.products.map((product) => ({ ...product, stock: 0 })) } });
  });
  await empty.goto(`${BASE}/`);
  await empty.waitForSelector("[data-slot]");
  await empty.getByRole("button", { name: "Shake the machine" }).click();
  await eventually("Shake: an empty machine says so", async () => [(await empty.locator("body").innerText()).includes("Nothing rattled. The machine is empty.")]);
  await empty.context().close();

  const still = await freshPage({ reducedMotion: "reduce" });
  await still.goto(`${BASE}/`);
  await still.waitForSelector("[data-slot]");
  await still.getByRole("button", { name: "Shake the machine" }).click();
  check("Shake: with less motion, nothing moves", await still.locator("#machine").evaluate((machine) => machine.getAnimations().length === 0));
  await eventually("Shake: with less motion, it still says what happened", async () => [(await still.locator("body").innerText()).includes("Something rattled:")]);
  await still.context().close();
}

// --- The easter egg
{
  const page = await freshPage();
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.getByRole("group", { name: "Machine controls" }).waitFor();
  const flash = page.locator(".overload-flash");
  const type = async (...keys) => { for (const key of keys) await page.keyboard.press(key); };
  check("Overload: it isn't there to begin with", (await flash.count()) === 0);
  await type("1", "0", "z");
  await page.waitForTimeout(100);
  check("Overload: the wrong keys do nothing", (await flash.count()) === 0);
  await type("Escape", "1", "0", "x");
  await flash.waitFor({ timeout: 1000 });
  check("Overload: 1, 0, X sets it off", (await flash.innerText()) === "10X");
  check("Overload: the machine goes with it", (await page.locator("#machine.is-overloaded").count()) === 1);
  check("Overload: screen readers skip it", (await flash.getAttribute("aria-hidden")) === "true");
  check("Overload: it can't block a click", await flash.evaluate((element) => getComputedStyle(element).pointerEvents === "none"));
  check("Overload: it doesn't widen the page", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  check("Overload: only transform and opacity move", await page.evaluate(() => document.getAnimations().filter((animation) => animation.animationName === "overload-flash" || animation.animationName === "slot-jump" || animation.animationName === "machine-shake").every((animation) => animation.effect.getKeyframes().every((frame) => Object.keys(frame).every((key) => ["offset", "computedOffset", "easing", "composite", "transform", "opacity"].includes(key))))));
  await eventually("Overload: it ends by itself", async () => [(await flash.count()) === 0 && (await page.locator("#machine.is-overloaded").count()) === 0], 2500);
  await eventually("Overload: it says so, deadpan", async () => [(await page.locator("body").innerText()).includes("Overload cleared. Please don't do that again.")]);
  check("Overload: the shop is untouched", (await page.locator("[data-slot]").count()) === 12);
  await page.getByLabel("Search").fill("10x");
  await page.waitForTimeout(150);
  check("Overload: typing it in Search does nothing", (await flash.count()) === 0);
  await page.goto(`${BASE}/cart`);
  await page.locator(".pickup-tray").waitFor();
  await type("1", "0", "x");
  await flash.waitFor({ timeout: 1000 });
  check("Overload: it works on every page", true);
  await page.context().close();

  const georgian = await freshPage();
  await georgian.goto(`${BASE}/`);
  await georgian.locator(".pickup-tray").waitFor();
  await georgian.evaluate(() => {
    const press = (code, key) => window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }));
    press("Digit1", "1");
    press("Digit0", "0");
    press("KeyX", "ხ");
  });
  await georgian.locator(".overload-flash").waitFor({ timeout: 1000 });
  check("Overload: it works with a Georgian keyboard layout", true);
  await georgian.context().close();

  const still = await freshPage({ reducedMotion: "reduce" });
  await still.goto(`${BASE}/`);
  await still.locator(".pickup-tray").waitFor();
  for (const key of ["1", "0", "x"]) await still.keyboard.press(key);
  await still.locator(".overload-flash").waitFor({ timeout: 1000 });
  check("Overload: with less motion, nothing moves", await still.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length === 0));
  await still.context().close();
}

// --- A hidden tab: sounds must not pile up and all play on the way back.
if (hasWebAudio) {
  const page = await freshPage();
  await page.clock.install();
  await page.addInitScript(() => {
    window.startedSources = 0;
    const realStart = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (...args) {
      window.startedSources += 1;
      return realStart.apply(this, args);
    };
    window.setHidden = (hidden) => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  await page.getByRole("button", { name: "Background sound" }).click();
  await page.clock.fastForward(1000);
  await page.evaluate(() => window.setHidden(true));
  const before = await page.evaluate(() => window.startedSources);
  await page.clock.fastForward("05:00");
  check("Sound: nothing is scheduled while the tab is hidden", (await page.evaluate(() => window.startedSources)) === before, `${before} ${await page.evaluate(() => window.startedSources)}`);
  await page.evaluate(() => window.setHidden(false));
  await page.clock.fastForward("02:00");
  check("Sound: it carries on when the tab comes back", (await page.evaluate(() => window.startedSources)) > before);
  await page.context().close();
}

// --- The room is set aside before the extras arrive, so the page can't jump.
{
  const page = await freshPage();
  await page.route(/ExtrasHost-.*\.js/, (route) => route.abort());
  await page.goto(`${BASE}/`);
  await page.waitForSelector("[data-slot]");
  check("Layout: the ticker's room is there without the extras", (await page.locator("#ticker-slot").boundingBox()).height === 36);
  check("Layout: the tray's room is there without the extras", (await page.locator("#tray-slot").boundingBox()).height === 92);
  await page.context().close();
}

await eventually("No uncaught page errors", async () => [pageErrors.length === 0, pageErrors.join(" | ")], 0);
await browser.close();
console.log(`\n${browserName}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
