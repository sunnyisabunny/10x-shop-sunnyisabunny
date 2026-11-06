# Report

**Status:** final report. Its numbers come from scripts that read the real repo, the real build and the live site, not from memory. Those scripts are my own tools and live outside this repo, so the graded code stays only the shop.

## Planned and delivered

| Module | CORE | FULL | BONUS |
|---|---|---|---|
| React | Done | Done: `useReducer`, custom hooks, Formik and Yup, Orders, Profile, reviews, related products, promo code | Done: wishlist, grid and list view, printable invoice, Checkout in three steps, price range filter, address book, Endless |
| TypeScript | Done: strict mode, no `any`, 0 type errors | Done: generics, `ApiClient`, `ApiError`, `Cart`, `Order` and `StorageService` classes, type guards, unions, utility types | |
| Tailwind CSS | Done: v4 plugin, utilities, grid and flex, responsive, hover, focus and disabled | Done: `@theme` tokens | Done: dark mode, custom variants and utilities |
| Optimization | Done: 375px and desktop, Error Boundary, `DEBUG-LOG.md` | Done: lazy routes, measured `memo`, Lighthouse before and after, `COMPATIBILITY.md`, 15 real bugs in the log | |
| Practical project | Done: README, PLAN, REPORT, Git history, deploy | 63 Issues, a Projects board, milestones and PRs linked to Issues. Not fully met: see below | |

## Beyond the spec

These weren't asked for, and nothing above counts them. Each one lives in `src/extras`, the shop only reaches them through lines tagged `EXTRA:`, and they load after the page, inside an Error Boundary that draws nothing if they fail. I tested that by blocking their file, and the shop works as normal. I also deleted `src/extras` and the tagged lines on a throwaway branch: 2,519 lines went, and typecheck, lint, build and the core and catalog browser checks all still passed. The places they draw are set aside in advance, so the page doesn't jump when they arrive. The exception is the receipt, which can't know its height. It only appears right after an order, and its code has been fetched by then.

- **The street:** a Tokyo street at night and a small Japanese port town by day. Moving parts only use `transform` and `opacity`. Over 5 seconds at 1920px, in both themes, Chrome reported 0 paints and 0 layouts, including while the train crosses. Phones download none of the art.
- **Sound:** generated in the browser with the Web Audio API, so there are no audio files. It stays off until pressed. Its levels were measured rather than judged by the AI that wrote it, which can't hear.
- **LED ticker and night-shift cat:** the ticker's free-shipping line reads the real cart, so it can't disagree with what the cart charges.
- **Item drop and pickup tray:** the tray stays off Checkout. Each step shortens the form, which slid the tray under the pointer, so the second click of a double click opened the cart and lost what had been typed.
- **Receipt:** real order data. It says no payment was taken.
- **Delivery tracker:** timed from the same steps as the order's status, with no timer running.
- **Keypad:** reads the slot codes the cards already write into the page. It reads the physical key, so it works with a Georgian keyboard layout. Its letter keys can't be switched off, which falls short of WCAG 2.1.4 for people using speech input. They only find a product and change nothing, and this is an extra, so I left it.
- **Shake the machine:** lights a random slot and says so. It puts nothing in the cart, because a shop that adds things you didn't ask for is the wrong joke.
- **10X overload:** type `1`, `0`, `X`. Nothing flashes more than twice in its 1.8 seconds, which is under the safe limit of three flashes a second.

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

Mobile preset, median of 3 runs per page. The before and after columns compare production builds on my own machine, because those are the only like-for-like numbers: "before" was taken before the site was deployed. The live site's numbers are below them. The images are in [`docs/lighthouse`](docs/lighthouse).

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

**On the live site**, at commit `630d62c`:

| Metric | `/` | `/products/1` |
|---|---|---|
| Performance | 99 | 93 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| LCP | 0.9 s | 3.0 s |
| CLS | 0 | 0 |
| Total weight | 241 kB | 247 kB |

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

Read from `git` and GitHub by a script.

| | |
|---|---|
| Commits, not counting merges | 88 |
| Days with commits | 2 (5 and 6 November) |
| Merged PRs, all linked to Issues | 22 |
| Issues, closed | 50 of 63 |
| Bugs in `DEBUG-LOG.md` | 15 |
| Source files | 78 |
| Lines of source, of which notes | 6,244, of which 1,383 are notes |

### Hours

Time from the first commit to the end of each stage, read from commit times and tags. This is wall-clock time building with an AI assistant, not learning time, and it includes breaks of under a few minutes.

| Stage | Finished | Hours |
|---|---|---|
| Setup and CORE | 5 Nov 21:58 | 1.4 |
| FULL | 6 Nov 01:30 | 3.5 |
| BONUS, with the scenes and sound built alongside | 6 Nov 06:48 | 5.3 |

**Hours per epic can't be measured honestly.** I often committed in batches at the end of a stretch of work, so commit times put hours on the wrong feature. One PR, the wishlist, shows two hours that were really spent on the scenes. So here are the plan's estimates by epic instead. They are estimates, not measurements.

| Epic | Planned hours |
|---|---|
| Docs | 3.0 |
| Auth | 2.45 |
| Catalog | 2.65 |
| Cart | 1.95 |
| Product | 1.4 |
| Checkout | 0.65 |
| Orders | 0.9 |
| Profile | 0.85 |
| Quality | 2.0 |
| BONUS | 3.1 |
| Extras | 2.5 |
| **Total** | **21.45** |

## The three hardest problems

1. **A lost click.** Checking a field on blur removed its error line in the middle of a click, so the button moved away between mouse down and mouse up. It looked like a random failure until a test isolated it (entry 7). The fix was a reserved line for every error, so validation can't move anything.
2. **Logging out landed on the wrong page.** React applied the logout and the navigation at different priorities, so the login guard ran in between (entry 1).
3. **A failed order saved twice.** The hook updated the screen before it knew the save had worked, so a retry after full storage saved the old order and a new one (entry 8).

## What I would do differently

- **Start in week 1.** Everything I couldn't earn honestly comes from starting on 5 November: commits on 15 days, three progress notes, and a dated plan in week 1.
- **Deploy on the first day.** I deployed near the end, so every measurement waited on it, and the before-and-after comparison had to stay on my own machine.
- **Keep the browser tests in the repo.** I kept them out so the graded code stayed only the shop. That means CI can't run them and the ✓ marks in `COMPATIBILITY.md` rest on my word. The price of including them would have been small.
- **Build less, and understand more of it.** Two days of work with an AI produced far more code than I could read closely in the same time. Fewer features would have left more time for reading and explaining them, and the defence is where that counts.

## How AI was used

Claude Code wrote nearly all of the code, the tests and the notes beside the code, working from the PRD and from my decisions. I decided the scope, the design direction, the extras and what to cut, and I reviewed the result in a browser. `ai-log.md` quotes my prompts word for word.

I didn't take findings from its code reviews on trust. Most had to fail in a real browser test before anything changed, and some did not survive: two tabs overwriting each other's orders turned out to be unreachable. I rejected others on purpose, such as giving orders an owner, because the annex's model has none, and migrating an old cart format, because the site had never been deployed.

It also made mistakes that testing caught, which is why I don't take its word for things. Its first fix for the footer's layout shift did nothing (entry 14), and its first version of Endless requested the same products twice (entry 15).

## Code review

`/code-review` ran on the work before merging. Most of its findings were reproduced with browser tests before being fixed. The rest, such as stale comments and some of the extras' sound timing, were fixed from reading the code.

`/security-review` couldn't run from this setup, because the session isn't started inside the repo. These were checked by hand instead:
- No raw HTML (`innerHTML`, `dangerouslySetInnerHTML`) anywhere in `src`.
- No secrets in the repo, and no password or card field in any saved data.
- CI has read-only permissions.
- `npm audit` reports 0 vulnerabilities.

## Limits

- Login and checkout are simulations, as the PRD requires. Nothing is sent to a server and no payment happens.
- Anyone can edit browser storage. Saved data is checked when read, so a bad value can't break the shop, but none of this is real security, and it isn't meant to be.
