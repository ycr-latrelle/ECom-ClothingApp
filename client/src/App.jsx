import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import CartProvider from "./context/CartProvider.jsx";
import SiteHeader from "./components/SiteHeader/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter/SiteFooter.jsx";
import CartDrawer from "./components/CartDrawer/CartDrawer.jsx";
import QuickCheckout from "./components/QuickCheckout/QuickCheckout.jsx";
import Home from "./pages/Home/Home.jsx";
import Shop from "./pages/Shop/Shop.jsx";
import About from "./pages/About/About.jsx";
import Journal from "./pages/Journal/Journal.jsx";
import JournalArticle from "./pages/JournalArticle/JournalArticle.jsx";
import Checkout from "./pages/Checkout/Checkout.jsx";
import Account from "./pages/Account/Account.jsx";
import RequireAuth from "./components/RequireAuth/RequireAuth.jsx";
import OrderConfirmation from "./pages/OrderConfirmation/OrderConfirmation.jsx";

import AuthProvider from "./context/AuthProvider.jsx";
import ProductsProvider from "./context/ProductsProvider.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ProductsProvider>
        <AuthProvider>
          <CartProvider>
            <SiteHeader />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/pre-order" element={<Shop preorderOnly />} />
              <Route path="/about" element={<About />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:slug" element={<JournalArticle />} />
              <Route path="/account" element={<Account />} />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <SiteFooter />
            <CartDrawer />
            <QuickCheckout />
          </CartProvider>
        </AuthProvider>
      </ProductsProvider>
    </BrowserRouter>
  );
}
