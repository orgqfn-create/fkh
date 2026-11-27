import React, { useMemo, useState } from 'react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import {
  GEOFENCE_MAP_IMAGE_URL,
  HERO_PLATTER_IMAGE_URL,
  KARAHI_SPOTLIGHT_IMAGE_URL,
} from '../data/initialData';

type HomeFilterTab = 'all' | 'seekh' | 'tikka' | 'bihari';

export const HomePage: React.FC = () => {
  const { menuItems, cart, addToCart, decrementCartItem, setActiveTab, config } =
    useStore();

  const [homeFilter, setHomeFilter] = useState<HomeFilterTab>('all');
  const [karahiSize, setKarahiSize] = useState<'half' | 'full'>('half');
  const [karahiSpice, setKarahiSpice] = useState<'Mild' | 'Medium' | 'Desi Spicy'>('Medium');

  const karahiItem = useMemo(
    () => menuItems.find((m) => m.id === 'chx_karahi'),
    [menuItems]
  );

  const halfKarahiPrice = karahiItem?.variants?.find((v) => v.key === 'half')?.price ?? 1650;
  const fullKarahiPrice = karahiItem?.variants?.find((v) => v.key === 'full')?.price ?? 2950;
  const currentKarahiPrice = karahiSize === 'half' ? halfKarahiPrice : fullKarahiPrice;

  const featuredBBQ = useMemo(() => {
    const bbqItems = menuItems.filter((item) => item.featuredOnHome || item.category === 'bbq');
    if (homeFilter === 'all') return bbqItems.slice(0, 4);
    if (homeFilter === 'seekh') {
      return bbqItems.filter(
        (i) => i.homeCategory === 'seekh' || i.id.includes('seekh') || i.id.includes('malai') || i.id.includes('reshmi')
      );
    }
    if (homeFilter === 'tikka') {
      return bbqItems.filter((i) => i.homeCategory === 'tikka' || i.id.includes('tikka'));
    }
    return bbqItems.filter((i) => i.homeCategory === 'bihari' || i.id.includes('bihari'));
  }, [menuItems, homeFilter]);

  const dealMughal = menuItems.find((m) => m.id === 'deal_mughal_darbar');
  const dealCombo = menuItems.find((m) => m.id === 'deal_bbq_lovers');

  const getCartQty = (id: string) => cart.find((c) => c.id === id)?.qty ?? 0;

  const waDigits = config.whatsappLine.replace(/\D/g, '') || '923001234567';

  return (
    <div className="flex flex-col w-full text-on-surface relative overflow-x-hidden">
      {/* Ambient Radial Ember Glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[500px] h-96 bg-secondary-container/25 blur-[110px] pointer-events-none rounded-full" />
      <div className="absolute top-48 right-0 w-72 h-72 bg-primary/10 blur-[90px] pointer-events-none rounded-full" />

      {/* 1. HERO SECTION */}
      <section className="relative max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Editorial Hero */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high/90 backdrop-blur-md shadow-sm mb-4 border border-outline-variant/20">
              <span className="text-primary text-[14px]">★</span>
              <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
                Master Pitmasters Since 1978
              </span>
              <span className="text-on-surface-variant/50 text-xs">·</span>
              <span className="text-[11px] font-semibold text-on-surface-variant tracking-wider">
                Charcoal Sigri
              </span>
            </div>

            <h1
              className="font-[var(--font-display)] text-3xl sm:text-4xl lg:text-[44px] font-semibold text-primary tracking-tight leading-tight mb-4 max-w-xl"
              style={{ textWrap: 'balance' }}
            >
              Experience the Authentic Taste of Pakistani BBQ
            </h1>

            <p className="text-[15px] text-on-surface-variant max-w-lg mb-6 leading-relaxed">
              Freshly skewered meats, secret ancestral Mughal spices, slow-grilled over red-hot
              tamarind coal. Indulge in Karachi &amp; Lahore&apos;s finest Seekh Kabaabs, Handis, and
              fresh tandoor naans.
            </p>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('menu-bbq')}
                className="py-3.5 px-6 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-tertiary active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Order Online Now</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <a
                href="#dawat-deals"
                className="py-3.5 px-6 rounded-xl bg-surface-container-high/90 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-surface-bright active:scale-95 transition-all whitespace-nowrap border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                <span>Explore Feast Deals</span>
              </a>
            </div>
          </div>

          {/* Right Feature Platter Banner (Sigri Showcase) */}
          <div className="lg:col-span-6 w-full">
            <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low shadow-2xl border border-outline-variant/20">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/90 text-on-secondary-container backdrop-blur-md shadow-md">
                <span className="material-symbols-outlined text-[14px] text-error">
                  local_fire_department
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold">
                  Fresh Off Sigri
                </span>
              </div>
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-surface-container-lowest/85 backdrop-blur-md">
                <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                  Tandoor Hot
                </span>
              </div>

              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <ImageWithFallback
                  src={config.heroBannerUrl || HERO_PLATTER_IMAGE_URL}
                  alt="Royal Charcoal Sigri Platter of sizzling Pakistani Beef Seekh Kabaabs with Roghni Naan and Mint Raita"
                  className="w-full h-full object-cover"
                  fallbackLabel="Royal Charcoal Sigri Platter"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />
              </div>

              <div className="p-4 flex items-center justify-between gap-4 bg-surface-container-low">
                <div className="flex flex-col text-left min-w-0">
                  <span className="font-[var(--font-display)] text-lg sm:text-xl font-medium text-primary leading-tight truncate">
                    Royal Charcoal Sigri Platter
                  </span>
                  <span className="text-xs sm:text-[13px] text-on-surface-variant truncate">
                    Signature charred seekh, roasted peppers &amp; mint raita
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] font-bold uppercase text-outline tracking-wider">
                    Starting at
                  </span>
                  <span className="text-lg sm:text-xl text-primary font-bold tabular-nums">
                    Rs. 890
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK VALUE PROPS */}
      <section className="max-w-6xl mx-auto w-full px-4 md:px-8 py-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 shadow-sm border border-outline-variant/15">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface leading-tight">
                35 Mins Express
              </span>
              <span className="text-[11px] text-on-surface-variant truncate mt-0.5">
                Sizzling &amp; insulated
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 shadow-sm border border-outline-variant/15">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface leading-tight">
                100% Halal Certified
              </span>
              <span className="text-[11px] text-on-surface-variant truncate mt-0.5">
                Hand-slaughtered
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 shadow-sm border border-outline-variant/15">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[18px]">outdoor_grill</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface leading-tight">
                Live Sigri &amp; Clay Tandoor
              </span>
              <span className="text-[11px] text-on-surface-variant truncate mt-0.5">
                Smoked on real coal
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start gap-3 shadow-sm border border-outline-variant/15">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                account_balance_wallet
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface leading-tight">
                Easy Cash &amp; Pay
              </span>
              <span className="text-[11px] text-on-surface-variant truncate mt-0.5">
                JazzCash / EasyPaisa / COD
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE GRILL BANNER */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-3">
        <div className="rounded-xl bg-surface-container-lowest px-4 py-3 flex items-center justify-between gap-4 border border-outline-variant/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
              local_fire_department
            </span>
            <span className="text-[11px] text-primary font-bold uppercase tracking-wider shrink-0">
              Pitmaster Hearth:
            </span>
            <span className="text-xs text-on-surface truncate">
              32 skewers simmering over glowing tamarind coal
            </span>
          </div>
          <span className="text-[11px] text-secondary font-semibold shrink-0">
            Karachi Kitchen
          </span>
        </div>
      </div>

      {/* 3. CHEF'S SIZZLING BBQ SPECIALS */}
      <section id="bbq-specials" className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-end justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[11px] text-secondary uppercase tracking-widest font-bold">
              Royal Charcoal Selection
            </span>
            <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl text-primary font-medium leading-tight">
              Chef&apos;s Sizzling Specials
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('menu-bbq')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>See full menu</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* Menu Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {(
            [
              { id: 'all', label: 'All Charcoal BBQ' },
              { id: 'seekh', label: 'Seekh & Botis' },
              { id: 'tikka', label: 'Clay Oven Tikka' },
              { id: 'bihari', label: 'Bihari & Chops' },
            ] as { id: HomeFilterTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setHomeFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                homeFilter === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dish Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredBBQ.map((dish) => {
            const qty = getCartQty(dish.id);
            return (
              <article
                key={dish.id}
                className="rounded-xl bg-surface-container-low p-3 flex flex-col justify-between shadow-md border border-outline-variant/15 hover:border-primary/30 transition-all"
              >
                <div>
                  <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden mb-3 bg-surface-container-high">
                    <ImageWithFallback
                      src={dish.image}
                      alt={dish.title}
                      className="w-full h-full object-cover"
                      fallbackLabel={dish.title}
                    />
                    {dish.badge && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-md">
                        <span
                          className={`text-[10px] font-bold ${
                            dish.badgeVariant === 'secondary' ? 'text-secondary' : 'text-primary'
                          }`}
                        >
                          {dish.badge}
                        </span>
                      </div>
                    )}
                    {dish.spiceLabel && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest/85">
                        <span
                          className={`material-symbols-outlined text-[12px] ${
                            dish.spice === 'mild' ? 'text-primary' : 'text-secondary'
                          }`}
                        >
                          {dish.spice === 'mild' ? 'spa' : 'local_fire_department'}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            dish.spice === 'mild' ? 'text-primary' : 'text-secondary'
                          }`}
                        >
                          {dish.spiceLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline gap-2 mb-1">
                    <h3 className="text-[15px] text-on-surface font-bold leading-snug">
                      {dish.title}
                    </h3>
                    <span className="text-[15px] text-primary font-bold tabular-nums shrink-0">
                      Rs. {dish.price.toLocaleString('en-PK')}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
                    {dish.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                  <span className="text-[11px] text-outline">
                    {dish.portionLabel || 'Fresh Sigri Portion'}
                  </span>
                  {!dish.inStock ? (
                    <span className="text-[11px] font-bold text-secondary px-2.5 py-1 rounded bg-surface-container-high">
                      Sold Out
                    </span>
                  ) : qty > 0 ? (
                    <div className="flex items-center gap-1.5 bg-surface-container-high rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => decrementCartItem(dish.id)}
                        className="w-7 h-7 rounded-md bg-surface-container text-on-surface flex items-center justify-center hover:bg-surface-bright cursor-pointer"
                        aria-label={`Remove one ${dish.title}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="text-xs font-bold text-primary w-5 text-center tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: dish.id,
                            menuItemId: dish.id,
                            title: dish.title,
                            subtitle: dish.portionLabel,
                            price: dish.price,
                            image: dish.image,
                          })
                        }
                        className="w-7 h-7 rounded-md bg-primary text-on-primary flex items-center justify-center hover:bg-tertiary cursor-pointer"
                        aria-label={`Add one more ${dish.title}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          id: dish.id,
                          menuItemId: dish.id,
                          title: dish.title,
                          subtitle: dish.portionLabel,
                          price: dish.price,
                          image: dish.image,
                        })
                      }
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1 hover:bg-tertiary active:scale-95 shadow cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. TRADITIONAL GRAVY & KARAHI SPOTLIGHT */}
      <section className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-4">
        <div className="rounded-2xl bg-surface-container p-5 md:p-7 shadow-2xl relative overflow-hidden border border-outline-variant/20">
          <div className="absolute -right-16 -top-16 w-52 h-52 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5">
              <div className="relative w-full aspect-[4/3] lg:aspect-square rounded-xl overflow-hidden bg-surface-container-high shadow-lg">
                <ImageWithFallback
                  src={KARAHI_SPOTLIGHT_IMAGE_URL}
                  alt="Sizzling traditional Pakistani Chicken Karahi in rustic black wok"
                  className="w-full h-full object-cover"
                  fallbackLabel="Sizzling Chicken Karahi"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/85 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded bg-surface-container-lowest/90 text-[10px] text-primary font-bold">
                    Simmered in Pure Desi Ghee
                  </span>
                  <span className="px-2.5 py-1 rounded bg-secondary-container/90 text-on-secondary-container text-[10px] font-bold">
                    Wok Sizzle Guaranteed
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-primary mb-2">
                  <span className="material-symbols-outlined text-[18px]">skillet</span>
                  <span className="text-[11px] uppercase tracking-widest font-bold">
                    Live Wok Preparation
                  </span>
                </div>
                <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl text-primary font-medium mb-2 leading-tight">
                  The Iconic Sizzling Chicken Karahi
                </h2>
                <p className="text-sm text-on-surface-variant mb-5 leading-relaxed">
                  Prepared fresh per order in high-heat cast iron woks with cold-pressed ginger,
                  fresh Roma tomatoes, green chilies, and pure ghee. Best paired with hot sesame
                  Roghni Naan.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-xl mb-5 flex flex-col gap-3 border border-outline-variant/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-on-surface font-semibold">Select Portion:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setKarahiSize('half')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tabular-nums ${
                        karahiSize === 'half'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
                      }`}
                    >
                      Half (Rs. {halfKarahiPrice.toLocaleString('en-PK')})
                    </button>
                    <button
                      type="button"
                      onClick={() => setKarahiSize('full')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tabular-nums ${
                        karahiSize === 'full'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
                      }`}
                    >
                      Full (Rs. {fullKarahiPrice.toLocaleString('en-PK')})
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-on-surface font-semibold">Spice Profile:</span>
                  <div className="flex gap-1.5">
                    {(['Mild', 'Medium', 'Desi Spicy'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setKarahiSpice(level)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                          karahiSpice === level
                            ? 'bg-secondary-container text-on-secondary-container font-bold'
                            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={karahiItem && !karahiItem.inStock}
                onClick={() =>
                  addToCart({
                    id: `chx_karahi_${karahiSize}_${karahiSpice.toLowerCase()}`,
                    menuItemId: 'chx_karahi',
                    variantKey: karahiSize,
                    title: `Chicken Karahi (${karahiSize === 'half' ? 'Half' : 'Full'} · ${karahiSpice})`,
                    subtitle: 'Wok-seared in pure desi ghee',
                    price: currentKarahiPrice,
                    image: KARAHI_SPOTLIGHT_IMAGE_URL,
                  })
                }
                className="w-full py-3.5 px-5 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-tertiary active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                <span className="tabular-nums">
                  {karahiItem && !karahiItem.inStock
                    ? 'Currently Sold Out'
                    : `Add Chicken Karahi (${karahiSize === 'half' ? 'Half' : 'Full'}) · Rs. ${currentKarahiPrice.toLocaleString('en-PK')}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. EXCLUSIVE FAMILY DAWAT & BBQ PLATTER DEALS */}
      <section id="dawat-deals" className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-4">
        <div className="mb-4">
          <span className="text-[11px] text-primary uppercase tracking-widest font-bold">
            Banquets &amp; Celebrations
          </span>
          <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl text-primary font-medium leading-tight">
            Royal Dawat Platters
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Generous feasts crafted for grand family get-togethers and dastarkhwan tables.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Deal 1: Mughal Darbar Feast */}
          <div className="rounded-2xl bg-surface-container p-5 relative overflow-hidden shadow-xl border border-primary/20 flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-primary text-on-primary px-3 py-1 text-[10px] font-bold uppercase rounded-bl-xl tracking-wider shadow">
              Save 20%
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  workspace_premium
                </span>
                <h3 className="font-[var(--font-display)] text-xl text-primary font-semibold">
                  Mughal Darbar Feast
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs mb-4">
                <span className="text-on-surface font-medium">Serves 4 to 5 Persons</span>
                <span className="text-outline">·</span>
                <span className="text-primary font-bold">Family Favorite</span>
              </div>

              <div className="space-y-2 mb-5 bg-surface-container-lowest/60 p-3.5 rounded-xl text-xs text-on-surface">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    check_circle
                  </span>
                  <span>
                    <strong>4x</strong> Beef Seekh Kabaabs (Melt-in-mouth)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    check_circle
                  </span>
                  <span>
                    <strong>8x</strong> Chicken Malai Boti Cubes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    check_circle
                  </span>
                  <span>
                    <strong>1x</strong> Half Chicken Karahi (Desi Ghee simmered)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    check_circle
                  </span>
                  <span>
                    <strong>4x</strong> Fluffy Sesame Seed Roghni Naans
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    check_circle
                  </span>
                  <span>Special Mint Raita, Fresh Kachumber Salad &amp; Chutney</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-xs text-outline line-through tabular-nums">Rs. 6,000</span>
                <span className="text-xl text-primary font-bold tabular-nums">
                  Rs. {(dealMughal?.price ?? 4800).toLocaleString('en-PK')}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  addToCart({
                    id: 'deal_mughal_darbar',
                    menuItemId: 'deal_mughal_darbar',
                    title: 'Mughal Darbar Feast',
                    subtitle: 'Serves 4-5 Persons · Family Banquet',
                    price: dealMughal?.price ?? 4800,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:bg-tertiary active:scale-95 shadow cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span>Order Platter</span>
              </button>
            </div>
          </div>

          {/* Deal 2: BBQ Lovers Combo */}
          <div className="rounded-2xl bg-surface-container p-5 relative overflow-hidden shadow-lg border border-outline-variant/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  local_fire_department
                </span>
                <h3 className="font-[var(--font-display)] text-xl text-on-surface font-semibold">
                  BBQ Lovers Combo
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs mb-4">
                <span className="text-on-surface font-medium">Ideal for 2 Diners</span>
                <span className="text-outline">·</span>
                <span className="text-secondary font-bold">Quick Dinner</span>
              </div>

              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                2 Beef Seekh Kabaabs, 1 Chicken Tikka (Chest or Leg), 2 Fresh Tandoori Naans,
                Zeera Raita, and 2 Chilled Cold Drinks.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-xs text-outline line-through tabular-nums">Rs. 2,150</span>
                <span className="text-xl text-primary font-bold tabular-nums">
                  Rs. {(dealCombo?.price ?? 1850).toLocaleString('en-PK')}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  addToCart({
                    id: 'deal_bbq_lovers',
                    menuItemId: 'deal_bbq_lovers',
                    title: 'BBQ Lovers Combo',
                    subtitle: 'Ideal for 2 Diners',
                    price: dealCombo?.price ?? 1850,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-surface-container-high text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-surface-bright active:scale-95 shadow cursor-pointer border border-primary/20"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span>Order Combo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AUTHENTIC CUSTOMER TESTIMONIALS & 7. LIVE RESTAURANT STATUS */}
      <section className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Testimonials */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] text-primary uppercase tracking-widest font-bold">
                  Food Connoisseur Reviews
                </span>
                <h2 className="font-[var(--font-display)] text-2xl text-primary font-medium leading-tight">
                  Word on the Street
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high text-xs font-bold text-on-surface tabular-nums">
                <span className="text-primary">★</span>
                <span>4.9 / 5</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              <div className="p-4 rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/15 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                      ZH
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-on-surface font-bold">Zainab Hashmi</span>
                      <span className="text-[11px] text-outline">Karachi Food Connoisseur</span>
                    </div>
                  </div>
                  <div className="text-primary text-xs tracking-tighter">★★★★★</div>
                </div>
                <p className="text-[13px] text-on-surface-variant italic leading-relaxed">
                  &ldquo;The Beef Bihari and Malai Boti are unmatched in taste. Soft as butter, smoky
                  aroma intact even after 30 mins delivery to Clifton!&rdquo;
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/15 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                      MA
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-on-surface font-bold">Mustafa Ali</span>
                      <span className="text-[11px] text-outline">Verified Late-Night Diner</span>
                    </div>
                  </div>
                  <div className="text-primary text-xs tracking-tighter">★★★★★</div>
                </div>
                <p className="text-[13px] text-on-surface-variant italic leading-relaxed">
                  &ldquo;Burns Road taste delivered right to our door. The piping hot Roghni Naans
                  with their signature Desi Ghee Chicken Karahi is heavenly.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Location & Direct Dispatch */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-surface-container p-5 shadow-xl flex flex-col gap-3 border border-outline-variant/20 h-full justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm sm:text-base text-on-surface font-bold">
                    Open Tonight For Dining &amp; Delivery
                  </span>
                  <span className="text-[11px] text-primary uppercase font-bold tabular-nums shrink-0">
                    {config.operatingHours}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                  Serving sizzling charcoal BBQ all through the night. Pickup counters and
                  insulated deliveries operational within {config.deliveryRadius}.
                </p>
              </div>

              <div className="w-full h-44 rounded-xl overflow-hidden shadow-inner bg-surface-container-highest relative flex items-center justify-center">
                <ImageWithFallback
                  src={GEOFENCE_MAP_IMAGE_URL}
                  alt="Burns Road Saddar Karachi Map Location"
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-surface-container-lowest/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg mb-2">
                    <span className="material-symbols-outlined text-[22px]">location_on</span>
                  </div>
                  <span className="text-sm text-on-surface font-bold">Fayyaz Kabaab House</span>
                  <span className="text-xs text-on-surface-variant mt-0.5">
                    {config.addressLine}
                  </span>
                  <a
                    className="mt-2 text-primary text-xs font-bold underline"
                    href={`https://maps.google.com/?q=${encodeURIComponent(config.addressLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-1">
                <a
                  className="p-3 rounded-xl bg-surface-container-high hover:bg-surface-bright flex items-center justify-center gap-2 active:scale-95 transition-all text-on-surface"
                  href={`tel:${config.landline.replace(/\s+/g, '')}`}
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[10px] text-outline">Call Pitmaster</span>
                    <span className="text-xs font-bold truncate tabular-nums">
                      {config.landline}
                    </span>
                  </div>
                </a>
                <a
                  className="p-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 flex items-center justify-center gap-2 active:scale-95 transition-all text-[#25D366]"
                  href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                    'Hi Fayyaz Kabaab House, I would like to place an order'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[10px] text-[#25D366]">Instant WhatsApp</span>
                    <span className="text-xs font-bold text-white truncate">Order in 1 Click</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
