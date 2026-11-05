/**
 * NOTE: the root component. It sets up routing for the whole app.
 * Why it exists: the router must wrap everything that uses links or reads the URL.
 * Connects to: `main.tsx` draws this, and `AppRoutes` decides which page shows.
 */
import { BrowserRouter } from "react-router";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    // This outer boundary catches a crash in the Header or Layout itself. Layout has its own for pages.
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
