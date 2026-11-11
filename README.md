# 10X Shop

An online store built as a vending machine on a rainy street at night. Open all night.

## About

10X Shop is a single-page online store where a buyer can browse products, compare prices, fill a cart and place an order. The interface treats the shop as one lit vending machine: the product grid is the machine's front, prices are LED displays, and the cart counter is a coin counter.

It is the graduation project for the 10X Front-end program. Login and checkout are local simulations, so no real account or payment exists. No purchase is possible.

## Live Demo

[10x-shop-sunnyisabunny.vercel.app](https://10x-shop-sunnyisabunny.vercel.app)

**Demo video:** [watch the 3-minute walkthrough](https://10x-shop-sunnyisabunny.vercel.app/demo/10x-shop-demo.mp4). It shows the full flow on the live site in a real browser. A script drives the recording, and the titles, captions, zooms and sound were added in editing with [HyperFrames](https://github.com/heygen-com/hyperframes). There is no voice-over. The two shots where a request is blocked or its data is broken say so on screen.

## Test Account

Login is simulated, so there is no real account to find. Any username works with a password of at least 6 characters, for example:

| Username | Password |
|---|---|
| `emilys` | `emilyspass` |

## Features

### CORE
- Catalog loaded from the DummyJSON API, with loading, error and empty states
- Product page with a photo gallery, discounted price, stock status and quantity
- Shared cart with quantity changes, removal, totals and a coin-counter badge, saved across reloads
- Simulated login with validation, and a Checkout guard that returns you after logging in
- Checkout form with validation, and a local order confirmation
- Responsive layout at 375px, tablet and desktop, with no sideways scroll
- 404 page and an Error Boundary

### FULL
- Search, category filter, five sort options and pagination, all kept in the URL, so refresh, Back and shared links work
- Skeletons while loading, Retry on failure, and toast messages
- Cart on `useReducer`, with the promo code `10X10`, free shipping from $100 and stock limits
- Product tabs, reviews saved in the browser, and related products
- Orders with a status that moves on by itself, order details and Reorder
- Login on Formik and Yup, with simulated Sign Up and password reset
- Profile page, a dark and light theme, and Clear local data
- Every page loads on demand, and `memo` is used only where a measurement justified it

### BONUS
- Grid and list view, kept in the URL
- A wishlist, saved in the browser
- A printable invoice for each order
- A price range filter, on the price shown after discount
- Checkout in three steps: Contact, Delivery and Review
- An address book: save an address at Checkout, pick it next time, manage them on Profile
- A Pages/Endless switch: Endless loads 12 more as you scroll, with a Load more button as well. A refresh or Back keeps your filters but starts again from the top, and a price range turns Endless off

### Beyond the spec

Fun features nobody asked for. Each one lives in `src/extras`, nothing required depends on it, and deleting that folder and the lines tagged `EXTRA:` leaves a complete shop.

- A street behind the machine: a Tokyo street at night, and a small Japanese port town by day, with koi, gulls and boats. It is drawn as SVG, and phones don't download it
- Background sound for each theme, generated in the browser. It stays off until you press the speaker
- An LED ticker under the header, whose free-shipping line reads the real cart
- A night-shift cat on top of the machine, which wakes when something is added to the cart, and jumps if you click it or shake the machine
- A product falls from its slot into a pickup tray at the bottom of the machine
- A receipt prints after an order. It charges nothing, and says so
- A small truck crosses a strip under an order's timeline, in step with its status
- A keypad beside the catalog on wide screens: type a slot code such as `B2` and that slot lights up. The real keyboard works too
- A Shake the machine button. Not recommended
- An easter egg: type `1`, `0`, `X` anywhere that isn't a form field

## Tech Stack

- **React 19** with **TypeScript** in strict mode
- **Tailwind CSS v4** through its Vite plugin
- **React Router**
- **Formik** and **Yup** for the login forms
- **Vite**
- **DummyJSON** for product data
- **Vercel** for hosting

## Architecture

```
src/
  api/         ApiClient and ApiError, plus the product requests
  types/       the shape of every kind of data
  models/      classes: Cart, Order, StorageService
  context/     shared state: login, cart, theme, toasts
  hooks/       useFetch, useDebounce, useLocalStorage, useOrders and more
  routes/      the URL map and the login guard
  pages/       one component per page, each loaded on demand
  components/
    ui/        buttons, form fields, spinner, messages, error boundary
    layout/    the shared frame and header
    product/   cards, grid, prices, gallery, toolbar, reviews
    cart/      cart lines, totals, checkout form
    order/     status badge and timeline
  utils/       constants, formatting, validation, URL rules, type guards
  extras/      everything beyond the spec. The shop still works if this folder is deleted
```

Imports that leave their own folder use the `@/` alias, so `@/utils/format` means `src/utils/format`. Files in the same folder use `./`, which shows they belong together.

**How data flows:** a user action calls an event handler, which updates state. The cart goes through a reducer, so every change follows one set of rules, and an effect then saves the result. Filters, sorting and the page number live in the URL rather than in state, so the URL is the single source of truth, and `useFetch` loads whatever it describes. A newer request cancels an older one with `AbortController`, so a slow answer can't overwrite a newer one.

Every file and block has a written note beside it explaining what it does, why it is done that way, and what breaks without it.

## How to Run

```bash
git clone https://github.com/sunnyisabunny/10x-shop-sunnyisabunny.git
cd 10x-shop-sunnyisabunny
npm install
npm run dev
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Checks types, then builds for production |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Checks types with `tsc --noEmit` |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs the unit tests in `tests/unit` |
| `npm run e2e:serve` | Builds the shop and serves it for the browser tests |
| `npm run e2e` | Runs the browser tests in `tests/e2e`. See their [README](tests/e2e/README.md) |
| `npm run e2e:a11y` | Runs the accessibility audit |

## Documents

- [`PLAN.md`](PLAN.md): the plan, written before any feature code
- [`REPORT.md`](REPORT.md): planned against delivered
- [`DEBUG-LOG.md`](DEBUG-LOG.md): real bugs and how they were found and fixed
- [`COMPATIBILITY.md`](COMPATIBILITY.md): results per page, browser and device
- [`ai-log.md`](ai-log.md): how AI was used
- [`docs/CONFIG-NOTES.md`](docs/CONFIG-NOTES.md): what each config file does and why
- [`tests/e2e/README.md`](tests/e2e/README.md): what each browser test checks, and how to run them
- [Projects board](https://github.com/users/sunnyisabunny/projects/1): the task list, with every Issue

## Credits

- Built by [sunnyisabunny](https://github.com/sunnyisabunny) as the graduation project for the 10X Front-end program.
- Claude Code wrote nearly all of the code, the tests and the notes, working from the PRD and my decisions. See [`ai-log.md`](ai-log.md) and the "How AI was used" section of [`REPORT.md`](REPORT.md).
- Product data from [DummyJSON](https://dummyjson.com).
- In the demo video: music by Sascha Ende at [ende.app](https://ende.app/en) (Happy Beats / Business Moves Vol. 12, CC BY 4.0), and sound effects by [Kenney](https://kenney.nl) and unicae_games (CC0). The rain, waves and machine sounds are the shop's own.
- Fonts under the SIL Open Font License: [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans), [Doto](https://fonts.google.com/specimen/Doto), [Tilt Neon](https://fonts.google.com/specimen/Tilt+Neon), [DotGothic16](https://fonts.google.com/specimen/DotGothic16). The lettering on the street's signs also uses [Dela Gothic One](https://fonts.google.com/specimen/Dela+Gothic+One) and [Yuji Boku](https://fonts.google.com/specimen/Yuji+Boku).
