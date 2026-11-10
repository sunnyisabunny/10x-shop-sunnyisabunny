# Debug log

Real bugs from this project, each with the commit that fixed it. Nothing here is invented, so this
list only grows when a real bug turns up.

**Who did what:** Claude Code wrote the code, the tests, every fix below and these entries. Each entry says how the bug was found and who fixed it. "I" only ever means me, the owner: entry 18 is the one I found myself.

---

## 1. Logging out of Checkout landed on Login instead of the catalog

**Found by:** an end-to-end browser test (Playwright) that Claude wrote. **Fixed by:** Claude.

**Symptom:** pressing Log out on `/checkout` ended on `/login`. The PRD says logout returns to the catalog.

**Reproduce:**
1. Add a product to the cart.
2. Go to Checkout and log in.
3. On `/checkout`, press Log out.

**Tool:** an end-to-end browser test (Playwright) reported `landed on /login`. Claude then read React Router's `BrowserRouter` source to see how it applies navigation.

**Root cause:** `handleLogout` calls `logout()` and then `navigate("/")`, but they don't take effect together. `BrowserRouter` wraps navigation in a React transition, which is low priority, while `logout()` is an ordinary urgent update. So React drew a state that should never exist: logged out, but still on `/checkout`. `ProtectedRoute` saw exactly that and redirected to `/login`.

**Fix:** [`5e99850`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/5e99850): `<BrowserRouter useTransitions={false}>`, so both updates commit in the same render.

**What it taught:** two updates written on consecutive lines are not always applied together. React can give them different priorities, and a guard component can run between them.

---

## 2. Firefox rejected the price font and logged errors on every page

**Found by:** the console-error check in the browser tests, which failed in Firefox only. **Fixed by:** Claude.

**Symptom:** the Firefox console showed `downloadable font: STAT: Invalid nameID: 17 ... Table discarded` for the Doto font. Chromium and WebKit showed nothing.

**Reproduce:**
1. Open any page in Firefox.
2. Look at the browser console.

**Tool:** the browser test collects console errors and runs in all three engines. Only the Firefox run failed.

**Root cause:** Firefox checks font files with a strict sanitizer. It rejected the `STAT` table in the variable version of Doto, which describes the font's weight range. The project only ever uses one weight, 900, so the variable file was also carrying data it didn't need.

**Fix:** [`9736d08`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/9736d08): a static weight-900 font file, which also shrank it from 5.2 KB to 3.9 KB.

**What it taught:** testing in one browser would never have shown this. Cross-browser testing catches real differences, even in something as simple as a font.

---

## 3. The phone's cart link said one thing and showed another

**Found by:** axe and a tap-target script, run by Claude. **Fixed by:** Claude.

**Symptom:** on a phone the header shows the cart counter as `04`, but screen readers announced only "Cart", so the number was lost. A few links were also under the spec's 44px height, such as the Cart line title for a short product name like "Lemon" (19px tall).

**Reproduce:**
1. Add something to the cart.
2. Run axe at 375px wide. It reports `label-content-name-mismatch` on the cart link.

**Tool:** axe-core, run in the browser, plus a small script measuring every link and button.

**Root cause:** the link had `aria-label="Cart"`. An `aria-label` replaces the element's content for screen readers, so the visible `04` never reached them. The short links only had the height of their text.

**Fix:** [`02a0d65`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/02a0d65): removed the `aria-label`. The link now has hidden `Cart` and `4 items` text, with the LED digits hidden from screen readers instead, and the short links got `min-h-11`.

**What it taught:** an `aria-label` overrides content, so it can hide information rather than add it. Real text usually works better.

---

## 4. The whole shop crashed if the browser refused to save

**Found by:** a code review by Claude, then a Playwright script that confirmed it. **Fixed by:** Claude.

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

**Found by:** a code review by Claude, then a Playwright script that confirmed it. **Fixed by:** Claude.

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

**Found by:** a Playwright test that timed out, and later a code review that found a second cause. **Fixed by:** Claude.

**Symptom:** with a search active, picking a category from the dropdown changed nothing. The search stayed and the category disappeared.

**Reproduce:**
1. Search for `phone`.
2. Choose `Smartphones` in the Category dropdown.

**Tool:** a Playwright test timed out waiting for `category=` in the URL. Claude then traced the two effects in `CatalogToolbar` in order.

**Root cause:** choosing a category removes `q` from the URL, because the API can't combine them. In that same render the box still held `phone`, and the effect that sends a search saw "the text differs from the URL" and sent it again, which removed the category. The effect couldn't tell typed text from text left over. A later code review found a second route into the same bug: picking a category within the 400ms debounce window.

**Fix:** [`eef169a`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/eef169a): the test caught this before the first commit of this code, so the fix is part of that commit. An `isTyping` ref means only real keystrokes can start a search. The second route was fixed in the commit after the review, where choosing a category also drops any text still being typed.

**What it taught:** when one value lives in two places, here the box and the URL, an effect that syncs them needs to know which one changed first. "They differ" isn't enough information.

---

## 7. Place order and Save changes ignored the first click after fixing a field

**Found by:** the browser test for the Profile form, then a Checkout test written to match. **Fixed by:** Claude.

**Symptom:** with an error showing under a field, correcting the field and clicking the button straight away did nothing. A second click worked.

**Reproduce:**
1. On Checkout, type `1` in Postal code and move to another field, so the error appears.
2. Correct it to `0100`, leaving the cursor in the field.
3. Click Place order once.

**Tool:** the browser test for the Profile form failed on `saving says so`. A normal save worked in a separate one-off script, so the difference had to be the error that was showing. Claude then wrote the same steps as a test for Checkout, and it failed there too.

**Root cause:** the browser fires `blur` on mouse down, and a click only counts if mouse down and mouse up land on the same element. Blur validation removed the error line, the form got shorter, and the button moved up about 23px between those two events. The mouse up landed below the button, so no click happened.

**Fix:** [`e09faa1`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/e09faa1): every field keeps a reserved line for its error, whether it is showing or not, so validation never moves anything.

**What it taught:** validating on blur changes the page at the exact moment someone is clicking. Anything that changes layout has to be checked against what the user is doing at that moment.

---

## 8. Retrying a failed order saved it twice

**Found by:** a code review by Claude, then a browser test that confirmed it. **Fixed by:** Claude.

**Symptom:** when storage was full, Place order correctly said the order could not be placed. After freeing space and trying again, there were two saved orders from one purchase, and the numbering had skipped.

**Reproduce:**
1. Make `localStorage.setItem` throw for `shop_orders`, which is what a full browser storage does.
2. Click Place order and see the failure message.
3. Let storage work again and click Place order.
4. Read `shop_orders`: it holds two orders.

**Tool:** a code review flagged it from reading the code. Claude then wrote the steps above as a browser test, which failed with `2 saved`.

**Root cause:** `useLocalStorage` called `setValue` first and wrote to storage second. So the failed order stayed in React state, and the retry saved the old list plus a new order.

**Fix:** [`08e6a23`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/08e6a23): it saves first and updates state only if saving worked. Profile and reviews now also report the real result instead of always saying success.

**What it taught:** an error message isn't enough if the failed attempt leaves something behind. The retry is part of the failure path, so it needs testing too.

---

## 9. A username of `constructor` showed "undefined undefined" and could never save a profile

**Found by:** a code review by Claude, then a browser test that confirmed it. **Fixed by:** Claude.

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

**Found by:** a code review by Claude, then a browser test with two tabs that confirmed it. **Fixed by:** Claude.

**Symptom:** with two product pages open in two tabs, a review was added in each. Only the second one survived in storage.

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

**Found by:** a render-counting script, and later a code review that found one more leak. **Fixed by:** Claude.

**Symptom:** nothing looked wrong on screen. The problem only shows when you count renders: pressing Add to cart on one card redrew all 12, even though only the Header's counter had changed.

**Reproduce:**
1. Open the catalog on the dev build, with React DevTools' Profiler recording.
2. Press Add to cart on one card.
3. Stop recording and look at which components rendered.

**Tool:** a render counter that reads the same `PerformedWork` flag as the React DevTools Profiler. It reported `ProductCard 12, PriceBlock 12, StockBadge 12`. The same run showed that typing in Search and switching theme didn't redraw any card, so no `memo` was added for those.

**Root cause:** `ProductGrid` uses the cart context through `useAddToCart`, so it redraws whenever the cart changes. A plain component redraws whenever its parent does, even if its props are identical.

**Fix:** [`3198996`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/3198996): `memo(ProductCard)`. It works because `useAddToCart` already returns a stable function. After the fix, the same counter reports `ProductCard 0`. A later code review found one more leak: `useLocation` inside the card got straight through `memo`, because `memo` only looks at props, so every URL change still redrew all 12. [`52779ee`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/52779ee) moved it up to the grid, and a URL change now also reports `ProductCard 0`.

**What it taught:** measure first. The counter showed one component worth wrapping, which is far less work and far less risk than wrapping everything.

---

## 12. The SPA rewrite answered `/robots.txt` with the app's HTML

**Found by:** Lighthouse, then the Network tab. **Fixed by:** Claude.

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

**Found by:** the TypeScript compiler. **Fixed by:** Claude.

**Symptom:** none in the browser, because the code never ran. `tsc` stopped the build with `error TS1345: An expression of type 'void' cannot be tested for truthiness` in `ProfilePage.tsx`.

**Reproduce:**
1. Let `updateProfile` in `AuthContext` return nothing.
2. In `ProfilePage`, write `showToast(updateProfile(trimmed) ? "Changes saved ✓" : "...could not be saved...")`.
3. Run `npm run typecheck`.

**Tool:** the TypeScript compiler, the first debugger the PRD names.

**Root cause:** Claude changed the page to read the result of saving before `updateProfile` actually returned one. Its edit to `AuthContext` had failed to apply, and it hadn't noticed. In plain JavaScript this would have run with no error, and `undefined` is falsy, so every save would have said it failed, even when it worked.

**Fix:** [`08e6a23`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/08e6a23): `updateProfile` returns the boolean from saving, and its type says so.

**What it taught:** giving a function an honest return type turns "the wrong message at runtime" into "this doesn't compile".

---

## 14. Lazy loading made the footer jump, and the first fix did nothing

**Found by:** Lighthouse, which also showed that the first fix had done nothing. **Fixed by:** Claude.

**Symptom:** after adding lazy routes, Lighthouse's layout shift on the catalog went from 0.001 to 0.114, over the PRD's limit of 0.1. Its report named the `<footer>` as the element that moved.

**Reproduce:**
1. Check out the fix's commit and delete the `main:has(.page-spinner) + footer` rule from `index.css`, because lazy routes and the fix went in together.
2. Build it and serve it.
3. Run Lighthouse with the mobile preset on `/`.
4. Read Cumulative Layout Shift and the "layout shifts" list.

**Tool:** Lighthouse's layout shifts audit for the cause, and the same audit again to catch the first fix failing.

**Root cause:** while a page's code downloads, the spinner is short, so the footer sits in the middle of the screen. When the page arrives, the footer is pushed far down, and that move is what gets measured. Claude's first fix was `main:has(.page-spinner) + footer { display: none }` inside `@layer components`, and the score didn't change at all. The footer also has Tailwind's `flex` class, and in CSS layers the utilities layer beats the components layer whatever the selector's weight, so that rule lost every time.

**Fix:** [`4dc4027`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/4dc4027): the same rule, outside any layer. Layout shift on the catalog is now 0.

**What it taught:** an improvement can make another number worse, so measure again afterwards. Also, in Tailwind v4 a rule's layer matters more than how specific its selector is.

## 15. Pressing Load more twice asked for the same products again

**Found by:** a browser test that counts requests. **Fixed by:** Claude.

**Symptom:** in Endless, pressing Load more several times while a chunk was loading sent the request for that chunk twice: `skip=12`, then `skip=12` again straight after the first answer. One press was fine. The page looked correct either way, so only a test that counted requests caught it.

**Reproduce:** the test caught this before the broken version was committed, so no commit holds it. To see it again:
1. In `useEndlessProducts`, go back to `useFetch` for the request, and add each answer to the list with `setStored` during the render, instead of inside the effect.
2. Build it and serve it, then open `/?mode=endless` with the Network tab of DevTools on Fetch/XHR.
3. Press Load more three times quickly.
4. Two requests for `skip=12` appear.

**Tool:** Playwright, counting requests in `flow-bonus.mjs`. Then a throwaway script that logged each request with its time, comparing one press with three and with and without a delay. Then React's own source, `react-dom-client.development.js`.

**Root cause:** this is Claude's reading of React's source, and it matches what the experiment showed. The hook was setting state during a render, the pattern `PriceFilter` uses to follow a new prop. Two facts combine badly here:
- When a `setState` changes nothing, React skips the redraw but still leaves the update waiting in the queue (`dispatchSetStateInternal`). Presses two and three were exactly that, because `loadMore` returned the state unchanged while a chunk was on its way.
- A state set during a render only becomes permanent if nothing is waiting in that queue: `null === hook.baseQueue && (hook.baseState = newState)` in `rerenderReducer`.

So the new products went into the list, then React replayed the waiting presses from the older state. That threw the new products away and made the hook want the same chunk again.

**Fix:** [`96cf6b0`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/96cf6b0): the hook has its own effect, and each answer joins the list in one normal update, as a function of the latest state, so React's queue can't lose it. The test now presses three times and expects one request.

**What it taught:** setting state during a render is for making a value follow a prop, not for collecting data. Also, a page that looks right can still be wrong: nothing on the screen showed this, and only counting the requests did.

---

## 16. Sounds due in a hidden tab all waited, then played at once

**Found by:** a code review by Claude, then a script that measured it. **Fixed by:** Claude.

**Symptom:** with sound on, leaving the tab for a while and coming back would play everything that had come due, all together. A code review found this. Nobody had heard it yet, so Claude measured it instead.

**Reproduce:**
1. Check out `6dffddd`, build it and serve it.
2. Press the speaker button, then switch to another tab for a few minutes.
3. Come back. Everything due while you were away plays at once.

**Tool:** code review, then a throwaway Playwright script that counted every call to `AudioScheduledSourceNode.start` and recorded when each one was due, while Playwright's clock ran 5 minutes of the page's timers with the tab hidden.

**Measured:** before the fix, 3,593 audio sources were queued, all due within 10.8 seconds of each other. After it, 0. Playwright runs the timers at full speed and a real browser slows them in a hidden tab, so the real count would be lower, but they would pile up the same way.

**Root cause:** the page has two clocks. Suspending the audio stops the audio clock, so `currentTime` stands still, but the engine's `setTimeout` timers belong to the page and they kept firing. Each one scheduled its sound at `currentTime` plus a small delay. Against a stopped clock those are nearly the same moment, so they all came due together when the audio resumed.

**Fix:** [`deb32e0`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/deb32e0): when the tab is hidden, `SoundToggle` stops the engine's timers as well as suspending the audio, and `playSound` does nothing until the tab is back.

**What it taught:** pausing one clock doesn't pause the other. Also, a sound bug can be measured by something that can't hear: counting what was scheduled and when was enough.

---

## 17. The speaker button did nothing in a browser with no Web Audio

**Found by:** the extras browser test, which failed in WebKit only, then a probe script. **Fixed by:** Claude.

**Symptom:** in WebKit, pressing the speaker button changed nothing and showed no message, and each press threw `Can't find variable: AudioContext`. With sound saved as on, the first click anywhere on the page threw the same error. The shop kept working.

**Reproduce:**
1. Check out `a879ecd`, build it and serve it.
2. In any browser, run `delete window.AudioContext` in the console.
3. Press the speaker button. It stays off, and the console shows the error.

**Tool:** `flow-extras.mjs` in three browsers, where every sound check failed in WebKit only. Then a throwaway script asked WebKit for `typeof AudioContext`, and the answer was `undefined`. Playwright's WebKit on Windows has no Web Audio at all.

**Root cause:** `handleClick` called `wakeAudio()`, and only then `setIsOn`. `new AudioContext()` threw, so the next line never ran. An Error Boundary doesn't catch errors thrown in event handlers, so nothing appeared on screen either. The button was drawn without checking that what it controls exists.

**Fix:** [`7319fbf`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/7319fbf): `SoundToggle` checks for Web Audio once. Without it, no button is drawn and the first-click listener isn't added.

**What it taught:** a failure in one browser can be two things at once. Those tests can't run on this build, but the reason they couldn't showed a real gap. And Error Boundaries only cover rendering, so a click handler has to look after itself.

---

## 18. The street's cars were invisible

**Found by:** me, looking at the live site. **Fixed by:** Claude.

**Symptom:** at night the road looked empty. I spotted it myself on the live site: each car was only two small lights sliding along, with nothing around them.

**Reproduce:**
1. Check out `f46de75`, build it and serve it.
2. Open `/orders` in the dark theme on a wide screen, so the road shows below the machine.
3. Wait for the lights to cross the bottom of the window. There is no car around them.

**Tool:** my own eyes. All the browser checks passed, because they only asked whether the street's parts moved cheaply. Then a screenshot with each car's animation paused in the middle of the road, which made it obvious.

**Root cause:** the CSS gave each car two radial gradients and nothing else. Its note said "Headlights and taillights are just gradients, so they need no image". That saved a file and never drew a car. On a dark road, two dots read as nothing.

**Fix:** [`9536c63`](https://github.com/sunnyisabunny/10x-shop-sunnyisabunny/commit/9536c63): each car is now a drawing with a body, lit windows and a headlight beam, and it still moves with `transform` only. The lanes also run the way they do in Japan, with the near lane going left.

**What it taught:** a check that something moves correctly says nothing about whether anyone can see it. Over 150 checks passed on the extras, and a person looking at the page found this in seconds.

