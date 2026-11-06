/**
 * NOTE: the map from URL to page (PRD A1.2), with each page loaded only when it is opened (PRD O1).
 * Why it exists: one place to see every page the app has.
 * Connects to: `Layout`, which is the parent, so each page below appears inside its `<Outlet />`. The `<Suspense>`
 * in `Layout` shows the spinner while a page's code downloads.
 *
 * `lazy(() => import(...))` makes Vite put that page in its own file. A first visit downloads only the catalog,
 * and Formik and Yup only arrive with the login pages. `Layout` and `ProtectedRoute` are imported normally, because
 * every page needs them straight away. A failed download reaches the ErrorBoundary in `Layout`, which offers Reload.
 * Reload is the real fix there: `lazy` remembers a failed download, so going to another page and back won't retry it.
 */
import { lazy } from "react";
import { Route, Routes } from "react-router";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

const CartPage = lazy(() => import("../pages/CartPage"));
const CatalogPage = lazy(() => import("../pages/CatalogPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const OrderDetailPage = lazy(() => import("../pages/OrderDetailPage"));
const OrdersPage = lazy(() => import("../pages/OrdersPage"));
const ProductPage = lazy(() => import("../pages/ProductPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const SignUpPage = lazy(() => import("../pages/SignUpPage"));
const WishlistPage = lazy(() => import("../pages/WishlistPage"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        {/* Everything nested here needs a login. ProtectedRoute decides whether to show it. */}
        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* `*` matches anything not listed above, so unknown URLs get the 404 page. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
