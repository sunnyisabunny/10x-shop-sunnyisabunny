/**
 * NOTE: the map from URL to page (PRD A1.2).
 * Why it exists: one place to see every page the app has.
 * Connects to: `Layout`, which is the parent, so each page below appears inside its `<Outlet />`.
 */
import { Route, Routes } from "react-router";
import Layout from "../components/layout/Layout";
import CartPage from "../pages/CartPage";
import CatalogPage from "../pages/CatalogPage";
import CheckoutPage from "../pages/CheckoutPage";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import OrderDetailPage from "../pages/OrderDetailPage";
import OrdersPage from "../pages/OrdersPage";
import ProductPage from "../pages/ProductPage";
import ProfilePage from "../pages/ProfilePage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
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
