import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CartProvider from './context/CartProvider.jsx';
import SiteHeader from './components/SiteHeader/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter/SiteFooter.jsx';
import CartDrawer from './components/CartDrawer/CartDrawer.jsx';
import Home from './pages/Home/Home.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SiteFooter />
        <CartDrawer />
      </CartProvider>
    </BrowserRouter>
  );
}
