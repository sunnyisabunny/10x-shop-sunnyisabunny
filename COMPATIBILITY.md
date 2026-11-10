# Browser compatibility

Results per page, browser and device (PRD O3). Screenshots are in [`docs/compat`](docs/compat), named `browser-device-page.jpg`.

## How this was tested

- **Chromium, Firefox and WebKit:** driven by automated browser tests through Playwright, on the production build. Each engine ran the same checks: the core flow, the catalog flow, the FULL features, the BONUS features, the extras, and the quality checks such as the keyboard path and the phone width. The differences are the keyboard path and sound on WebKit, explained below, and two checks that use Chromium's developer tools and so run only there: the paint counts for the street, and the level of the audio signal.
- **The live site:** the same checks and the accessibility audit also ran against [the deployed site](https://10x-shop-sunnyisabunny.vercel.app) in Chromium, including opening `/products/5` directly and reloading it.
- **The test scripts aren't in this repo.** They are my own tools, kept in a separate folder so that the graded code stays only the shop. So the ✓ marks here are results I am reporting, and CI runs typecheck, lint, the unit tests and build, but not these browser tests. I can run the scripts at the defence.
- **WebKit is close to Safari, but it isn't Safari.** It is the engine Safari uses, in Playwright's own build on Windows. I don't have a Mac or an iPhone here to confirm it in real Safari.
- **Phone width** is browser emulation at 375px, so it checks layout, not a real touch screen.
- **Edge and a real phone** were checked by hand.

Checks passed on the final production build, with 0 failures. The counts differ because of the differences explained in this file.

| Flow | Chromium | Firefox | WebKit |
|---|---|---|---|
| Core | 73 | 73 | 73 |
| Catalog | 51 | 51 | 51 |
| FULL features | 206 | 206 | 206 |
| Quality | 61 | 59 | 59 |
| BONUS features | 195 | 195 | 195 |
| Extras | 195 | 190 | 174 |

The Chromium column also passed on the live site.

## Results

| Page | Chromium desktop | Chromium 375px | Firefox desktop | Firefox 375px | WebKit desktop | WebKit 375px | Edge (by hand) | Real phone (by hand) |
|---|---|---|---|---|---|---|---|---|
| Catalog | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Product details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cart | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Login, Sign Up, Reset | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Checkout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Orders and order details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wishlist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Problems found and fixed

| Browser | Problem | Fix |
|---|---|---|
| Firefox | Rejected the variable price font and logged an error on every page | A static font file (`DEBUG-LOG.md` entry 2) |
| WebKit | The speaker button did nothing and threw an error, because this build has no Web Audio | No button is drawn in a browser without it (`DEBUG-LOG.md` entry 17) |

## Browser differences that aren't bugs

- **WebKit** reports a request cancelled by leaving the page as a page error reading `due to access control checks`. The tests ignore that message, because a real failure would also leave the page without products, and other checks would catch it.
- **Firefox** logs `Image corrupt or truncated` when leaving a page interrupts a product image download. The page isn't affected.
- **WebKit on Windows has no Web Audio.** Playwright's build has no `AudioContext`, so the sound checks run only in Chromium and Firefox, and sound hasn't been tested in real Safari.
- **WebKit on Windows draws bold text lighter** in the reading font, which shows in its screenshots. It measures the text at the right weight, with the same widths as the other engines to within a hundredth of a pixel, so nothing moves. I couldn't check this in real Safari.
- **Safari and WebKit** leave links out of the Tab order by default. It is a browser setting, and a page can't change it. Buttons and form fields are reachable as usual, and links can be reached with Option+Tab in real Safari. In the WebKit test, the two link steps focus the link directly.

## Accessibility

Audited with axe on every route in both themes, at 375px and 1440px, with no violations. Every link, button and field on those routes is at least 44px tall, apart from card title links, whose clickable area covers the whole card. The keyboard path from the PRD works end to end in Chromium and Firefox: Tab through the catalog, Enter opens a product, Tab to Add to cart, then fill in Checkout and place the order.
