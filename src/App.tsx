/**
 * NOTE: the root component. It sets up routing for the whole app.
 * Why it exists: the router must wrap everything that uses links or reads the URL.
 * Connects to: `main.tsx` draws this, and `AppRoutes` decides which page shows.
 */
import { BrowserRouter } from "react-router";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    // This outer boundary catches a crash in the Header or Layout itself. Layout has its own for pages.
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              {/* useTransitions={false} makes a route change commit together with state changes. By default the
                  router delays its update as a transition, so on logout ProtectedRoute would see "logged out" while
                  the URL is still /checkout, and redirect to /login instead of the catalog. See DEBUG-LOG.md. */}
              <BrowserRouter useTransitions={false}>
                <AppRoutes />
              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
