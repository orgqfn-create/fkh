import React from 'react';
import { useStore } from '../context/StoreContext';
import { TabRoute } from '../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, cartCount, config } = useStore();

  const waDigits = config.whatsappLine.replace(/\D/g, '');
  const waHref = `https://wa.me/${waDigits || '923001234567'}?text=${encodeURIComponent(
    'Salam Fayyaz Kabaab House! I would like to place an order.'
  )}`;

  const tabs: { id: TabRoute; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'local_fire_department' },
    { id: 'menu-bbq', label: 'Menu & BBQ', icon: 'restaurant_menu' },
    { id: 'cart-order', label: 'My Order', icon: 'shopping_bag' },
    { id: 'admin-panel', label: 'Admin', icon: 'shield' },
  ];

  return (
    <>
      {/* Floating WhatsApp Quick Order CTA */}
      <a
        aria-label="WhatsApp Quick Order"
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-[24px]">chat</span>
        <span className="absolute -top-1 -right-1 bg-secondary-container text-on-secondary-container text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-surface">
          ORDER
        </span>
      </a>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Tab Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.6)] border-t border-outline-variant/20"
      >
        <div className="flex justify-around items-center h-16 px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-20 h-14 transition-colors gap-0.5 cursor-pointer ${
                  isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">
                    {tab.icon}
                  </span>
                  {tab.id === 'cart-order' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-primary text-on-primary font-bold text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-surface-container-lowest tabular-nums">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
