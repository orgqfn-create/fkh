import React from 'react';
import { useStore } from '../context/StoreContext';

export const Footer: React.FC = () => {
  const { config, setActiveTab } = useStore();

  return (
    <footer className="mt-12 px-4 md:px-8 pb-24 md:pb-12 pt-8 border-t border-outline-variant/20 flex flex-col items-center text-center max-w-6xl mx-auto w-full">
      <div className="w-full flex items-center justify-center gap-2 mb-4 opacity-50">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary" />
        <span className="material-symbols-outlined text-primary text-[16px]">flare</span>
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary" />
      </div>

      <p className="font-[var(--font-display)] text-lg sm:text-xl text-primary mb-1 font-semibold">
        A Royal Legacy of Smoked Perfection
      </p>
      <p className="text-[13px] text-on-surface-variant max-w-md mb-5 leading-relaxed">
        Slow-cooked sigdi charcoal delicacies, aromatic karahis, and inherited spice secrets since 1978.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-5 text-xs">
        <span className="font-semibold text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[16px]">schedule</span>
          Daily {config.operatingHours}
        </span>
        <span className="text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
          {config.addressLine}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 mb-5 text-xs font-semibold text-on-surface-variant">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          BBQ Showcase
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('menu-bbq')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Digital Menu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cart-order')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          WhatsApp Checkout
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('admin-panel')}
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Operations Panel
        </button>
      </div>

      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
        © 2026 Fayyaz Kabaab House. All Rights Reserved.
      </p>
    </footer>
  );
};
