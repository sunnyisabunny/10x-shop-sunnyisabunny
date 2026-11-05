/**
 * NOTE: the shared frame around every page: the street, the machine's cabinet, the header and the footer.
 * Why it exists: PRD P0.1 wants one Layout route, so the Header is written once rather than five times.
 * Connects to: `routes/AppRoutes.tsx` makes this the parent route, and `<Outlet />` is where the
 * current page appears.
 */
import { Outlet, useLocation } from "react-router";
import ErrorBoundary from "../ui/ErrorBoundary";
import Header from "./Header";
import ScrollToTop from "./ScrollToTop";

/**
 * The night street behind the machine. All decoration, so `aria-hidden` keeps it away from screen readers.
 * The signs read 自動販売機 ("vending machine") and 営業中 ("open for business").
 */
function Street() {
  return (
    <div className="street" aria-hidden="true">
      <div className="rain">
        <i className="far" />
        <i />
      </div>
      <div className="sign top-[150px] left-[44px] text-(--sign-a)" lang="ja">
        自動販売機
      </div>
      <div className="sign top-[340px] right-[44px] text-(--sign-b)" lang="ja">
        営業中
      </div>
    </div>
  );
}

/** The machine's base, with the small print. Honest about the fact that nothing here can really be bought. */
function Footer() {
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge bg-steel-raised px-3.5 py-3 text-[13px] text-ink-soft tablet:rounded-b-lg tablet:px-6">
      <span
        aria-hidden="true"
        className="h-4 w-28 rounded-xs bg-[repeating-linear-gradient(90deg,#05070c_0_3px,transparent_3px_7px)]"
      />
      <span>Prices in USD. No purchase necessary. No purchase possible.</span>
      <span className="desktop:ml-auto">A student project. Product data from DummyJSON.</span>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <ScrollToTop />
      <Street />
      <div className="tablet:px-6 tablet:pt-[72px] tablet:pb-[88px]">
        <div className="relative mx-auto max-w-[1200px] bg-steel tablet:rounded-t-[18px] tablet:rounded-b-lg tablet:shadow-[inset_0_0_0_1px_var(--edge),0_44px_90px_rgb(0_0_0/0.55),0_0_140px_var(--machine-glow)]">
          <Header />
          {/* `key` gives each path a fresh boundary. Without it, after one crash the error
              message would stay on screen on every page you visit next. */}
          <main className="min-h-[50vh]">
            <ErrorBoundary key={pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
}
