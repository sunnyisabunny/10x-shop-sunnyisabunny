# Report

**Status:** at the FULL stage. It is updated as each stage ships. Its numbers come from scripts that read the real repo and the real build, not from memory. Those scripts are my own tools and live outside this repo, so the graded code stays only the shop.

## Planned and delivered

| Module | CORE | FULL |
|---|---|---|
| React | Done | Done: `useReducer`, custom hooks, Formik and Yup, Orders, Profile, reviews, related products, promo code |
| TypeScript | Done: strict mode, no `any`, 0 type errors | Done: generics, `ApiClient`, `ApiError`, `Cart`, `Order` and `StorageService` classes, type guards, unions, utility types |
| Tailwind CSS | Done: v4 plugin, utilities, grid and flex, responsive, hover, focus and disabled | Done: `@theme` tokens, dark mode with a custom variant, custom utilities |
| Optimization | Done: 375px and desktop, Error Boundary, `DEBUG-LOG.md` | Done: lazy routes, measured `memo`, Lighthouse before and after, `COMPATIBILITY.md`, 14 real bugs in the log |
| Practical project | README, PLAN and Git history done. Deploy pending | 63 Issues, a Projects board and milestones. Not fully met: see below |

## What was not done, and why

- **Commits on 15 different days and three weekly notes:** not reachable. Work began on 5 November, so the commits cover 5-6 November and there is one progress note. I did not backdate commits or invent notes.
- **`PLAN.md` in week 1:** it was written before any feature code, but it is dated 5 November, in week 3.
- **Sign Up and password reset:** built as simulations. The annex names them but gives no rules, so `PLAN.md` section 5 has ours. No password is ever stored.
- **Orders per user:** orders are one list per browser, so two usernames on one browser see the same orders. The annex's Order model has no owner field, and step 6 of its happy path only needs them to survive logging out and back in. Profiles are kept per username.

## Choices worth knowing about

- **Price filter:** the API can't filter by price. With a range set, the catalog fetches the whole current list once, with only the card fields, which is about 7 kB compressed for all 194 products, and filters and pages it in the browser. This is the one place all 194 products can load, which the PRD otherwise avoids. Without a range, the catalog loads one page at a time as the PRD asks.
- **One browser, not one user:** orders, saved addresses, the wishlist and the cart belong to the browser, as the annex's data model has them, so two usernames on one browser share them. Profiles are kept per username. With a simulated login that accepts any name, separating them wouldn't protect anything.
- **Endless forgets how far you went:** a refresh or Back keeps the filters but starts again from the top. Returning to the same depth would mean loading every earlier chunk on arrival, and Pages is there for anyone who wants a place to come back to. A price range turns Endless off, because the range needs the whole list in the browser and Endless exists to avoid that.
- **Wishlist prices:** a saved product keeps the price and stock from when it was saved. DummyJSON's data doesn't change, so this can't go wrong here, but a real shop would refresh them.

## Metrics

### Lighthouse

Mobile preset, median of 3 runs per page. So far these come from a production build on my own machine, because the Vercel import is a step I do by hand and it isn't done yet. They will be measured again on the deployed site. The images are in [`docs/lighthouse`](docs/lighthouse).

**Before:** commit `5e7dc76`. **After:** branch `perf/lazy-routes`.

| Metric | `/` before | `/` after | `/products/1` before | `/products/1` after | What changed |
|---|---|---|---|---|---|
| Performance | 100 | 100 | 93 | 92 | No real change. The product photo decides this score, and it only starts loading after the API answers |
| Accessibility | 100 | 100 | 100 | 100 | |
| Best Practices | 100 | 100 | 100 | 100 | |
| SEO | 92 | 100 | 92 | 100 | A real `robots.txt` (`DEBUG-LOG.md` entry 12) |
| LCP | 0.8 s | 0.8 s | 3.2 s | 3.3 s | |
| CLS | 0.001 | 0 | 0.026 | 0.026 | Lazy loading first pushed `/` to 0.114, and that was then fixed (entry 14) |
| Total weight | 256 kB | 235 kB | 262 kB | 245 kB | Formik and Yup left the first load |

### Bundle

| | Before lazy routes | After |
|---|---|---|
| Main chunk, compressed | 124 kB | 75 kB |
| Formik and Yup | In the main chunk | Their own 25 kB chunk, loaded only on the login pages |

The PRD's guide is 250 kB or less for the main chunk.

### Re-renders on one Add to cart

Measured on the dev build with a counter that reads the same flag as the React Profiler.

| Component | Before `memo` | After |
|---|---|---|
| `ProductCard` | 12 | 0 |
| `PriceBlock` | 12 | 0 |
| `StockBadge` | 12 | 0 |

Typing in Search and switching theme didn't redraw any card, so `memo` went on this one component only.

### Rain

The CRM project once repainted the whole screen 60 times a second from a background animation, so this was measured. Over 3 idle seconds on the catalog at 1440px: **0 paints and 0 layouts**.

### Process

Numbers for commits, PRs, Issues and hours are filled in from `git` and GitHub at hand-in.

## Hardest problems so far

1. **A lost click.** Checking a field on blur removed its error line in the middle of a click, so the button moved away between mouse down and mouse up. It looked like a random failure until a test isolated it (entry 7). The fix was a reserved line for every error, so validation can't move anything.
2. **Logging out landed on the wrong page.** React applied the logout and the navigation at different priorities, so the login guard ran in between (entry 1).
3. **A failed order saved twice.** The hook updated the screen before it knew the save had worked, so a retry after full storage saved the old order and a new one (entry 8).

## Code review

`/code-review` ran on the work before merging, and its findings were reproduced with browser tests before being fixed.

`/security-review` couldn't run from this setup, because the session isn't started inside the repo. These were checked by hand instead:
- No raw HTML (`innerHTML`, `dangerouslySetInnerHTML`) anywhere in `src`.
- No secrets in the repo, and no password or card field in any saved data.
- CI has read-only permissions.
- `npm audit` reports 0 vulnerabilities.

## Limits

- Login and checkout are simulations, as the PRD requires. Nothing is sent to a server and no payment happens.
- Anyone can edit browser storage. Saved data is checked when read, so a bad value can't break the shop, but none of this is real security, and it isn't meant to be.
