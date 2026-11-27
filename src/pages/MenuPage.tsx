import React, { useMemo, useState } from 'react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import { MenuCategory, MenuItem, SpiceTier } from '../types';

const SECTION_META: Record<
  MenuCategory,
  { kicker: string; title: string; urdu: string; tag?: string }
> = {
  bbq: {
    kicker: 'Koyla Angara Craft',
    title: 'BBQ Specials',
    urdu: 'سیخ و بوٹی',
    tag: 'Sigdi Smoked',
  },
  karahi: {
    kicker: 'Cast Iron & Clay Pots',
    title: 'Karahi & Handi',
    urdu: 'کڑاہی و ہانڈی',
    tag: 'Live Cooked',
  },
  breads: {
    kicker: 'Clay Oven Mastercraft',
    title: 'Fresh Tandoor & Breads',
    urdu: 'نان و پراٹھا',
  },
  sides: {
    kicker: 'Cooling Accompaniments',
    title: 'Raita & Extras',
    urdu: 'رائتہ و سلاد',
  },
  drinks: {
    kicker: 'Ice Chilled Sips',
    title: 'Beverages',
    urdu: 'مشروبات ٹھنڈے',
  },
  deals: {
    kicker: 'Royal Feasts',
    title: 'Family Dawat Deals',
    urdu: 'دعوت مینیو',
  },
};

export const MenuPage: React.FC = () => {
  const {
    categories,
    menuItems,
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    decrementCartItem,
    setActiveTab,
    menuSearchQuery,
    setMenuSearchQuery,
    config,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<'all' | MenuCategory>('all');
  const [selectedSpice, setSelectedSpice] = useState<'all' | SpiceTier>('all');
  const [variantSelection, setVariantSelection] = useState<Record<string, 'half' | 'full'>>({
    chx_karahi: 'half',
    mutton_karahi: 'half',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const categoryTabs = useMemo(
    () => [
      { id: 'all' as const, label: 'All Flavors' },
      ...activeCategories.map((c) => ({ id: c.categoryId, label: c.categoryName })),
    ],
    [activeCategories]
  );

  const filteredItems = useMemo(() => {
    const q = menuSearchQuery.trim().toLowerCase();
    const activeCatSet = new Set(activeCategories.map((c) => c.categoryId));
    return menuItems.filter((item) => {
      if (activeCatSet.size > 0 && !activeCatSet.has(item.category)) return false;
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSpice = selectedSpice === 'all' || item.spice === selectedSpice;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.urduTitle && item.urduTitle.includes(q));
      return matchCat && matchSpice && matchQuery;
    });
  }, [activeCategories, menuItems, selectedCategory, selectedSpice, menuSearchQuery]);

  const groupedSections = useMemo(() => {
    const order = activeCategories.map((c) => c.categoryId);
    return order
      .map((cat) => ({
        category: cat,
        catDoc: activeCategories.find((c) => c.categoryId === cat),
        items: filteredItems.filter((i) => i.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [activeCategories, filteredItems]);

  const getActiveVariant = (item: MenuItem) => {
    if (!item.variants || item.variants.length === 0) return null;
    const chosenKey = variantSelection[item.id] || item.variants[0].key;
    return item.variants.find((v) => v.key === chosenKey) || item.variants[0];
  };

  const getCartKey = (item: MenuItem) => {
    const variant = getActiveVariant(item);
    return variant ? `${item.id}_${variant.key}` : item.id;
  };

  const getCartPrice = (item: MenuItem) => {
    const variant = getActiveVariant(item);
    return variant ? variant.price : item.price;
  };

  const getCartTitle = (item: MenuItem) => {
    const variant = getActiveVariant(item);
    return variant ? `${item.title} (${variant.key === 'half' ? 'Half' : 'Full'})` : item.title;
  };

  const getQty = (cartId: string) => cart.find((c) => c.id === cartId)?.qty ?? 0;

  const waDigits = config.whatsappLine.replace(/\D/g, '') || '923001234567';
  const waQuickHref = useMemo(() => {
    const lines = cart.map(
      (i) => `• ${i.qty}x ${i.title} (Rs. ${(i.price * i.qty).toLocaleString('en-PK')})`
    );
    const total = cartSubtotal + (cart.length > 0 ? 50 : 0);
    const msg = `Salam Fayyaz Kabaab House! I would like to order:\n${lines.join('\n')}\n\nTotal: Rs. ${total.toLocaleString('en-PK')}`;
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
  }, [cart, cartSubtotal, waDigits]);

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* Atmospheric Live Smoke & Hearth Ambience Hero */}
      <section className="relative w-full overflow-hidden bg-surface-container-lowest border-b border-outline-variant/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary-container/20 via-surface-container-lowest/80 to-surface-container-lowest pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-6 relative z-10">
          {/* Live Grill Ticker */}
          <div className="flex items-center justify-between bg-surface-container-low/90 backdrop-blur-md px-4 py-2 rounded-xl mb-5 shadow-md border border-outline-variant/15">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                local_fire_department
              </span>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                Koyla Pit: Fresh batches on live charcoal
              </span>
            </div>
            <span className="text-[11px] text-primary font-bold shrink-0 tabular-nums">
              15-20m wait
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                <span className="text-primary">Burns Road Heritage</span>
                <span className="text-outline">·</span>
                <span className="text-secondary">Est. 1978</span>
              </div>
              <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl text-on-surface font-semibold">
                The Royal Dastarkhwan
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl">
                Slow-charred sigdi skewers, clay-oven tandoori delights, and thick iron-wok karahis
                steeped in ancestral spices.
              </p>
            </div>

            {/* Search & Spice Filter */}
            <div className="w-full md:w-[440px] flex flex-col gap-2.5">
              <div className="relative flex items-center w-full">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  placeholder="Search Seekh Kabaab, Malai Boti, Karahi..."
                  className="w-full bg-surface-container px-10 py-2.5 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:bg-surface-container-high border border-outline-variant/20 focus:border-primary/40 transition-all"
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMenuSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mr-1 flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[14px] text-secondary">tune</span>
                  Spice:
                </span>
                {(
                  [
                    { id: 'all', label: 'All Tiers' },
                    { id: 'mild', label: 'Mild Malai' },
                    { id: 'medium', label: 'Medium Zaiqa' },
                    { id: 'spicy', label: 'Angara Heat' },
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedSpice(tier.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedSpice === tier.id
                        ? 'bg-primary text-on-primary font-bold'
                        : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Category Navigation Ribbon */}
      <section className="sticky top-[72px] z-30 bg-surface-container-lowest/95 backdrop-blur-md shadow-md py-2.5 border-b border-outline-variant/15">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex gap-2 overflow-x-auto no-scrollbar items-center">
          {categoryTabs.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Culinary Catalog Listing */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-8">
        {groupedSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-3">
              <span className="material-symbols-outlined text-[28px]">search_off</span>
            </div>
            <p className="text-lg text-on-surface font-semibold">No Delicacy Found</p>
            <p className="text-xs text-on-surface-variant max-w-xs mt-1">
              We couldn&apos;t find items matching your search. Check spelling or reset your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setMenuSearchQuery('');
                setSelectedCategory('all');
                setSelectedSpice('all');
              }}
              className="mt-4 px-5 py-2 rounded-xl bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-bright transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          groupedSections.map(({ category, catDoc, items }) => {
            const meta = SECTION_META[category] || {
              kicker: 'House Selection',
              title: catDoc?.categoryName || category,
              urdu: '',
            };
            return (
              <section key={category} className="flex flex-col gap-3">
                <div className="flex items-end justify-between border-b border-outline-variant/15 pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {meta.kicker}
                    </span>
                    <h2 className="font-[var(--font-display)] text-xl sm:text-2xl text-on-surface flex items-center gap-2">
                      <span>{catDoc?.categoryName || meta.title}</span>
                      {meta.urdu && (
                        <span className="text-secondary text-sm font-sans">{meta.urdu}</span>
                      )}
                    </h2>
                  </div>
                  {meta.tag && (
                    <span className="text-[11px] font-semibold text-on-surface-variant">
                      {meta.tag}
                    </span>
                  )}
                </div>

                <div
                  className={`grid gap-3.5 ${
                    category === 'sides' || category === 'drinks'
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 md:grid-cols-2'
                  }`}
                >
                  {items.map((item) => {
                    const cartId = getCartKey(item);
                    const price = getCartPrice(item);
                    const titleWithVariant = getCartTitle(item);
                    const qty = getQty(cartId);

                    return (
                      <article
                        key={item.id}
                        className="bg-surface-container-low rounded-xl overflow-hidden shadow-md border border-outline-variant/15 hover:border-primary/30 transition-all flex flex-col justify-between"
                      >
                        {item.image && (category === 'bbq' || category === 'karahi') && item.badge ? (
                          <div className="relative w-full h-44 bg-surface-container-high overflow-hidden">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              fallbackLabel={item.title}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/20 to-transparent" />
                            <span
                              className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded text-[10px] font-bold shadow-sm uppercase tracking-wide ${
                                item.badgeVariant === 'secondary'
                                  ? 'bg-secondary-container text-on-secondary-container'
                                  : 'bg-primary-container text-on-primary-container'
                              }`}
                            >
                              {item.badge}
                            </span>
                            {item.spiceLabel && (
                              <span className="absolute bottom-2.5 right-2.5 bg-surface-container-lowest/85 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-semibold text-primary flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">
                                  {item.spice === 'mild' ? 'spa' : 'local_fire_department'}
                                </span>
                                {item.spiceLabel}
                              </span>
                            )}
                          </div>
                        ) : null}

                        <div className="p-3.5 flex flex-col gap-2 flex-1 justify-between">
                          <div className="flex gap-3 items-start">
                            {item.image && !(item.badge && (category === 'bbq' || category === 'karahi')) && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                                <ImageWithFallback
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  fallbackLabel={item.title}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <h3 className="text-[15px] text-on-surface font-semibold truncate">
                                  {item.title}
                                </h3>
                                <span className="text-[15px] text-primary font-bold tabular-nums shrink-0">
                                  Rs. {price.toLocaleString('en-PK')}
                                </span>
                              </div>
                              {item.urduTitle && (
                                <p className="text-[11px] text-on-surface-variant italic">
                                  {item.urduTitle}
                                </p>
                              )}
                              <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Portion Variant Toggle for Karahis */}
                          {item.variants && item.variants.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-lg">
                              {item.variants.map((v) => {
                                const isSelected =
                                  (variantSelection[item.id] || item.variants![0].key) === v.key;
                                return (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() =>
                                      setVariantSelection((prev) => ({
                                        ...prev,
                                        [item.id]: v.key,
                                      }))
                                    }
                                    className={`flex-1 py-1.5 px-2 rounded text-[11px] transition-all cursor-pointer tabular-nums ${
                                      isSelected
                                        ? 'bg-primary text-on-primary font-bold'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                                  >
                                    {v.label} · Rs. {v.price.toLocaleString('en-PK')}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className="pt-2 flex items-center justify-between bg-surface-container-lowest/50 px-2.5 py-2 rounded-lg">
                            <span className="text-[11px] text-on-surface-variant truncate pr-2">
                              {item.portionLabel ||
                                (item.spice === 'spicy'
                                  ? 'Angara Heat'
                                  : item.spice === 'medium'
                                  ? 'Medium Spice'
                                  : 'Mild & Fresh')}
                            </span>

                            {!item.inStock ? (
                              <span className="text-[11px] font-bold text-secondary px-2 py-1 rounded bg-surface-container-high">
                                Out of Stock
                              </span>
                            ) : qty > 0 ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => decrementCartItem(cartId)}
                                  className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-bright cursor-pointer"
                                  aria-label={`Decrease ${titleWithVariant}`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    remove
                                  </span>
                                </button>
                                <span className="text-xs text-primary font-bold w-4 text-center tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    addToCart({
                                      id: cartId,
                                      menuItemId: item.id,
                                      variantKey: getActiveVariant(item)?.key,
                                      title: titleWithVariant,
                                      subtitle: item.portionLabel,
                                      price,
                                      image: item.image,
                                    })
                                  }
                                  className="w-7 h-7 rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center hover:bg-tertiary cursor-pointer"
                                  aria-label={`Increase ${titleWithVariant}`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  addToCart({
                                    id: cartId,
                                    menuItemId: item.id,
                                    variantKey: getActiveVariant(item)?.key,
                                    title: titleWithVariant,
                                    subtitle: item.portionLabel,
                                    price,
                                    image: item.image,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-tertiary transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer shrink-0"
                              >
                                <span className="material-symbols-outlined text-[15px]">add</span>
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Floating Mini-Cart Tray Bar */}
      <div className="sticky bottom-18 md:bottom-4 z-30 max-w-3xl mx-auto w-full px-4">
        <div
          className={`w-full bg-surface-container-highest/95 backdrop-blur-xl text-on-surface p-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.65)] border border-primary/25 flex items-center justify-between gap-3 transition-opacity ${
            cartCount === 0 ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              <span className="absolute -top-1.5 -right-1.5 bg-secondary-container text-on-secondary-container text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold tabular-nums">
                {cartCount}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-on-surface font-bold truncate tabular-nums">
                  {cartCount === 0
                    ? 'Empty Tray'
                    : `${cartCount} item${cartCount > 1 ? 's' : ''}`}
                </span>
                <span className="text-on-surface-variant text-xs">·</span>
                <span className="text-xs text-primary font-bold tabular-nums">
                  Rs. {cartSubtotal.toLocaleString('en-PK')}
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant truncate">
                Includes chutneys &amp; fresh greens
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-tertiary transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
          >
            <span>Order Now</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Quick Cart Slide-Over Modal */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[82vh] bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-outline-variant/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-container flex items-center justify-between border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  restaurant
                </span>
                <h3 className="font-[var(--font-display)] text-lg text-on-surface font-semibold">
                  Your Feast Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close Feast Order"
                className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2.5 overflow-y-auto max-h-[45vh]">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] text-primary mb-2">
                    shopping_basket
                  </span>
                  <p className="text-sm">Your grill tray is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-sm text-on-surface font-semibold truncate">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-primary tabular-nums">
                        Rs. {item.price.toLocaleString('en-PK')} each
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => decrementCartItem(item.id)}
                          className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="text-xs text-on-surface font-bold w-4 text-center tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded bg-surface-container-high text-primary flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                      <span className="text-sm text-primary font-bold min-w-[74px] text-right tabular-nums">
                        Rs. {(item.price * item.qty).toLocaleString('en-PK')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-surface-container-low flex flex-col gap-2 border-t border-outline-variant/15">
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Subtotal</span>
                <span className="text-on-surface font-bold tabular-nums">
                  Rs. {cartSubtotal.toLocaleString('en-PK')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Fresh Tandoor Packaging</span>
                <span className="text-on-surface tabular-nums">
                  Rs. {cart.length > 0 ? 50 : 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-base text-on-surface font-bold pt-2 border-t border-outline-variant/15">
                <span>Total Payable</span>
                <span className="text-primary font-bold tabular-nums">
                  Rs. {(cartSubtotal + (cart.length > 0 ? 50 : 0)).toLocaleString('en-PK')}
                </span>
              </div>

              <div className="flex gap-2 mt-2">
                <a
                  href={waQuickHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl bg-[#25D366] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>WhatsApp Order</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setActiveTab('cart-order');
                  }}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1 shadow-md hover:bg-tertiary transition-all cursor-pointer"
                >
                  <span>Full Checkout</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
