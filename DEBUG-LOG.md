# Debug log

Real bugs from this project, each with the commit that fixed it. Nothing here is invented, so this
list only grows when a real bug turns up.

---

## 1. Logging out of Checkout landed on Login instead of the catalog

**Symptom:** pressing Log out on `/checkout` ended on `/login`. The PRD says logout returns to the catalog.

**Reproduce:**
1. Add a product to the cart.
2. Go to Checkout and log in.
3. On `/checkout`, press Log out.

**Tool:** an end-to-end browser test (Playwright) reported `landed on /login`. I then read React Router's `BrowserRouter` source to see how it applies navigation.

**Root cause:** `handleLogout` calls `logout()` and then `navigate("/")`, but they don't take effect together. `BrowserRouter` wraps navigation in a React transition, which is low priority, while `logout()` is an ordinary urgent update. So React drew a state that should never exist: logged out, but still on `/checkout`. `ProtectedRoute` saw exactly that and redirected to `/login`.

**Fix:** [`5e99850`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/5e99850): `<BrowserRouter useTransitions={false}>`, so both updates commit in the same render.

**What it taught:** two updates written on consecutive lines are not always applied together. React can give them different priorities, and a guard component can run between them.

---

## 2. Firefox rejected the price font and logged errors on every page

**Symptom:** the Firefox console showed `downloadable font: STAT: Invalid nameID: 17 ... Table discarded` for the Doto font. Chromium and WebKit showed nothing.

**Reproduce:**
1. Open any page in Firefox.
2. Look at the browser console.

**Tool:** my browser test collects console errors and runs in all three engines. Only the Firefox run failed.

**Root cause:** Firefox checks font files with a strict sanitizer. It rejected the `STAT` table in the variable version of Doto, which describes the font's weight range. The project only ever uses one weight, 900, so the variable file was also carrying data it didn't need.

**Fix:** [`9736d08`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/9736d08): a static weight-900 font file, which also shrank it from 5.2 KB to 3.9 KB.

**What it taught:** testing in one browser would never have shown this. Cross-browser testing catches real differences, even in something as simple as a font.

---

## 3. The phone's cart link said one thing and showed another

**Symptom:** on a phone the header shows the cart counter as `04`, but screen readers announced only "Cart", so the number was lost. A few links were also under the spec's 44px height, such as the Cart line title for a short product name like "Lemon" (19px tall).

**Reproduce:**
1. Add something to the cart.
2. Run axe at 375px wide. It reports `label-content-name-mismatch` on the cart link.

**Tool:** axe-core, run in the browser, plus a small script measuring every link and button.

**Root cause:** I had set `aria-label="Cart"` on the link. An `aria-label` replaces the element's content for screen readers, so the visible `04` never reached them. The short links only had the height of their text.

**Fix:** [`02a0d65`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/02a0d65): removed the `aria-label`. The link now has hidden `Cart` and `4 items` text, with the LED digits hidden from screen readers instead, and the short links got `min-h-11`.

**What it taught:** an `aria-label` overrides content, so it can hide information rather than add it. Real text usually works better.
