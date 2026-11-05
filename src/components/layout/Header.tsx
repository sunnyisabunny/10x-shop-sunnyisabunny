/**
 * NOTE: the machine's marquee: the neon wordmark and the main navigation.
 * Why it exists: PRD P0.3. It sits in `Layout`, so it is written once and appears on every page.
 * Connects to: `Layout.tsx`, and React Router's NavLink for the "you are here" highlight.
 */
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { formatItemCount } from "../../utils/format";

/**
 * NavLink calls this with `isActive`, so the current page can be highlighted (PRD P0.1).
 * min-h-11 keeps each link at 44px, the spec's minimum tap size.
 */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base = "inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold no-underline transition-colors duration-150 hover:bg-steel-raised hover:text-ink";
  return isActive ? `${base} text-ink shadow-[inset_0_-2px_0_var(--color-pink)]` : `${base} text-ink-soft`;
}

/**
 * The cart badge, styled as the machine's coin counter. The PRD says it shows the total quantity and
 * hides at 0. padStart keeps two digits, like a real LED display.
 * Two versions of the number: people see "04", and screen readers hear "4 items" from the `sr-only` text.
 */
function CoinCounter({ count, className = "" }: { count: number; className?: string }) {
  if (count === 0) {
    return null;
  }
  return (
    <span className={className}>
      <span
        aria-hidden="true"
        className="led-text inline-block min-w-[42px] rounded bg-led-panel px-[7px] py-px text-center text-[21px] leading-[1.35] shadow-[inset_0_0_0_1px_rgb(255_182_39/0.22),inset_0_0_12px_rgb(255_182_39/0.12)]"
      >
        {String(count).padStart(2, "0")}
      </span>
      <span className="sr-only">{formatItemCount(count)}</span>
    </span>
  );
}

export default function Header() {
  /** Whether the phone menu is open. Above 480px the links always show, so this has no effect there. */
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, isLoggedIn, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  /** Closes the phone menu after a tap. Without this it would stay open over the new page. */
  const closeMenu = () => setMenuOpen(false);

  /** PRD P0.3: logging out returns to the catalog, and the cart is deliberately left alone. */
  function handleLogout() {
    closeMenu();
    logout();
    navigate("/");
  }

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-marquee px-3.5 py-2.5 shadow-[inset_0_1px_0_var(--edge-bright)] tablet:rounded-t-[18px] tablet:gap-x-7 tablet:px-6 tablet:py-4">
      <Link to="/" onClick={closeMenu} className="flex min-h-11 items-center gap-3.5 no-underline">
        <span className="neon text-[32px] tablet:text-[46px]">
          10<span className="inline-block animate-flicker">X</span> Shop
        </span>
        <span className="hidden whitespace-nowrap text-ink-soft desktop:inline">Open all night.</span>
      </Link>

      {/* On a phone the links are folded away, so the counter stays visible beside the burger. An empty
          cart shows nothing here. The Cart link is still in the menu. */}
      {itemCount > 0 && (
        <Link to="/cart" onClick={closeMenu} className="inline-flex min-h-11 items-center gap-1 tablet:hidden">
          <span className="sr-only">Cart</span>
          <CoinCounter count={itemCount} />
        </Link>
      )}

      <button
        type="button"
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-controls="main-nav"
        onClick={() => setMenuOpen((open) => !open)}
        className="ml-auto inline-flex size-11 items-center justify-center rounded-md text-ink tablet:hidden"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <nav
        id="main-nav"
        aria-label="Main"
        className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-1 tablet:ml-auto tablet:flex tablet:w-auto tablet:flex-row tablet:flex-wrap tablet:items-center`}
      >
        {/* `end` means exact match. Without it, "/" counts as a prefix of every path and Catalog always looks active. */}
        <NavLink to="/" end onClick={closeMenu} className={navLinkClass}>
          Catalog
        </NavLink>
        <NavLink to="/cart" onClick={closeMenu} className={navLinkClass}>
          Cart
          <CoinCounter count={itemCount} className="max-tablet:hidden" />
        </NavLink>
        {isLoggedIn ? (
          <>
            <span className="inline-flex min-h-11 items-center px-3 text-ink-soft">{user?.username}</span>
            <button type="button" onClick={handleLogout} className={navLinkClass({ isActive: false })}>
              Log out
            </button>
          </>
        ) : (
          <NavLink to="/login" onClick={closeMenu} className={navLinkClass}>
            Log in
          </NavLink>
        )}
      </nav>
    </header>
  );
}
