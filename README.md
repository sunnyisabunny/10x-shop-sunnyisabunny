# 10X Shop

An online store built as a vending machine on a rainy street at night. Open all night.

## About

10X Shop is a single-page online store where a buyer can browse products, compare prices, fill a cart and place an order. The interface treats the shop as one lit vending machine: the product grid is the machine's front, prices are LED displays, and the cart counter is a coin counter.

It is the graduation project for the 10X Front-end program. Login and checkout are local simulations, so no real account or payment exists. No purchase is possible.

## Live Demo

Coming with the first deploy.

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

## Tech Stack

- **React 19** with **TypeScript** in strict mode
- **Tailwind CSS v4** through its Vite plugin
- **React Router**
- **Vite**
- **DummyJSON** for product data
- **Vercel** for hosting

## Architecture

```
src/
  api/         requests to DummyJSON
  types/       the shape of every kind of data
  context/     shared state: login and cart
  routes/      the URL map and the login guard
  pages/       one component per page
  components/
    ui/        buttons, form fields, messages, error boundary
    layout/    the shared frame and header
    product/   cards, grid, prices, gallery
    cart/      cart lines, totals, checkout form
  utils/       constants, formatting, validation
```

**How data flows:** a user action calls an event handler, which updates state with `useState` or a Context function. State updates are immutable, so React sees a new value and redraws. Product data comes from `useEffect`, and the loading, error and empty states are chosen by conditional rendering.

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

## Documents

- [`PLAN.md`](PLAN.md): the plan, written before any feature code
- [`REPORT.md`](REPORT.md): planned against delivered
- [`DEBUG-LOG.md`](DEBUG-LOG.md): real bugs and how they were found and fixed
- [`ai-log.md`](ai-log.md): how AI was used
- [`docs/CONFIG-NOTES.md`](docs/CONFIG-NOTES.md): what each config file does and why

## Credits

- Built by [sunnyisabunny](https://github.com/sunnyisabunny) as the graduation project for the 10X Front-end program.
- Developed with Claude Code as a pair-programming assistant. See [`ai-log.md`](ai-log.md).
- Product data from [DummyJSON](https://dummyjson.com).
- Fonts under the SIL Open Font License: [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans), [Doto](https://fonts.google.com/specimen/Doto), [Tilt Neon](https://fonts.google.com/specimen/Tilt+Neon), [DotGothic16](https://fonts.google.com/specimen/DotGothic16).
