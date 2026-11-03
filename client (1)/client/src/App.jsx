import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import CartProvider from "./context/CartProvider.jsx";
import AuthPanelProvider from "./context/AuthPanelProvider.jsx";
import AuthPanel from "./components/AuthPanel/AuthPanel.jsx";

import SiteHeader from "./components/SiteHeader/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter/SiteFooter.jsx";
import CartDrawer from "./components/CartDrawer/CartDrawer.jsx";
import QuickCheckout from "./components/QuickCheckout/QuickCheckout.jsx";

import Home from "./pages/Home/Home.jsx";
import Shop from "./pages/Shop/Shop.jsx";
import About from "./pages/About/About.jsx";
import Journal from "./pages/Journal/Journal.jsx";
import JournalArticle from "./pages/JournalArticle/JournalArticle.jsx";
import Policy from "./pages/Policy/Policy.jsx";

import RequireAuth from "./components/RequireAuth/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin/RequireAdmin.jsx";

import AdminLayout from "./pages/Admin/AdminLayout.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import AdminModule from "./pages/Admin/AdminModule.jsx";
import AdminProducts from "./pages/Admin/AdminProducts.jsx";

const Checkout = lazy(() => import("./pages/Checkout/Checkout.jsx"));
const Account = lazy(() => import("./pages/Account/Account.jsx"));
const MyOrders = lazy(() => import("./pages/Orders/MyOrders.jsx"));

const OrderConfirmation = lazy(
  () => import("./pages/OrderConfirmation/OrderConfirmation.jsx"),
);

import AuthProvider from "./context/AuthProvider.jsx";
import ProductsProvider from "./context/ProductsProvider.jsx";

function AppRoutes() {
  const location = useLocation();

  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <CartProvider>
      {!isAdmin && <SiteHeader />}

      <Suspense
        fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}
      >
        <Routes>
          {/* Storefront */}

          <Route path="/" element={<Home />} />

          <Route path="/shop" element={<Shop />} />

          <Route path="/pre-order" element={<Shop preorderOnly />} />

          <Route path="/about" element={<About />} />

          <Route path="/journal" element={<Journal />} />

          <Route path="/journal/:slug" element={<JournalArticle />} />

          {/* Customer account */}

          <Route path="/account" element={<Account />} />

          <Route
            path="/account/orders"
            element={
              <RequireAuth
                reason="Sign in to see your orders."
                message="You need to be signed in to see your orders."
              >
                <MyOrders />
              </RequireAuth>
            }
          />

          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            }
          />

          <Route
            path="/order-confirmation/:orderId"
            element={<OrderConfirmation />}
          />

          <Route path="/payment-policy" element={<Policy />} />

          <Route path="/shipping-policy" element={<Policy />} />

          {/* Admin dashboard */}

          <Route
            path="/admin"
            element={
              <RequireAuth
                reason="Sign in to access the administration workspace."
                message="You must sign in before opening the administration workspace."
              >
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />

            <Route path="products" element={<AdminProducts />} />

            <Route
              path="inventory"
              element={
                <AdminModule
                  title="Inventory"
                  description="Monitor stock levels and product availability."
                />
              }
            />

            <Route
              path="orders"
              element={
                <AdminModule
                  title="Orders"
                  description="Review and manage customer orders."
                />
              }
            />

            <Route
              path="payments"
              element={
                <AdminModule
                  title="Payments"
                  description="Review payment submissions and receipts."
                />
              }
            />

            <Route
              path="shipments"
              element={
                <AdminModule
                  title="Shipments"
                  description="Manage delivery and tracking information."
                />
              }
            />

            <Route
              path="sellers"
              element={
                <AdminModule
                  title="Sellers"
                  description="Manage seller accounts and permissions."
                />
              }
            />

            <Route
              path="reports"
              element={
                <AdminModule
                  title="Reports"
                  description="Review store performance and business reports."
                />
              }
            />

            <Route
              path="settings"
              element={
                <AdminModule
                  title="Settings"
                  description="Configure your store and administrative preferences."
                />
              }
            />

            <Route
              path="audit-logs"
              element={
                <AdminModule
                  title="Audit Logs"
                  description="Review administrative activity and system events."
                />
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {!isAdmin && (
        <>
          <SiteFooter />
          <CartDrawer />
          <QuickCheckout />
        </>
      )}

      <AuthPanel />
    </CartProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProductsProvider>
        <AuthProvider>
          <AuthPanelProvider>
            <AppRoutes />
          </AuthPanelProvider>
        </AuthProvider>
      </ProductsProvider>
    </BrowserRouter>
  );
}
