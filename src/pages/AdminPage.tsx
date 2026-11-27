import React, { useEffect, useMemo, useState } from 'react';
import { AdminAuthGate } from '../components/AdminAuthGate';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import {
  BRAND_EMBLEM_URL,
  GEOFENCE_MAP_IMAGE_URL,
  HERO_PLATTER_IMAGE_URL,
  KARAHI_SPOTLIGHT_IMAGE_URL,
} from '../data/initialData';
import { uploadRestaurantImage } from '../lib/storage';
import { MenuCategory, MenuItem, Order, OrderStatus, RestaurantConfig, SpiceTier } from '../types';

const PRESET_DISH_IMAGES = [
  {
    label: 'Seekh Kabaab',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYgicV56i41UGvxyLmNBNnIrUvChTCltqMH1FM-jMCgTudwsMM2ub0GVhM3s313-uJDMqYkSfQi1haI6zc_D2Vqb8icRZphlEfdQZ_mC8_UpHLM8yOUdMw73JbchaokT1P4sfEeaOq1bMfcOTlfjYEiO0j-1wFz6V1ESQ7lJRlVTBCzFx7vk59JCBuum_Zvkb8O48amK3-bLcmAX2pxOISQsQXZ2msLzFCoIoKEBzl',
  },
  {
    label: 'Malai Boti',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbg4KUV08NgeUV2reqjodZ1jawjg1K4kZ9XcircjkzKt6dUzI0KSac_wSrzrXXvt6WtVDGVr5L9XlM8yFJzCoxYRn831sLj5kw8tt3UIWCFMtIw_yFrI7qhNXkd1E2Bs77lyEmrLcQpvI6tZiSDyiElaA0IMHSwHXtj8k0HrBijze1cwNBSaxIO66RE5G4w5Pkl_G146acc1lUC8huE3c_SeEcUOSrbnV-kpMJMqzg',
  },
  {
    label: 'Sizzling Karahi',
    url: KARAHI_SPOTLIGHT_IMAGE_URL,
  },
  {
    label: 'Sigri Platter',
    url: HERO_PLATTER_IMAGE_URL,
  },
];

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

function getStatusIcon(status: OrderStatus): string {
  switch (status) {
    case 'Pending':
      return 'notifications_active';
    case 'Confirmed':
      return 'verified';
    case 'Preparing':
      return 'skillet';
    case 'Ready':
      return 'takeout_dining';
    case 'Out for Delivery':
      return 'two_wheeler';
    case 'Delivered':
      return 'check_circle';
    case 'Cancelled':
      return 'cancel';
  }
}

const AdminDashboardContent: React.FC = () => {
  const {
    currentUser,
    logout,
    firestoreStatus,
    orders,
    ordersLoading,
    newOrderAlertCount,
    clearNewOrderAlerts,
    categories,
    menuItems,
    promos,
    config,
    updateOrderStatus,
    toggleDishStock,
    updateDish,
    deleteDish,
    createDish,
    createCategory,
    toggleCategoryActive,
    deleteCategory,
    createPromo,
    togglePromoActive,
    deletePromo,
    updateConfig,
    runDiagnostics,
    showToast,
  } = useStore();

  const [dishCatFilter, setDishCatFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [kotOrder, setKotOrder] = useState<Order | null>(null);
  const [deletingDish, setDeletingDish] = useState<MenuItem | null>(null);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

  // Full Edit Dish State
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState<MenuCategory>('bbq');
  const [editPrice, setEditPrice] = useState('');
  const [editSpice, setEditSpice] = useState<SpiceTier>('medium');
  const [editImage, setEditImage] = useState('');
  const [editInStock, setEditInStock] = useState(true);
  const [editFeatured, setEditFeatured] = useState(false);
  const [editUploadingPct, setEditUploadingPct] = useState<number | null>(null);
  const [dishFormError, setDishFormError] = useState('');

  // New Dish Modal State
  const [newDishOpen, setNewDishOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishCat, setNewDishCat] = useState<MenuCategory>('bbq');
  const [newDishPrice, setNewDishPrice] = useState('1250');
  const [newDishSpice, setNewDishSpice] = useState<SpiceTier>('medium');
  const [newDishImage, setNewDishImage] = useState(PRESET_DISH_IMAGES[0].url);
  const [newDishActive, setNewDishActive] = useState(true);
  const [newDishFeatured, setNewDishFeatured] = useState(false);
  const [newUploadingPct, setNewUploadingPct] = useState<number | null>(null);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Promo Modal State
  const [newPromoOpen, setNewPromoOpen] = useState(false);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState('15');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [promoUploadingPct, setPromoUploadingPct] = useState<number | null>(null);

  // Local editable config state kept synced with Firestore snapshots
  const [formConfig, setFormConfig] = useState<RestaurantConfig>(config);
  const [configSavedTick, setConfigSavedTick] = useState(false);
  const [logoUploadingPct, setLogoUploadingPct] = useState<number | null>(null);
  const [bannerUploadingPct, setBannerUploadingPct] = useState<number | null>(null);

  useEffect(() => {
    setFormConfig(config);
  }, [config]);

  // Computed Shift KPIs from real Firestore orders
  const totalSales = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.totalBill, 0),
    [orders]
  );

  const activeQueueCount = useMemo(
    () =>
      orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length,
    [orders]
  );

  const urgentCount = useMemo(
    () =>
      orders.filter(
        (o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Preparing'
      ).length,
    [orders]
  );

  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === 'Delivered').length,
    [orders]
  );

  const completionRate = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'Cancelled');
    if (nonCancelled.length === 0) return '100%';
    return `${Math.round((deliveredCount / nonCancelled.length) * 100)}%`;
  }, [deliveredCount, orders]);

  const topOrderedItem = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ord of orders) {
      if (ord.status === 'Cancelled') continue;
      for (const line of ord.items) {
        counts[line.title] = (counts[line.title] || 0) + line.qty;
      }
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0] || ['Beef Seekh Kabaab', 0];
  }, [orders]);

  const filteredDishes = useMemo(() => {
    if (dishCatFilter === 'all') return menuItems;
    return menuItems.filter((m) => m.category === dishCatFilter);
  }, [menuItems, dishCatFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    clearNewOrderAlerts();
    try {
      const diag = await runDiagnostics();
      showToast(diag.message, diag.ok ? 'cloud_done' : 'warning');
    } finally {
      setRefreshing(false);
    }
  };

  const handleStorageUpload = async (
    file: File,
    folder: 'logo' | 'menu' | 'banners' | 'offers',
    setProgress: (pct: number | null) => void,
    onSuccess: (url: string) => void
  ) => {
    setProgress(5);
    try {
      const url = await uploadRestaurantImage(file, folder, (pct) => setProgress(pct));
      onSuccess(url);
      showToast('Image uploaded to Firebase Storage', 'cloud_upload');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setProgress(null);
    }
  };

  const openEditDish = (dish: MenuItem) => {
    setEditingDish(dish);
    setEditTitle(dish.title);
    setEditDesc(dish.description);
    setEditCat(dish.category);
    setEditPrice(String(dish.price));
    setEditSpice(dish.spice);
    setEditImage(dish.image || '');
    setEditInStock(dish.inStock);
    setEditFeatured(Boolean(dish.featuredOnHome));
    setDishFormError('');
  };

  const handleEditDishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;
    const numericPrice = Number(editPrice);
    if (!editTitle.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      setDishFormError('Please provide a valid dish title and positive price.');
      return;
    }

    try {
      await updateDish(
        editingDish.id,
        {
          title: editTitle.trim(),
          description:
            editDesc.trim() ||
            'Prepared fresh over glowing tamarind charcoal with ancestral Burns Road spices.',
          category: editCat,
          price: numericPrice,
          spice: editSpice,
          image: editImage || undefined,
          inStock: editInStock,
          featuredOnHome: editFeatured,
        },
        editingDish.image
      );
      setEditingDish(null);
    } catch (err) {
      setDishFormError(err instanceof Error ? err.message : 'Failed to save dish.');
    }
  };

  const handleCreateDishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(newDishPrice);
    if (!newDishName.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return;

    await createDish({
      title: newDishName.trim(),
      description:
        newDishDesc.trim() ||
        'Prepared fresh over glowing tamarind charcoal with ancestral Burns Road spices.',
      category: newDishCat,
      price: numericPrice,
      spice: newDishSpice,
      inStock: newDishActive,
      featuredOnHome: newDishFeatured,
      image: newDishImage,
    });

    setNewDishName('');
    setNewDishDesc('');
    setNewDishPrice('1250');
    setNewDishFeatured(false);
    setNewDishOpen(false);
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await createCategory({
      categoryName: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
      isActive: true,
    });
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleCreatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = Number(promoValue);
    if (!promoCodeInput.trim() || !Number.isFinite(numericVal) || numericVal <= 0) return;

    await createPromo({
      title: promoTitle.trim() || `${promoCodeInput.trim().toUpperCase()} Offer`,
      code: promoCodeInput.trim().toUpperCase(),
      discountType: promoType,
      discountValue: numericVal,
      imageUrl: promoImageUrl || undefined,
      description:
        promoDesc.trim() ||
        (promoType === 'percent'
          ? `${numericVal}% Flat Discount on Royal BBQ & Platters`
          : `Rs. ${numericVal} Off on Burns Road Online Orders`),
    });

    setPromoTitle('');
    setPromoCodeInput('');
    setPromoDesc('');
    setPromoImageUrl('');
    setNewPromoOpen(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConfig(formConfig);
    setConfigSavedTick(true);
    window.setTimeout(() => setConfigSavedTick(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-4 pb-8 space-y-6">
      {/* Executive Header Status */}
      <div className="px-4 py-3 rounded-xl bg-surface-container-low flex flex-wrap items-center justify-between gap-3 shadow-sm border border-outline-variant/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container shrink-0">
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base text-primary font-bold truncate">Operations HQ</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  firestoreStatus === 'connected'
                    ? 'text-primary-fixed-dim'
                    : firestoreStatus === 'permission-denied' || firestoreStatus === 'offline'
                    ? 'text-error'
                    : 'text-on-surface-variant'
                }`}
              >
                {firestoreStatus === 'connected'
                  ? 'Firebase Live'
                  : firestoreStatus === 'permission-denied'
                  ? 'Rules Blocked'
                  : firestoreStatus === 'offline'
                  ? 'Offline'
                  : 'Connecting...'}
              </span>
              {newOrderAlertCount > 0 && (
                <button
                  type="button"
                  onClick={clearNewOrderAlerts}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container animate-pulse cursor-pointer"
                >
                  {newOrderAlertCount} New Order{newOrderAlertCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
            <span className="text-xs text-on-surface-variant truncate">
              {config.branchName} · Signed in as {currentUser?.email}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh Data"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high text-primary hover:bg-surface-bright active:scale-95 transition-transform cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                refreshing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-lg">
            <span className="material-symbols-outlined text-[14px] text-primary">
              local_fire_department
            </span>
            <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
              Koyla Hot
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-secondary-container hover:text-on-secondary-container text-on-surface px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 1. Shift Performance KPIs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">query_stats</span>
            <h2 className="text-sm text-on-surface font-bold uppercase tracking-wider">
              Live Sales &amp; Queue Reports
            </h2>
          </div>
          <span className="text-[11px] text-on-surface-variant">
            {orders.length} Total Recorded Order{orders.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/15 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant font-medium">Total Sales</span>
              <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
            </div>
            <div>
              <div className="font-[var(--font-display)] text-xl sm:text-2xl text-primary font-bold tracking-tight tabular-nums">
                Rs. {totalSales.toLocaleString('en-PK')}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-[14px]">
                  trending_up
                </span>
                <span>Excludes cancelled orders</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/15 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant font-medium">Active Queue</span>
              <span className="material-symbols-outlined text-secondary text-[18px]">
                local_fire_department
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-[var(--font-display)] text-xl sm:text-2xl text-on-surface font-bold tabular-nums">
                  {activeQueueCount}
                </span>
                <span className="text-[11px] text-secondary font-medium">In Kitchen / Dispatch</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: `${orders.length > 0 ? Math.min(100, (activeQueueCount / orders.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/15 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant font-medium">
                Top Ordered Dish
              </span>
              <span className="material-symbols-outlined text-tertiary text-[18px]">
                award_star
              </span>
            </div>
            <div>
              <div className="text-base sm:text-lg text-on-surface font-semibold truncate">
                {topOrderedItem[0]}
              </div>
              <p className="text-[11px] text-primary-fixed-dim tabular-nums mt-1">
                {topOrderedItem[1]} Portion{topOrderedItem[1] === 1 ? '' : 's'} Ordered
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/15 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-on-surface-variant font-medium">Delivered Rate</span>
              <span className="material-symbols-outlined text-primary text-[18px]">timelapse</span>
            </div>
            <div>
              <div className="font-[var(--font-display)] text-xl sm:text-2xl text-on-surface font-bold tabular-nums">
                {completionRate}
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1">
                {deliveredCount} Delivered Orders
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2. LIVE KOT & ORDERS FEED */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-primary font-bold uppercase tracking-wider">
              Live KOT &amp; Orders
            </h2>
            <span className="text-[11px] text-primary font-bold tabular-nums">
              {urgentCount} Active Prep
            </span>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {ordersLoading ? (
              <div className="bg-surface-container-low rounded-xl p-6 text-center text-xs text-on-surface-variant border border-outline-variant/15">
                Connecting to real-time Firestore order stream...
              </div>
            ) : firestoreStatus === 'permission-denied' ? (
              <div className="bg-error-container/40 rounded-xl p-6 text-center space-y-2 border border-error/30">
                <span className="material-symbols-outlined text-[32px] text-error">
                  gpp_maybe
                </span>
                <p className="text-sm font-semibold text-on-surface">
                  Firestore Security Rules Not Deployed
                </p>
                <p className="text-xs text-on-surface-variant">
                  Connected to project <code>fkh-31097</code> (<code>(default)</code>), but Firestore
                  returned <code>permission-denied</code>. Deploy <code>firestore.rules</code> to
                  enable live orders and menu management.
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-surface-container-low rounded-xl p-8 text-center space-y-2 border border-outline-variant/15">
                <span className="material-symbols-outlined text-[32px] text-outline">
                  receipt_long
                </span>
                <p className="text-sm font-semibold text-on-surface">No Orders in Queue Yet</p>
                <p className="text-xs text-on-surface-variant">
                  Customer orders placed at checkout will appear here instantaneously.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-surface-container-low rounded-xl p-3.5 shadow-md border border-outline-variant/15 transition-all"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 bg-surface-container/50 rounded-lg px-2.5 py-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          order.status === 'Pending' ? 'text-secondary' : 'text-primary'
                        }`}
                      >
                        #{order.orderId}
                      </span>
                      <span className="text-[11px] text-on-surface-variant truncate">
                        {order.channel === 'whatsapp' ? 'WhatsApp · ' : ''}
                        {order.createdAtLabel}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                        order.status === 'Pending'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : order.status === 'Cancelled'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container-highest text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {getStatusIcon(order.status)}
                      </span>
                      {order.status}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-on-surface mb-1.5 leading-relaxed">
                    {order.itemsSummary}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mb-2.5">
                    {order.phone} · {order.address}
                  </p>

                  {order.riderName && (
                    <div className="flex items-center gap-2 mb-2.5 bg-surface-container-high/50 p-2 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-surface-bright flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[16px]">
                          person_pin_circle
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-on-surface font-semibold truncate">
                          Rider: {order.riderName} ({order.riderPhone})
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate">
                          Destination: {order.destinationShort} · ETA: {order.etaMinutes} min
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">
                        {order.customerName} · {order.paymentMethod}
                      </span>
                      <span className="text-sm text-primary font-bold tabular-nums">
                        Rs. {order.totalBill.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative">
                        <select
                          aria-label={`Order status for ${order.orderId}`}
                          value={order.status}
                          onChange={(e) =>
                            updateOrderStatus(order.id, e.target.value as OrderStatus)
                          }
                          className="appearance-none bg-surface-container-high text-on-surface text-xs pl-2.5 pr-7 py-2 rounded-lg cursor-pointer focus:outline-none focus:bg-surface-bright"
                        >
                          {ALL_ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          expand_more
                        </span>
                      </div>

                      {order.status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'Confirmed')}
                            className="px-2.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-tertiary active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              check_circle
                            </span>
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                            className="px-2.5 py-2 rounded-lg bg-error-container text-on-error-container text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setKotOrder(order)}
                        aria-label={`Print KOT Slip for ${order.orderId}`}
                        title="View & Print KOT Slip"
                        className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary flex items-center justify-center active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3. MENU & LIVE PRICE MANAGEMENT (CRUD) */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm text-primary font-bold uppercase tracking-wider">
                Live Sigdi Menu &amp; Rates
              </h2>
              <p className="text-xs text-on-surface-variant">
                Real-time Firestore inventory, photography &amp; pricing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCategoriesModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-surface-container-high text-primary text-xs font-semibold flex items-center gap-1 hover:bg-surface-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">category</span>
                <span>Categories</span>
              </button>
              <button
                type="button"
                onClick={() => setNewDishOpen(true)}
                className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1 shadow-md hover:bg-tertiary active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Dish</span>
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setDishCatFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                dishCatFilter === 'all'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container-high text-on-surface hover:text-primary'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.categoryId}
                type="button"
                onClick={() => setDishCatFilter(cat.categoryId)}
                className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  dishCatFilter === cat.categoryId
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'bg-surface-container-high text-on-surface hover:text-primary'
                }`}
              >
                {cat.categoryName}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className={`bg-surface-container-low p-3 rounded-xl flex items-center justify-between gap-2.5 shadow-sm border border-outline-variant/15 transition-opacity ${
                  !dish.inStock ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest relative">
                    <ImageWithFallback
                      src={dish.image}
                      alt={dish.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm text-on-surface font-semibold truncate">
                        {dish.title}
                      </h3>
                      {!dish.inStock && (
                        <span className="text-[10px] font-bold text-secondary shrink-0">
                          (Out)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-primary font-bold tabular-nums">
                        PKR {dish.price.toLocaleString('en-PK')}
                      </span>
                      {dish.featuredOnHome && (
                        <span className="text-[10px] text-on-surface-variant">· Featured</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label
                    className="relative inline-flex items-center cursor-pointer"
                    title="In Stock Toggle"
                  >
                    <input
                      type="checkbox"
                      checked={dish.inStock}
                      onChange={(e) => toggleDishStock(dish.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>

                  <button
                    type="button"
                    aria-label={`Edit ${dish.title}`}
                    onClick={() => openEditDish(dish)}
                    className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-primary flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${dish.title}`}
                    onClick={() => setDeletingDish(dish)}
                    className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-error-container text-on-surface-variant hover:text-error flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 4. PROMOTIONS ENGINE & 5. BRANCH & DISPATCH SETUP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* Promotions Engine */}
        <section className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">loyalty</span>
              <h2 className="text-sm text-primary font-bold uppercase tracking-wider">
                Promotions &amp; Offers
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setNewPromoOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-bright text-xs font-semibold flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>New Code</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="bg-surface-container-low p-3.5 rounded-xl shadow-md border border-outline-variant/15 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {promo.imageUrl && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container-high">
                      <ImageWithFallback
                        src={promo.imageUrl}
                        alt={promo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-[var(--font-display)] text-lg text-primary tracking-wider font-bold">
                        {promo.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          promo.active
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface-container-high text-outline'
                        }`}
                      >
                        {promo.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface">{promo.description}</p>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">event_repeat</span>
                      {promo.validUntil} · {promo.redemptions} redemptions
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promo.active}
                      onChange={(e) => togglePromoActive(promo.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary" />
                  </label>
                  <button
                    type="button"
                    onClick={() => deletePromo(promo.id, promo.imageUrl)}
                    title="Delete Voucher"
                    aria-label={`Delete ${promo.code}`}
                    className="text-on-surface-variant hover:text-error p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Branch & Dispatch Setup */}
        <section className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">store</span>
            <div>
              <h2 className="text-sm text-primary font-bold uppercase tracking-wider">
                Restaurant Settings &amp; Branding
              </h2>
              <p className="text-xs text-on-surface-variant">{formConfig.branchName}</p>
            </div>
          </div>

          <form
            onSubmit={handleSaveConfig}
            className="bg-surface-container-low rounded-xl p-4 space-y-3 shadow-md border border-outline-variant/15"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Restaurant / Branch Name
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-3 py-2 text-on-surface">
                  <input
                    type="text"
                    value={formConfig.branchName}
                    onChange={(e) => setFormConfig({ ...formConfig, branchName: e.target.value })}
                    className="bg-transparent w-full text-on-surface text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Street Address
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-3 py-2 text-on-surface">
                  <input
                    type="text"
                    value={formConfig.addressLine}
                    onChange={(e) => setFormConfig({ ...formConfig, addressLine: e.target.value })}
                    className="bg-transparent w-full text-on-surface text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Primary Restaurant Landline / Mobile
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-3 py-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] mr-2">
                    phone
                  </span>
                  <input
                    type="text"
                    value={formConfig.landline}
                    onChange={(e) => setFormConfig({ ...formConfig, landline: e.target.value })}
                    className="bg-transparent w-full text-on-surface text-sm focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  WhatsApp Live Ordering Line
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-3 py-2 text-on-surface">
                  <span className="material-symbols-outlined text-[#25D366] text-[18px] mr-2">
                    chat
                  </span>
                  <input
                    type="text"
                    value={formConfig.whatsappLine}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, whatsappLine: e.target.value })
                    }
                    className="bg-transparent w-full text-on-surface text-sm focus:outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Operating Hours
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-2.5 py-2 text-on-surface">
                  <input
                    type="text"
                    value={formConfig.operatingHours}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, operatingHours: e.target.value })
                    }
                    className="bg-transparent w-full text-on-surface text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Delivery Radius
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-2.5 py-2 text-on-surface">
                  <input
                    type="text"
                    value={formConfig.deliveryRadius}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, deliveryRadius: e.target.value })
                    }
                    className="bg-transparent w-full text-on-surface text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Delivery Fee (PKR)
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-2.5 py-2 text-on-surface">
                  <input
                    type="number"
                    min={0}
                    value={formConfig.deliveryFee}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, deliveryFee: Number(e.target.value) || 0 })
                    }
                    className="bg-transparent w-full text-on-surface text-xs focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Min Order (PKR)
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-2.5 py-2 text-on-surface">
                  <input
                    type="number"
                    min={0}
                    value={formConfig.minimumOrder}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, minimumOrder: Number(e.target.value) || 0 })
                    }
                    className="bg-transparent w-full text-on-surface text-xs focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  GPS Coordinates
                </label>
                <div className="flex items-center bg-surface-container-high rounded-lg px-2.5 py-2 text-on-surface">
                  <input
                    type="text"
                    value={formConfig.gpsCoordinates}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, gpsCoordinates: e.target.value })
                    }
                    className="bg-transparent w-full text-on-surface text-xs focus:outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Firebase Storage Logo & Hero Banner Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-surface-container-high/60 p-3 rounded-lg flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-highest shrink-0">
                  <ImageWithFallback
                    src={formConfig.logoUrl || BRAND_EMBLEM_URL}
                    alt="Restaurant Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-on-surface block">
                    Restaurant Logo
                  </span>
                  <label className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary font-bold cursor-pointer hover:underline">
                    <span className="material-symbols-outlined text-[14px]">upload</span>
                    <span>
                      {logoUploadingPct !== null
                        ? `Uploading ${logoUploadingPct}%...`
                        : 'Upload New Logo'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleStorageUpload(file, 'logo', setLogoUploadingPct, (url) =>
                            setFormConfig((prev) => ({ ...prev, logoUrl: url }))
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="bg-surface-container-high/60 p-3 rounded-lg flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-surface-container-highest shrink-0">
                  <ImageWithFallback
                    src={formConfig.heroBannerUrl || HERO_PLATTER_IMAGE_URL}
                    alt="Hero Banner"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-on-surface block">
                    Hero Showcase Banner
                  </span>
                  <label className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary font-bold cursor-pointer hover:underline">
                    <span className="material-symbols-outlined text-[14px]">upload</span>
                    <span>
                      {bannerUploadingPct !== null
                        ? `Uploading ${bannerUploadingPct}%...`
                        : 'Upload Hero Banner'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleStorageUpload(file, 'banners', setBannerUploadingPct, (url) =>
                            setFormConfig((prev) => ({ ...prev, heroBannerUrl: url }))
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                Kitchen Geofence Zone
              </label>
              <div className="w-full h-24 rounded-lg relative overflow-hidden flex items-end p-2.5 shadow-inner bg-surface-container-highest">
                <ImageWithFallback
                  src={GEOFENCE_MAP_IMAGE_URL}
                  alt="Burns Road BBQ Hub Geofence"
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
                <div className="relative z-10 bg-surface-container-lowest/85 backdrop-blur-md px-2.5 py-1 rounded text-primary text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">my_location</span>
                  Burns Road BBQ Hub · Radius {formConfig.deliveryRadius} active
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-lg hover:bg-tertiary active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {configSavedTick ? 'check' : 'save'}
              </span>
              <span>
                {configSavedTick ? 'Operational Parameters Saved' : 'Save Operational Parameters'}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* MODAL: KOT Receipt Preview */}
      {kotOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setKotOrder(null)}
        >
          <div
            className="bg-surface-container-low max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-primary/25 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
                  Kitchen Order Ticket (KOT)
                </span>
                <h3 className="font-[var(--font-display)] text-xl text-on-surface font-bold">
                  #{kotOrder.orderId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setKotOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-lowest p-3.5 rounded-xl font-mono text-xs space-y-2 border border-outline-variant/15">
              <div className="text-center border-b border-outline-variant/20 pb-2">
                <p className="font-bold text-primary">FAYYAZ KABAAB HOUSE</p>
                <p className="text-[11px] text-on-surface-variant">Burns Road Tandoor &amp; Sigri</p>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Guest: {kotOrder.customerName}</span>
                <span>{kotOrder.createdAtLabel}</span>
              </div>
              <div className="text-[11px] text-on-surface-variant">{kotOrder.address}</div>
              <div className="border-t border-b border-outline-variant/20 py-2 space-y-1">
                {kotOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.qty}x {item.title}
                    </span>
                    <span className="tabular-nums">
                      Rs. {(item.qty * item.price).toLocaleString('en-PK')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-primary pt-1">
                <span>TOTAL ({kotOrder.paymentMethod})</span>
                <span className="tabular-nums">
                  Rs. {kotOrder.totalBill.toLocaleString('en-PK')}
                </span>
              </div>
              {kotOrder.notes && (
                <div className="text-[11px] text-secondary pt-1">Note: {kotOrder.notes}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                showToast(`KOT receipt sent to Burns Rd Tandoor printer #${kotOrder.orderId}`, 'print');
                setKotOrder(null);
              }}
              className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Send to Thermal Kitchen Printer</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Full Edit Menu Dish */}
      {editingDish && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingDish(null)}
        >
          <div
            className="bg-surface-container-low w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto border border-outline-variant/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <h3 className="font-[var(--font-display)] text-lg text-primary font-bold">
                Edit Dish: {editingDish.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditDishSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Dish Name
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2 rounded-lg focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2 rounded-lg focus:outline-none text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                    Category
                  </label>
                  <select
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                    className="w-full bg-surface-container-high text-on-surface px-3 py-2 rounded-lg focus:outline-none text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                    Price (PKR)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-surface-container-high text-on-surface px-3 py-2 rounded-lg focus:outline-none text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Spice Intensity
                </label>
                <select
                  value={editSpice}
                  onChange={(e) => setEditSpice(e.target.value as SpiceTier)}
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2 rounded-lg focus:outline-none text-sm"
                >
                  <option value="mild">Mild &amp; Velvety</option>
                  <option value="medium">Medium Royal Spice</option>
                  <option value="spicy">Angara Koyla Flame</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Dish Image (Upload to Firebase Storage)
                </label>
                <div className="flex items-center gap-3 bg-surface-container-high p-2.5 rounded-lg">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container-highest shrink-0">
                    <ImageWithFallback
                      src={editImage}
                      alt={editTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer hover:bg-tertiary">
                      <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                      <span>
                        {editUploadingPct !== null
                          ? `Uploading ${editUploadingPct}%`
                          : 'Replace Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleStorageUpload(file, 'menu', setEditUploadingPct, setEditImage);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-on-surface font-medium">Available in Stock</span>
                <input
                  type="checkbox"
                  checked={editInStock}
                  onChange={(e) => setEditInStock(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-on-surface font-medium">
                  Feature on Home Showcase
                </span>
                <input
                  type="checkbox"
                  checked={editFeatured}
                  onChange={(e) => setEditFeatured(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              {dishFormError && (
                <p className="text-xs text-error font-semibold">{dishFormError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                >
                  Save Dish Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Dish Confirmation */}
      {deletingDish && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeletingDish(null)}
        >
          <div
            className="bg-surface-container-low max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-outline-variant/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-[var(--font-display)] text-lg text-on-surface font-semibold">
              Remove {deletingDish.title}?
            </h3>
            <p className="text-xs text-on-surface-variant">
              This dish and its uploaded storage media will be removed from the live menu.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingDish(null)}
                className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteDish(deletingDish.id, deletingDish.image);
                  setDeletingDish(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold cursor-pointer"
              >
                Remove Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manage Food Categories */}
      {categoriesModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setCategoriesModalOpen(false)}
        >
          <div
            className="bg-surface-container-low w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto border border-outline-variant/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <h3 className="font-[var(--font-display)] text-lg text-primary font-bold">
                Manage Menu Categories
              </h3>
              <button
                type="button"
                onClick={() => setCategoriesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name (e.g. Rolls & Shawarma)"
                  className="bg-surface-container-high text-on-surface px-3 py-2 rounded-lg text-xs outline-none"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description"
                  className="bg-surface-container-high text-on-surface px-3 py-2 rounded-lg text-xs outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-tertiary cursor-pointer"
              >
                Add Category
              </button>
            </form>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="bg-surface-container-high/60 p-3 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{cat.categoryName}</p>
                    {cat.description && (
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="checkbox"
                      checked={cat.isActive}
                      onChange={(e) => toggleCategoryActive(cat.categoryId, e.target.checked)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                      title="Active toggle"
                    />
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat.categoryId, cat.image)}
                      className="text-on-surface-variant hover:text-error p-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Menu Dish */}
      {newDishOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setNewDishOpen(false)}
        >
          <div
            className="bg-surface-container-low w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto border border-outline-variant/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  restaurant
                </span>
                <h3 className="font-[var(--font-display)] text-lg text-primary font-bold">
                  Add Royal Dish
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setNewDishOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDishSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Dish Name
                </label>
                <input
                  type="text"
                  required
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="e.g. Royal Reshmi Handi"
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDishDesc}
                  onChange={(e) => setNewDishDesc(e.target.value)}
                  placeholder="Slow-grilled over tamarind coal with crushed green chilies..."
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2 rounded-lg focus:outline-none text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                    Category
                  </label>
                  <select
                    value={newDishCat}
                    onChange={(e) => setNewDishCat(e.target.value)}
                    className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                    Price (PKR)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Spice Intensity Tier
                </label>
                <select
                  value={newDishSpice}
                  onChange={(e) => setNewDishSpice(e.target.value as SpiceTier)}
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                >
                  <option value="mild">Mild &amp; Velvety (Cardamom / Malai)</option>
                  <option value="medium">Peshawari Royal Heat (Black Pepper)</option>
                  <option value="spicy">Angara Koyla Flame (Extra Green Chili)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-on-surface-variant font-semibold">
                    Upload Image or Select Preset
                  </label>
                  <label className="inline-flex items-center gap-1 text-[11px] text-primary font-bold cursor-pointer hover:underline">
                    <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                    <span>
                      {newUploadingPct !== null
                        ? `Uploading ${newUploadingPct}%`
                        : 'Upload Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleStorageUpload(file, 'menu', setNewUploadingPct, setNewDishImage);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_DISH_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setNewDishImage(preset.url)}
                      className={`rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        newDishImage === preset.url
                          ? 'border-primary'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="aspect-square bg-surface-container-high">
                        <ImageWithFallback
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </button>
                  ))}
                </div>
                {newDishImage && !PRESET_DISH_IMAGES.some((p) => p.url === newDishImage) && (
                  <div className="mt-2 flex items-center gap-2 bg-surface-container-high p-2 rounded-lg">
                    <img
                      src={newDishImage}
                      alt="Uploaded Dish Preview"
                      className="w-12 h-12 rounded object-cover"
                    />
                    <span className="text-[11px] text-primary font-semibold">
                      Custom Firebase Storage image ready
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-on-surface font-medium">
                  Instantly Publish to Live App
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDishActive}
                    onChange={(e) => setNewDishActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-on-surface font-medium">
                  Feature on Home BBQ Showcase
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDishFeatured}
                    onChange={(e) => setNewDishFeatured(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewDishOpen(false)}
                  className="w-1/2 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-tertiary shadow-md cursor-pointer"
                >
                  Add to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Promo Voucher */}
      {newPromoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setNewPromoOpen(false)}
        >
          <div
            className="bg-surface-container-low w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border border-outline-variant/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  confirmation_number
                </span>
                <h3 className="font-[var(--font-display)] text-lg text-primary font-bold">
                  Issue Promo Coupon
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setNewPromoOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePromoSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Offer Title
                </label>
                <input
                  type="text"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="e.g. Weekend Dawat Special"
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. KABAB15"
                  className="w-full uppercase tracking-widest bg-surface-container-high text-primary font-bold px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                    Discount Type
                  </label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as 'percent' | 'fixed')}
                    className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed PKR Off</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={promoValue}
                    onChange={(e) => setPromoValue(e.target.value)}
                    className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-semibold">
                  Description
                </label>
                <input
                  type="text"
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  placeholder="e.g. Weekend Dawat Special Offer"
                  className="w-full bg-surface-container-high text-on-surface px-3 py-2.5 rounded-lg focus:outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-between bg-surface-container-high p-2.5 rounded-lg">
                <span className="text-xs text-on-surface-variant">
                  {promoImageUrl ? 'Offer banner attached' : 'Optional Offer Image'}
                </span>
                <label className="inline-flex items-center gap-1 text-xs text-primary font-bold cursor-pointer hover:underline">
                  <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
                  <span>
                    {promoUploadingPct !== null
                      ? `Uploading ${promoUploadingPct}%`
                      : 'Upload Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleStorageUpload(file, 'offers', setPromoUploadingPct, setPromoImageUrl);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewPromoOpen(false)}
                  className="w-1/2 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-tertiary shadow-md cursor-pointer"
                >
                  Activate Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPage: React.FC = () => {
  return (
    <AdminAuthGate>
      <AdminDashboardContent />
    </AdminAuthGate>
  );
};
