import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BRAND_EMBLEM_URL } from '../data/initialData';
import { TabRoute } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, cartCount, config, setMenuSearchQuery } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  const navItems: { id: TabRoute; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'local_fire_department' },
    { id: 'menu-bbq', label: 'Menu & BBQ', icon: 'restaurant_menu' },
    { id: 'cart-order', label: 'My Order', icon: 'shopping_bag' },
    { id: 'admin-panel', label: 'Admin', icon: 'shield' },
  ];

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMenuSearchQuery(quickQuery);
    setSearchOpen(false);
    setActiveTab('menu-bbq');
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-surface-container-lowest/92 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-outline-variant/20">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
        <div className="max-w-7xl mx-auto h-[72px] px-4 md:px-8 flex items-center justify-between gap-4 pt-safe">
          {/* Brand Zone */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg shrink-0"
          >
            <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center">
              <ImageWithFallback
                src={config.logoUrl || BRAND_EMBLEM_URL}
                alt="Fayyaz Kabaab House Emblem"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-[var(--font-display)] text-[19px] sm:text-[22px] font-semibold text-primary leading-tight tracking-wide whitespace-nowrap">
                Fayyaz Kabaab House
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">
                Authentic Pakistani BBQ
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'cart-order' && cartCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[11px] font-bold tabular-nums">
                      {cartCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              aria-label="Call Pitmaster"
              href={`tel:${config.landline.replace(/\s+/g, '')}`}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">call</span>
            </a>
            <button
              type="button"
              aria-label="Search Menu"
              onClick={() => setSearchOpen((v) => !v)}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {searchOpen ? 'close' : 'search'}
              </span>
            </button>
            <button
              type="button"
              aria-label="Navigation Menu"
              onClick={() => setDrawerOpen((v) => !v)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <button
              type="button"
              aria-label="Operations Admin Panel"
              onClick={() => setActiveTab('admin-panel')}
              title="Open Operations HQ"
              className={`w-9 h-9 rounded-full flex items-center justify-center ml-0.5 transition-all cursor-pointer ${
                activeTab === 'admin-panel'
                  ? 'bg-primary text-on-primary ring-2 ring-primary/40'
                  : 'bg-primary text-on-primary hover:brightness-110'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          </div>
        </div>

        {/* Expandable Quick Search Bar */}
        {searchOpen && (
          <div className="border-t border-outline-variant/20 bg-surface-container-low px-4 md:px-8 py-3">
            <form
              onSubmit={handleQuickSearchSubmit}
              className="max-w-3xl mx-auto flex items-center gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  autoFocus
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Search Seekh Kabaab, Malai Boti, Karahi, Naan..."
                  className="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/60 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider hover:bg-tertiary transition-colors cursor-pointer whitespace-nowrap"
              >
                Find Dish
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm md:hidden flex justify-end"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-surface-container-lowest p-6 flex flex-col justify-between shadow-2xl border-l border-outline-variant/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-5">
                <div className="flex flex-col">
                  <span className="font-[var(--font-display)] text-lg text-primary font-semibold">
                    Fayyaz Kabaab House
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Burns Road Heritage · Est. 1978
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close Menu"
                  className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl flex items-center justify-between text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px]">
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      {item.id === 'cart-order' && cartCount > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                            isActive
                              ? 'bg-on-primary text-primary'
                              : 'bg-primary text-on-primary'
                          }`}
                        >
                          {cartCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/20 space-y-2 text-xs text-on-surface-variant">
              <p className="font-semibold text-primary">{config.operatingHours} Daily</p>
              <p>{config.addressLine}</p>
              <p className="tabular-nums">{config.landline}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
