/**
 * NOTE: the gate in front of pages that need a login (PRD P0.2).
 * Why it exists: a guest opening Checkout must go to Login and come back afterwards. Having one gate
 * means no page needs its own login check.
 * Connects to: `AppRoutes.tsx` nests protected pages inside this, and `LoginPage` reads `from`.
 *
 * This is a convenience, not security. All the code runs in the visitor's browser, so a real app would
 * also check on the server.
 */
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    // `state.from` remembers where they were going, and LoginPage sends them back there.
    // `replace` swaps this URL in history. Without it, pressing Back after login would hit this
    // redirect again and trap them.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
