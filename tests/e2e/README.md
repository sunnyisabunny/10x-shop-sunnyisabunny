# Browser tests

These scripts drive the real shop in real browsers with [Playwright](https://playwright.dev), and they found most of the bugs in [`DEBUG-LOG.md`](../../DEBUG-LOG.md). Claude wrote them while building the shop. Until 10 November 2026 they lived outside this repo. They moved here unchanged, except for their first line and the folder `flow-bonus.mjs` saves its screenshots to.

## What each one checks

| File | What it checks | Passing in Chromium |
|---|---|---|
| `flow-core.mjs` | The CORE paths: catalog, product, cart, login guard, checkout, logout landing, slow and failing API, the 404 page, no sideways scrolling | 73 |
| `flow-catalog.mjs` | Search with debounce, category, sort, pages, state kept in the URL, Back and Forward, a stale answer arriving late, Retry | 51 |
| `flow-full.mjs` | Promo code, shipping, reviews, orders and their status, Profile, Formik forms, lazy routes, theme, and re-runs of code-review findings | 206 |
| `flow-quality.mjs` | Keyboard-only path, 375px on every route, reduced motion, Georgian browser locale, corrupted storage, and whether the rain repaints | 61 |
| `flow-bonus.mjs` | Every BONUS feature: grid and list, wishlist, printable invoice, price filter, Checkout in steps, address book, Endless | 195 |
| `flow-extras.mjs` | The extras: the street, sound, the cat, the tray, receipt, truck, keypad, shake and the easter egg | 195 |
| `a11y.mjs` | axe on 11 routes at 375px and 1440px, plus every link and button at least 44px tall | |
| `run-all.mjs` | Runs the flows in order and prints one table. With `--save`, keeps every log in `results/` | |

Firefox and WebKit pass fewer of some flows, for reasons that aren't bugs. [`COMPATIBILITY.md`](../../COMPATIBILITY.md) has their counts and explains each difference.

## Running them

1. **Install the browsers once.** Either `npx playwright install chromium firefox webkit`, or point Playwright at browsers that are already on the machine:
   - Git Bash: `export PLAYWRIGHT_BROWSERS_PATH='E:\playwright-browsers'`
   - PowerShell: `$env:PLAYWRIGHT_BROWSERS_PATH = 'E:\playwright-browsers'`
2. **Terminal 1:** `npm run e2e:serve`. It builds the shop and serves the production build at `http://127.0.0.1:4173`. The flows need the production build, because two of them block requests by its file names.
3. **Terminal 2:** `npm run e2e`. That runs all six flows in Chromium. Some other ways to run it:
   - `npm run e2e -- firefox webkit` for other browsers.
   - `npm run e2e -- --only=core,catalog` for some flows.
   - `npm run e2e -- chromium firefox webkit --save` to keep the results in `results/<date>/`.
4. **Accessibility:** `npm run e2e:a11y -- http://127.0.0.1:4173 dark`, then again with `light`. To audit only some pages, add them after the theme, for example `/,/cart`. In Git Bash, run `export MSYS_NO_PATHCONV=1` first, or Git Bash rewrites `/` into its own install folder and the audit opens a broken address.

Every check prints `PASS` or `FAIL` with its name. The last line gives the counts, and the exit code is 0 only when everything passed.

## Why they don't run in CI

- **They call the live DummyJSON API.** A slow or unavailable API would fail CI for reasons that have nothing to do with the code.
- **Their counts differ by browser** for reasons explained in COMPATIBILITY.md, so a single pass mark wouldn't mean much.
- **CI runs the unit tests in `tests/unit` instead.** They need no network and no browser.
