# Browser compatibility

Results per page, browser and device (PRD O3). Screenshots are in [`docs/compat`](docs/compat), named `browser-device-page.jpg`.

## How this was tested

- **Chromium, Firefox and WebKit:** driven by automated browser tests through Playwright, on the production build. Each engine ran the same checks: the core flow, the catalog flow, the FULL features, and the quality checks such as the keyboard path and the phone width.
- **WebKit is close to Safari, but it isn't Safari.** It is the engine Safari uses, in Playwright's own build on Windows. I don't have a Mac or an iPhone here to confirm it in real Safari.
- **Phone width** is browser emulation at 375px, so it checks layout, not a real touch screen.
- **Edge and a real phone** are checked by hand, and those rows are filled in after that pass.

## Results

| Page | Chromium desktop | Chromium 375px | Firefox desktop | Firefox 375px | WebKit desktop | WebKit 375px | Edge (by hand) | Real phone (by hand) |
|---|---|---|---|---|---|---|---|---|
| Catalog | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |
| Product details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |
| Cart | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |
| Login, Sign Up, Reset | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |
| Checkout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |
| Orders and order details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |
| Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Not yet | Not yet |

## Problems found and fixed

| Browser | Problem | Fix |
|---|---|---|
| Firefox | Rejected the variable price font and logged an error on every page | A static font file (`DEBUG-LOG.md` entry 2) |

## Browser differences that aren't bugs

- **WebKit** reports a request cancelled by leaving the page as a page error reading `due to access control checks`. The tests ignore that message, because a real failure would also leave the page without products, and other checks would catch it.
- **Firefox** logs `Image corrupt or truncated` when leaving a page interrupts a product image download. The page isn't affected.
- **Safari and WebKit** leave links out of the Tab order by default. It is a browser setting, and a page can't change it. Buttons and form fields are reachable as usual, and links can be reached with Option+Tab in real Safari. In the WebKit test, the two link steps focus the link directly.

## Accessibility

Audited with axe on every route in both themes, at 375px and 1440px, with no violations. Every link, button and field on those routes is at least 44px tall, apart from card title links, whose clickable area covers the whole card. The keyboard path from the PRD works end to end in Chromium and Firefox: Tab through the catalog, Enter opens a product, Tab to Add to cart, then fill in Checkout and place the order.
