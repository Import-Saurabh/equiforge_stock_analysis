import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nifty50Page from './components/Explore/Nifty50Page';
import App from './App';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ExplorePage from './components/Explore/ExplorePage'; // ✅ NEW
import NotFound from './pages/NotFound';
import StockDetail from './components/Explore/StockDetail';
import './index.css';
import Gain_Loss from './components/Explore/Gain_Loss';
const clerkFrontendApi = "pk_test_c3BsZW5kaWQtbGlvbi0xNi5jbGVyay5hY2NvdW50cy5kZXYk";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkFrontendApi}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>

            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="explore" element={<ExplorePage />} /> {/* ✅ FIXED */}
            <Route path="/nifty50" element={<Nifty50Page />} />
            <Route path="stock/:ticker" element={<StockDetail />} />
            <Route path="gain-loss" element={<Gain_Loss/>}></Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);

