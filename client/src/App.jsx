import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteHeader from './components/SiteHeader/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter/SiteFooter.jsx';
import Home from './pages/Home/Home.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </BrowserRouter>
  );
}