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

---

## 4. The whole shop crashed if the browser refused to save

**Symptom:** with storage that refuses writes, the entire site showed "Something went wrong." with no products, even though browsing doesn't need the cart.

**Reproduce:**
1. Make `localStorage.setItem` throw. A full disk or blocked site data does this for real, and a test script can simulate it.
2. Open the catalog.

**Tool:** a code review flagged the line, and a Playwright script with a throwing `setItem` confirmed it: the crash screen appeared and 0 products were drawn.

**Root cause:** `CartProvider` saves the cart in a `useEffect`, and that effect runs when the app first loads. The read from storage had a `try/catch`, but the write did not. An error thrown in an effect goes up to the nearest Error Boundary, and for a provider that wraps the whole app, that is the outermost one.

**Fix:** [`18d297c`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/18d297c): a `try/catch` around the write. The cart still works for the visit and just isn't saved.

**What it taught:** anything touching storage can fail, so both directions need handling. Also, a working Error Boundary doesn't mean the problem is handled well: it replaced the whole shop when only saving had failed.

---

## 5. A corrupted saved cart showed a total of −$10.00

**Symptom:** the Cart page showed a negative total when the saved cart held an impossible quantity.

**Reproduce:**
1. In developer tools, set `shop_cart` to a line with `"quantity": -3`, plus a second line with the same `productId`.
2. Open `/cart`. It showed `Subtotal -$10.00` and `Total -$10.00`, with both lines drawn.

**Tool:** a code review pointed at the type guard, and a Playwright script confirmed the numbers.

**Root cause:** the `isCartItem` type guard only checked `typeof item.quantity === "number"`, and -3 is a number. A type guard proves the type, not that the value makes sense. The repeated `productId` would also have given React duplicate keys.

**Fix:** [`32b0beb`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/32b0beb): quantity must be a whole number between 1 and the stock, price and discount must be in range, and repeated products are dropped.

**What it taught:** data from storage is outside input, like data from a user. TypeScript's types say nothing about it at runtime.

---

## 6. Choosing a category during a search did nothing

**Symptom:** with a search active, picking a category from the dropdown changed nothing. The search stayed and the category disappeared.

**Reproduce:**
1. Search for `phone`.
2. Choose `Smartphones` in the Category dropdown.

**Tool:** a Playwright test timed out waiting for `category=` in the URL. I then traced the two effects in `CatalogToolbar` in order.

**Root cause:** choosing a category removes `q` from the URL, because the API can't combine them. In that same render the box still held `phone`, and the effect that sends a search saw "the text differs from the URL" and sent it again, which removed the category. The effect couldn't tell typed text from text left over. A later code review found a second route into the same bug: picking a category within the 400ms debounce window.

**Fix:** [`eef169a`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/eef169a): the test caught this before the first commit of this code, so the fix is part of that commit. An `isTyping` ref means only real keystrokes can start a search. The second route was fixed in the commit after the review, where choosing a category also drops any text still being typed.

**What it taught:** when one value lives in two places, here the box and the URL, an effect that syncs them needs to know which one changed first. "They differ" isn't enough information.

---

## 7. Place order and Save changes ignored the first click after fixing a field

**Symptom:** with an error showing under a field, I corrected the field and clicked the button straight away. Nothing happened. A second click worked.

**Reproduce:**
1. On Checkout, type `1` in Postal code and move to another field, so the error appears.
2. Correct it to `0100`, leaving the cursor in the field.
3. Click Place order once.

**Tool:** my browser test for the Profile form failed on `saving says so`. A normal save worked in a separate one-off script, so the difference had to be the error that was showing. I then wrote the same steps as a test for Checkout, and it failed there too.

**Root cause:** the browser fires `blur` on mouse down, and a click only counts if mouse down and mouse up land on the same element. Blur validation removed the error line, the form got shorter, and the button moved up about 23px between those two events. The mouse up landed below the button, so no click happened.

**Fix:** [`e09faa1`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/e09faa1): every field keeps a reserved line for its error, whether it is showing or not, so validation never moves anything.

**What it taught:** validating on blur changes the page at the exact moment someone is clicking. Anything that changes layout has to be checked against what the user is doing at that moment.

---

## 8. Retrying a failed order saved it twice

**Symptom:** when storage was full, Place order correctly said the order could not be placed. After freeing space and trying again, there were two saved orders from one purchase, and the numbering had skipped.

**Reproduce:**
1. Make `localStorage.setItem` throw for `shop_orders`, which is what a full browser storage does.
2. Click Place order and see the failure message.
3. Let storage work again and click Place order.
4. Read `shop_orders`: it holds two orders.

**Tool:** a code review flagged it from reading the code. I then wrote the steps above as a browser test, which failed with `2 saved`.

**Root cause:** `useLocalStorage` called `setValue` first and wrote to storage second. So the failed order stayed in React state, and the retry saved the old list plus a new order.

**Fix:** [`08e6a23`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/08e6a23): it saves first and updates state only if saving worked. Profile and reviews now also report the real result instead of always saying success.

**What it taught:** an error message isn't enough if the failed attempt leaves something behind. The retry is part of the failure path, so it needs testing too.

---

## 9. A username of `constructor` showed "undefined undefined" and could never save a profile

**Symptom:** logging in as `constructor` or `__proto__` put "undefined undefined" in the Header, and the Profile page threw errors. The login page says any username works.

**Reproduce:**
1. Log in with the username `constructor` and any valid password.
2. Look at the Header.
3. Open Profile and press Save changes.

**Tool:** a code review pointed at the lookup, and a browser test confirmed it, with `Cannot read properties of undefined (reading 'trim')` in the page errors.

**Root cause:** profiles are kept in a plain object, keyed by username. Every plain object inherits `constructor`, so `profiles["constructor"]` found a function and the code treated it as a saved profile. `__proto__` had a second problem: assigning to that key changes the object's prototype instead of adding a key, so it disappeared on reload.

**Fix:** [`2fe60f9`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/2fe60f9): `Object.hasOwn` for the lookup, and `Object.fromEntries` when reading saved profiles.

**What it taught:** when users choose the keys, a plain object isn't a neutral lookup table, because it already has keys of its own.

---

## 10. A review written in one tab wiped out a review written in another

**Symptom:** with two product pages open in two tabs, I added a review in each. Only the second one survived in storage.

**Reproduce:**
1. Open `/products/1` in one tab and `/products/2` in another.
2. Add a review in the second tab.
3. Add a review in the first tab.
4. Read `shop_reviews`: only product 1 is there.

**Tool:** a browser test with two tabs in one browser profile, which failed with `["1"]`.

**Root cause:** each tab read the saved reviews once, when its page opened. The first tab never learned about the second tab's review, so its save wrote its own old copy over the whole key.

**Fix:** [`08e6a23`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/08e6a23): `useLocalStorage` listens for the browser's `storage` event, which fires in the other tabs after a change, and updates its copy. The effect's cleanup removes the listener.

**What it taught:** localStorage is shared between tabs, but React state isn't. Any state copied from it can go out of date without anything in that tab having changed.

---

## 11. One Add to cart redrew all 12 product cards

**Symptom:** nothing looked wrong on screen. The problem only shows when you count renders: pressing Add to cart on one card redrew all 12, even though only the Header's counter had changed.

**Reproduce:**
1. Open the catalog on the dev build, with React DevTools' Profiler recording.
2. Press Add to cart on one card.
3. Stop recording and look at which components rendered.

**Tool:** a render counter that reads the same `PerformedWork` flag as the React DevTools Profiler. It reported `ProductCard 12, PriceBlock 12, StockBadge 12`. The same run showed that typing in Search and switching theme didn't redraw any card, so I didn't add `memo` for those.

**Root cause:** `ProductGrid` uses the cart context through `useAddToCart`, so it redraws whenever the cart changes. A plain component redraws whenever its parent does, even if its props are identical.

**Fix:** [`3198996`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/3198996): `memo(ProductCard)`. It works because `useAddToCart` already returns a stable function. After the fix, the same counter reports `ProductCard 0`. A later code review found one more leak: `useLocation` inside the card got straight through `memo`, because `memo` only looks at props, so every URL change still redrew all 12. [`52779ee`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/52779ee) moved it up to the grid, and a URL change now also reports `ProductCard 0`.

**What it taught:** measure first. The counter showed one component worth wrapping, which is far less work and far less risk than wrapping everything.

---

## 12. The SPA rewrite answered `/robots.txt` with the app's HTML

**Symptom:** Lighthouse's SEO score was stuck at 92, with `robots.txt is not valid: 28 errors found`. The project had no such file, yet the request came back with status 200.

**Reproduce:**
1. Build and serve the app.
2. Open `/robots.txt`.
3. See the app's `index.html` instead of a robots file.

**Tool:** the Lighthouse report, then the Network tab. Its response was HTML, and each of the 28 "errors" was one line of that HTML.

**Root cause:** the rewrite that makes `/products/5` survive a reload sends every unknown path to `index.html`. That is right for pages, but a crawler asking for `robots.txt` gets a web page instead of a 404, and treats it as a broken robots file.

**Fix:** [`be13277`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/be13277): a real `public/robots.txt`. Vercel and Vite both serve a file that exists before applying the rewrite.

**What it taught:** a catch-all rewrite also catches things that aren't pages.

---

## 13. TypeScript caught a success message that would always have failed

**Symptom:** none in the browser, because the code never ran. `tsc` stopped the build with `error TS1345: An expression of type 'void' cannot be tested for truthiness` in `ProfilePage.tsx`.

**Reproduce:**
1. Let `updateProfile` in `AuthContext` return nothing.
2. In `ProfilePage`, write `showToast(updateProfile(trimmed) ? "Changes saved ✓" : "...could not be saved...")`.
3. Run `npm run typecheck`.

**Tool:** the TypeScript compiler, the first debugger the PRD names.

**Root cause:** I changed the page to read the result of saving before `updateProfile` actually returned one. My edit to `AuthContext` had failed to apply, and I hadn't noticed. In plain JavaScript this would have run with no error, and `undefined` is falsy, so every save would have said it failed, even when it worked.

**Fix:** [`08e6a23`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/08e6a23): `updateProfile` returns the boolean from saving, and its type says so.

**What it taught:** giving a function an honest return type turns "the wrong message at runtime" into "this doesn't compile".

---

## 14. Lazy loading made the footer jump, and my first fix did nothing

**Symptom:** after adding lazy routes, Lighthouse's layout shift on the catalog went from 0.001 to 0.114, over the PRD's limit of 0.1. Its report named the `<footer>` as the element that moved.

**Reproduce:**
1. Check out the fix's commit and delete the `main:has(.page-spinner) + footer` rule from `index.css`, because lazy routes and the fix went in together.
2. Build it and serve it.
3. Run Lighthouse with the mobile preset on `/`.
4. Read Cumulative Layout Shift and the "layout shifts" list.

**Tool:** Lighthouse's layout shifts audit for the cause, and the same audit again to catch the first fix failing.

**Root cause:** while a page's code downloads, the spinner is short, so the footer sits in the middle of the screen. When the page arrives, the footer is pushed far down, and that move is what gets measured. My first fix was `main:has(.page-spinner) + footer { display: none }` inside `@layer components`, and the score didn't change at all. The footer also has Tailwind's `flex` class, and in CSS layers the utilities layer beats the components layer whatever the selector's weight, so my rule lost every time.

**Fix:** [`4dc4027`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/4dc4027): the same rule, outside any layer. Layout shift on the catalog is now 0.

**What it taught:** an improvement can make another number worse, so measure again afterwards. Also, in Tailwind v4 a rule's layer matters more than how specific its selector is.
