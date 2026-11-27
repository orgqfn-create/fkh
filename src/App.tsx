import React from 'react';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ToastNotification } from './components/ToastNotification';
import { StoreProvider, useStore } from './context/StoreContext';
import { AdminPage } from './pages/AdminPage';
import { CartCheckoutPage } from './pages/CartCheckoutPage';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';

const AppShell: React.FC = () => {
  const { activeTab } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <main className="flex-1 flex flex-col pt-[76px] pb-20 md:pb-8">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'menu-bbq' && <MenuPage />}
        {activeTab === 'cart-order' && <CartCheckoutPage />}
        {activeTab === 'admin-panel' && <AdminPage />}
        <Footer />
      </main>
      <BottomNav />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
