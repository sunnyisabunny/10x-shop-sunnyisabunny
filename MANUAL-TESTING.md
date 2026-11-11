# Manual testing

I tested the live site by hand, in Edge on my computer and in my phone's browser. This file records what I did and what I saw.

| | Edge | Phone |
|---|---|---|
| Tested by | ალექსანდრე საკანდელიძე | ალექსანდრე საკანდელიძე |
| Date | 11.11.2026 |
| Device and system | Windows 11 PC | Google Pixel 7, Android |
| Browser and version | Edge 155.0.4283.45 | – |
| Site | https://10x-shop-sunnyisabunny.vercel.app | same |
| Screen width | – | – |

## Results

| # | What I did | What should happen | Edge | Phone | Notes |
|---|---|---|---|---|---|
| **Catalog** |
| 1 | Opened the site | Products load, with grey placeholders first |✓|✓|✓|
| 2 | Typed `phone` in Search | Results update after I stop typing, and the address shows `?q=phone` |✓|✓|✓|
| 3 | Picked a category | The search clears, and only that category shows |✓|✓|✓|
| 4 | Sorted by Price: low to high | The order changes, with the note about list price |✓|✓|✓|
| 5 | Went to page 2, then pressed Back | Page 2, then page 1 again |✓|✓|✓|
| 6 | Set a price range | Only products in range, and the counts follow |✓|✓|✓|
| 7 | Switched to the list view, and to Endless | The layout changes, and Endless loads more as I scroll |✓|✓|✓|
| 8 | Searched for `zzzz` | "No products found." with Clear filters |✓|✓|✓|
| **Product** |
| 9 | Opened a product | Photos, price, stock, quantity, reviews, related products |✓|✓|✓|
| 10 | Opened product 117 | Shows "Out of stock", and Add to cart is disabled |✓|✓|✓|
| 11 | Added more than the stock | A message says how many are available, and the cart doesn't change |✓|✓|✓|
| 12 | Wrote a review | It appears, and the average changes |✓|✓|✓|
| 13 | Opened `/products/abc` and `/nope` | The not-found page |✓|✓|✓|
| **Cart** |
| 14 | Changed a quantity and removed a line | The totals update straight away |✓|✓|✓|
| 15 | Applied `10x10`, then `abc` | "Discount (10X10 −10%)", then "Invalid promo code" |✓|✓|✓|
| 16 | Checked shipping above and below $100 | Free above, $10 below |✓|✓|✓|
| 17 | Reloaded the page | The cart and the code are still there |✓|✓|✓|
| **Login and Checkout** |
| 18 | Opened Checkout as a guest | Sent to Login, then back to Checkout after logging in |✓|✓|✓|
| 19 | Submitted Login empty, then with a short password | The exact error messages |✓|✓|✓|
| 20 | Went through the three Checkout steps, leaving fields wrong | Errors under the fields, and the button doesn't move |✓|✓|✓|
| 21 | Placed the order | The thank-you message, the order page, and an empty cart |✓|✓|✓|
| **Orders and Profile** |
| 22 | Watched the order for 3 minutes | Processing, then Shipped, then Delivered |✓|✓|✓|
| 23 | Pressed Reorder, and printed the invoice | Items back in the cart, and a clean printed invoice |✓|✓|✓|
| 24 | Saved my profile | My name appears in the header |✓|✓|✓|
| 25 | Logged out, and back in | The cart and the profile are kept |✓|✓|✓|
| 26 | Pressed Clear local data | Cart, orders and wishlist gone, still logged in |✓|✓|✓|
| **Everything else** |
| 27 | Hearted two products and opened Wishlist | Both appear |✓|✓|✓|
| 28 | Switched the theme and reloaded | The theme stays, with no flash |✓|✓|✓|
| 29 | On the phone: the menu button | The menu opens, and closes when I pick a page | – |✓|
| 30 | On the phone: every page | No sideways scrolling, and buttons are easy to tap | – |✓|
| 31 | With only the keyboard: Tab through the catalog, open a product, add to cart, check out | Everything reachable, with a visible focus outline |✓| – | |
| 32 | The extras: street, sound (if supported), the cat, the keypad | They look and sound right |✓| | |

## Problems I found

The only problems i found we're visual glitches in the design, easily re-done and working correctly with AI


