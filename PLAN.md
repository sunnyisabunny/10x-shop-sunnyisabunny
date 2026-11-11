# 10X Shop: project plan

**Written:** 5 November 2026, before any feature code.
**Author:** sunnyisabunny, with Claude Code as co-author. The key decisions were made as the PRD required. (This line was corrected on 11 November.)
**Hand-in:** 6 November 2026, 23:59 Georgia time. Defence: 7-8 November.

The project window opened on 17 October. Work on this code started on 5 November, in week 3 of the
window, so this plan covers two days and not three weeks. The Git history shows those real dates.

## 1. Goal

Build "10X Shop", an English-language online store as a single-page app, using React 19, strict
TypeScript, Tailwind CSS v4, Vite and React Router, with products from the DummyJSON API. Login and
checkout are local simulations: there is no real authentication, no real payment and no card data.

A buyer should be able to find a product, compare prices, fill a cart, place an order and follow it.
The shop should load fast, work on any device and not break when something goes wrong.

## 2. Scope by module

CORE is built, deployed and tagged first. FULL starts only after that, then BONUS, then the extras.

| Module | CORE | FULL | BONUS |
|---|---|---|---|
| React | Components, props, children, useState, useEffect, map and key, controlled Login and Checkout, Router, Context, Cart | useReducer, custom hooks, Formik + Yup on Login, Sign Up and password reset (simulated), Orders, Profile, reviews, related products, promo code, 3 extra Checkout fields | Wishlist, grid/list toggle, printable invoice, multi-step checkout, price-range filter, address book, infinite scroll |
| TypeScript | Strict mode, no `any`, typed props, state and API data, `typecheck` at 0 errors | Generics, ApiClient, ApiError, Cart, Order and StorageService classes, type guards, unions, utility types | `@/` path alias |
| Tailwind CSS | v4 through the Vite plugin, utilities, flex and grid, responsive layout, hover, focus and disabled | `@theme` tokens | Dark mode, custom variants and utilities |
| Optimization | Works at 375px and on desktop, no sideways scroll, Error Boundary, `DEBUG-LOG.md` with 3 real bugs | Lazy routes and images, Lighthouse before and after, `COMPATIBILITY.md`, 5 real bugs | |
| Practical project | README, PLAN, REPORT, deploy, real Git history | 20+ Issues, board, milestones, 8+ PRs linked to Issues, demo video, slides | |

### Deliberately not built
- **Luhn card check:** it needs card fields, and the spec bans those.
- **Order history from `/carts/user/{id}`:** it needs a real user, and login here is simulated.
- **Out of scope in the annex:** zoom, share, compare, review editing, save for later, several promo codes, gift wrap, delivery method, order cancelling, password change, avatar upload, account deletion, search history.

### Beyond the spec
These eight small extras are not in the documents. The spec discourages undocumented features, so each
one lives in `src/extras/`, adds no library, and nothing required depends on it. `REPORT.md` lists them.
Item drop, Shake the machine, Keypad, 10X overload easter egg, LED ticker, Receipt printing, Delivery
tracker, Night-shift cat.

## 3. Design

"Night Vending": the shop is a lit vending machine on a rainy street in Tokyo at night.
- The product grid is the machine's front, and each product sits in a slot of bright, lit glass.
- Amber is the machine's LED readout: prices and counts. Pink always means act.
- The daylight theme is a white enamel machine.
- The spec's exact English texts stay word for word. Japanese text is decoration only, hidden from screen readers.

**Exception to "CORE first":** design tokens go in from the first feature branch. Restyling every
component later would cost time and teach nothing. The theme switch and the light palette still wait for FULL.

## 4. How the document conflicts were resolved

| Conflict | Decision |
|---|---|
| Password "any non-empty" vs "at least 6 characters" | Require 6. This satisfies both, and the sample login `emilys / emilyspass` still works |
| Error Boundary and DEBUG-LOG listed as both CORE and FULL | CORE. The PRD's rule favours its own CORE/FULL definitions |
| Lighthouse report and browser table listed as both | Done either way |
| Checkout table has leftover rows | 4 fields at CORE. FULL adds Phone, Postal code and Country, whose rows are not marked as removed. Never card fields |
| Orders page shows "Card •••• 4242", but the types say no payment method | Left out |
| Dark mode listed as both FULL and BONUS | Built, so it counts either way |

## 5. Our own acceptance criteria

The documents leave these without criteria, and every feature needs some.

- **Sign Up:** Username, Email, Password and Confirm fields. It logs the user in and keeps only the username and email. No password is ever stored, and there is no accounts key in storage.
- **Password reset:** an Email field only. It shows one fixed line saying this is simulated, and stores nothing.
- **Over-stock message:** the annex asks for an exact toast but gives no text. It is: `Only {stock} available. You already have {n} in your cart.`
- **Login return:** after login the user returns to the protected page they asked for, not only `/checkout`.
- **Price sort caption:** the API sorts by list price while cards show the discounted price, so the catalog says: `Sorted by list price, before discount.`

## 6. Work breakdown

All work falls in week 3 of the window. Hours are estimates and include notes and review.

| Epic | Tasks | Level | Hours |
|---|---|---|---|
| Docs | Plan, README, config notes, repo, CI, Issues, board | CORE | 1.0 |
| Auth | Types and app shell | CORE | 1.25 |
| Auth | AuthContext, controlled Login, guest redirect | CORE | 0.6 |
| Catalog | Fetch with loading, error and empty states; ProductCard; ProductGrid | CORE | 0.75 |
| Cart | CartContext, badge, Cart page | CORE | 0.85 |
| Product | Details page, 404 handling, gallery, quantity, Add to cart | CORE | 0.65 |
| Checkout | 4-field form, order summary, confirmation | CORE | 0.65 |
| Quality | 375px fixes, state audit, outcome checks, DEBUG-LOG, tag `v1.0-core` | CORE | 1.0 |
| Catalog | ApiClient, ApiError, useFetch, Skeleton, Retry, toasts | FULL | 0.75 |
| Catalog | Search, category, sort, pagination, URL state | FULL | 1.15 |
| Cart | Reducer, Cart class, StorageService, guards, promo, shipping, stock | FULL | 1.1 |
| Product | Tabs, reviews, related products | FULL | 0.75 |
| Orders | Order class, list, details, status simulation, Reorder, extra Checkout fields | FULL | 0.9 |
| Profile | Theme, light palette, Profile page, Clear local data | FULL | 0.85 |
| Auth | Formik + Yup, Sign Up, Reset | FULL | 0.6 |
| Quality | Lazy routes, memo where measured, Lighthouse, browser table, tag `v2.0-full` | FULL | 1.0 |
| Bonus | Grid/list, wishlist, invoice, price filter, multi-step, address book, infinite scroll | BONUS | 3.1 |
| Extras | The eight extras | Extra | 2.5 |
| Docs | Final QA, REPORT, video script, slides, submission | CORE | 2.0 |

**Order if time runs short:** extras go first (Keypad, then 10X overload, Shake, Delivery tracker,
Receipt, cat, Item drop, ticker), then BONUS (infinite scroll, address book, multi-step, price filter,
invoice, wishlist, grid/list). Inside FULL, Sign Up and Reset go first, then memo work. Search, filter, sort,
Formik, Orders and Profile are never cut. Code freezes at 21:00 on 6 November.

## 7. Risks

| Risk | What reduces it |
|---|---|
| DummyJSON is down or slow, for example at the defence | A clear error with Retry, a request timeout, a recorded demo video, a phone hotspot as backup. No automatic JSON fallback: it would hide the Offline error state the spec asks to demonstrate, and product images would still be remote |
| Too much code to explain at the defence | Every file and block has a written note beside it. Adjustable values are named constants in one file. Extras are cut first |
| Lighthouse score under 85 on mobile | Reserved image space, preconnect, measured on the deployed site with a median of 3 runs |
| Formik misbehaves on React 19 | Only the `useFormik` hook, tried in a short test first. If it fails, the CORE form stays and `REPORT.md` says so |
| Rain animation hurts performance | Transform-only layers, off on phones and for reduced motion, measured by a script. If it fails, the rain goes |
| Code works on Windows but not on Vercel | CI on Linux with Node 22, 24 and 26 |

## 8. Definition of Done

A task is done when all of these are true:
1. The behaviour matches the PRD's outcome for it, and exact texts match word for word.
2. `npm run typecheck`, `npm run lint` and `npm run build` pass, locally and in CI.
3. It works at 375px and on desktop, with no sideways scroll.
4. Loading, error and empty states are handled wherever data is involved.
5. Every new file, component, function, hook, effect and piece of state has a note explaining it.
6. It is merged through a PR linked to its Issue, unless it is setup or docs.

## 9. Process honesty

- Commits carry their real dates. Nothing is backdated.
- `DEBUG-LOG.md` lists only real bugs with real commits, so it may have fewer than five entries.
- The FULL targets of commits on 15+ different days and three weekly notes cannot be met from a 5 November start. There is one real progress note, and `REPORT.md` says so.
- AI use is allowed in full by the PRD, and it is recorded in `ai-log.md`.
