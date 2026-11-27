import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  User,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  BRAND_EMBLEM_URL,
  HERO_PLATTER_IMAGE_URL,
  INITIAL_CATEGORIES,
  INITIAL_CONFIG,
  INITIAL_MENU_ITEMS,
  INITIAL_PROMOS,
} from '../data/initialData';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  FirestoreConnectionStatus,
  OperationType,
  auth,
  db,
  functions,
  googleProvider,
  handleFirestoreError,
  runAdminFirestoreHealthCheck,
} from '../lib/firebase';
import { deleteStorageImageByUrl } from '../lib/storage';
import {
  CartItem,
  CategoryDoc,
  MenuCategory,
  MenuItem,
  Order,
  OrderItemLine,
  OrderStatus,
  OrderTrackingDoc,
  PromoCode,
  RestaurantConfig,
  SpiceTier,
  TabRoute,
  UserProfile,
} from '../types';

interface ToastState {
  id: number;
  message: string;
  icon: string;
}

export interface DishMutationPayload {
  title: string;
  urduTitle?: string;
  description: string;
  portionLabel?: string;
  category: MenuCategory;
  spice: SpiceTier;
  price: number;
  image?: string;
  inStock: boolean;
  featuredOnHome?: boolean;
}

export interface PromoMutationPayload {
  title?: string;
  code: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  description: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface CategoryMutationPayload {
  categoryName: string;
  description?: string;
  image?: string;
  isActive: boolean;
}

interface StoreContextValue {
  activeTab: TabRoute;
  setActiveTab: (tab: TabRoute) => void;
  // Auth & RBAC
  currentUser: User | null;
  authLoading: boolean;
  isAdmin: boolean;
  userProfile: UserProfile | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  // Real-time catalog & config
  firestoreStatus: FirestoreConnectionStatus;
  categories: CategoryDoc[];
  menuItems: MenuItem[];
  catalogLoading: boolean;
  cart: CartItem[];
  orders: Order[];
  ordersLoading: boolean;
  newOrderAlertCount: number;
  clearNewOrderAlerts: () => void;
  promos: PromoCode[];
  config: RestaurantConfig;
  toast: ToastState | null;
  menuSearchQuery: string;
  setMenuSearchQuery: (q: string) => void;
  showToast: (message: string, icon?: string) => void;
  // Cart operations
  addToCart: (item: {
    id: string;
    menuItemId: string;
    variantKey?: 'half' | 'full';
    title: string;
    subtitle?: string;
    price: number;
    image?: string;
  }) => void;
  decrementCartItem: (cartItemId: string) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  // Customer ordering & real-time order tracking
  placeOrder: (payload: {
    customerName: string;
    phone: string;
    address: string;
    landmark?: string;
    notes?: string;
    paymentMethod: string;
    channel: 'whatsapp' | 'online' | 'cod';
    promoCode?: string;
  }) => Promise<Order>;
  trackedOrderId: string;
  setTrackedOrderId: (orderId: string) => void;
  trackedOrder: OrderTrackingDoc | null;
  trackedOrderLoading: boolean;
  trackedOrderError: string;
  // Admin operations
  runDiagnostics: () => Promise<{ ok: boolean; message: string }>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    extra?: { riderName?: string; riderPhone?: string; etaMinutes?: number }
  ) => Promise<void>;
  toggleDishStock: (dishId: string, inStock: boolean) => Promise<void>;
  updateDishPrice: (dishId: string, newPrice: number) => Promise<void>;
  updateDish: (dishId: string, payload: DishMutationPayload, previousImageUrl?: string) => Promise<void>;
  deleteDish: (dishId: string, imageUrl?: string) => Promise<void>;
  createDish: (payload: DishMutationPayload) => Promise<void>;
  createCategory: (payload: CategoryMutationPayload) => Promise<void>;
  toggleCategoryActive: (categoryId: string, isActive: boolean) => Promise<void>;
  deleteCategory: (categoryId: string, imageUrl?: string) => Promise<void>;
  createPromo: (payload: PromoMutationPayload) => Promise<void>;
  togglePromoActive: (promoId: string, active: boolean) => Promise<void>;
  deletePromo: (promoId: string, imageUrl?: string) => Promise<void>;
  updateConfig: (next: RestaurantConfig) => Promise<void>;
  seedInitialDataIfEmpty: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'fayyaz_kabaab_cart_v2';
const TRACKED_ORDER_KEY = 'fayyaz_kabaab_tracked_order_v1';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as Partial<T>;
}

function formatCreatedAtLabel(createdAt: unknown): string {
  if (!createdAt) return 'Just now';
  let date: Date | null = null;
  if (createdAt instanceof Timestamp) {
    date = createdAt.toDate();
  } else if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toDate' in createdAt &&
    typeof (createdAt as { toDate: () => Date }).toDate === 'function'
  ) {
    date = (createdAt as { toDate: () => Date }).toDate();
  } else if (createdAt instanceof Date) {
    date = createdAt;
  }
  if (!date) return 'Just now';
  const diffMins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

function loadSavedCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const TRACKING_TOKEN_REGEX = /^FKH-[0-9]{6}-[A-F0-9]{12,32}$/;

function loadSavedTrackedOrder(): string {
  try {
    const saved = (localStorage.getItem(TRACKED_ORDER_KEY) || '').trim().toUpperCase();
    if (!saved) return '';
    // Discard stale guessable 6-digit tokens (e.g. FKH-331766) so unauthenticated
    // visitors do not automatically fire unauthorized reads on startup.
    if (!TRACKING_TOKEN_REGEX.test(saved)) {
      localStorage.removeItem(TRACKED_ORDER_KEY);
      return '';
    }
    return saved;
  } catch {
    return '';
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<TabRoute>('home');

  // Auth & RBAC state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Firestore synced state (with static initial fallback while initial snapshot resolves)
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreConnectionStatus>('connecting');
  const [categories, setCategories] = useState<CategoryDoc[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [promos, setPromos] = useState<PromoCode[]>(INITIAL_PROMOS);
  const [config, setConfig] = useState<RestaurantConfig>(INITIAL_CONFIG);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [newOrderAlertCount, setNewOrderAlertCount] = useState<number>(0);

  // Local customer cart & tracking state
  const [cart, setCart] = useState<CartItem[]>(() => loadSavedCart());
  const [trackedOrderId, setTrackedOrderIdState] = useState<string>(() => loadSavedTrackedOrder());
  const [trackedOrder, setTrackedOrder] = useState<OrderTrackingDoc | null>(null);
  const [trackedOrderLoading, setTrackedOrderLoading] = useState<boolean>(false);
  const [trackedOrderError, setTrackedOrderError] = useState<string>('');

  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const initialOrdersSnapshotDoneRef = useRef(false);
  const seededOnceRef = useRef(false);

  const setActiveTab = useCallback((tab: TabRoute) => {
    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const showToast = useCallback((message: string, icon = 'check_circle') => {
    const id = Date.now();
    setToast({ id, message, icon });
    window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 3000);
  }, []);

  const setTrackedOrderId = useCallback((orderId: string) => {
    const clean = orderId.trim().toUpperCase();
    setTrackedOrderIdState(clean);
    try {
      if (clean) {
        localStorage.setItem(TRACKED_ORDER_KEY, clean);
      } else {
        localStorage.removeItem(TRACKED_ORDER_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  // Seed initial restaurant collections into Firestore when an admin logs in and collections are empty
  const seedInitialDataIfEmpty = useCallback(async () => {
    try {
      const [catSnap, menuSnap, offerSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'menuItems')),
        getDocs(collection(db, 'offers')),
        getDoc(doc(db, 'restaurantSettings', 'main')),
      ]);

      const batch = writeBatch(db);
      let ops = 0;

      if (catSnap.empty) {
        for (const cat of INITIAL_CATEGORIES) {
          batch.set(
            doc(db, 'categories', cat.categoryId),
            stripUndefined({
              categoryId: cat.categoryId,
              categoryName: cat.categoryName,
              description: cat.description || '',
              isActive: cat.isActive,
              displayOrder: cat.displayOrder ?? 0,
              createdAt: serverTimestamp(),
            })
          );
          ops++;
        }
      }

      if (menuSnap.empty) {
        for (const item of INITIAL_MENU_ITEMS) {
          batch.set(
            doc(db, 'menuItems', item.id),
            stripUndefined({
              itemId: item.id,
              name: item.title,
              urduTitle: item.urduTitle,
              description: item.description,
              portionLabel: item.portionLabel,
              categoryId: item.category,
              spice: item.spice,
              spiceLabel: item.spiceLabel,
              price: item.price,
              imageUrl: item.image,
              availability: item.inStock,
              featured: Boolean(item.featuredOnHome),
              badge: item.badge,
              badgeVariant: item.badgeVariant,
              homeCategory: item.homeCategory,
              variants: item.variants,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
          ops++;
        }
      }

      if (offerSnap.empty) {
        for (const promo of INITIAL_PROMOS) {
          batch.set(
            doc(db, 'offers', promo.id),
            stripUndefined({
              offerId: promo.id,
              title: promo.title,
              code: promo.code,
              description: promo.description,
              discount: promo.discountValue,
              discountType: promo.discountType,
              endDate: promo.validUntil,
              redemptions: promo.redemptions,
              isActive: promo.active,
              createdAt: serverTimestamp(),
            })
          );
          ops++;
        }
      }

      if (!settingsSnap.exists()) {
        batch.set(
          doc(db, 'restaurantSettings', 'main'),
          stripUndefined({
            restaurantName: INITIAL_CONFIG.branchName,
            phone: INITIAL_CONFIG.landline,
            whatsappNumber: INITIAL_CONFIG.whatsappLine,
            address: INITIAL_CONFIG.addressLine,
            openingHours: INITIAL_CONFIG.operatingHours,
            deliveryCharges: INITIAL_CONFIG.deliveryFee,
            minimumOrder: INITIAL_CONFIG.minimumOrder,
            deliveryRadius: INITIAL_CONFIG.deliveryRadius,
            gpsCoordinates: INITIAL_CONFIG.gpsCoordinates,
            logoUrl: BRAND_EMBLEM_URL,
            heroBannerUrl: HERO_PLATTER_IMAGE_URL,
            updatedAt: serverTimestamp(),
          })
        );
        ops++;
      }

      if (ops > 0) {
        await batch.commit();
        showToast('Live Firestore menu & settings initialized', 'cloud_done');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedInitialData');
    }
  }, [showToast]);

  // 1. Firebase Authentication & RBAC listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsAdmin(false);
        setUserProfile(null);
        setOrders([]);
        initialOrdersSnapshotDoneRef.current = false;
        setAuthLoading(false);
        return;
      }

      try {
        let adminFlag = false;
        if (user.emailVerified) {
          const tokenResult = await user.getIdTokenResult();
          if (tokenResult.claims.admin === true) {
            adminFlag = true;
          } else {
            try {
              const verifyFn = httpsCallable<unknown, { isAdmin: boolean }>(
                functions,
                'verifyAdminRole'
              );
              const verification = await verifyFn();
              if (verification.data?.isAdmin) {
                await user.getIdToken(true);
                adminFlag = true;
              }
            } catch {
              // Fallback if Cloud Function is not yet deployed in target project
              if (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
                adminFlag = true;
                try {
                  const adminRef = doc(db, 'admins', user.uid);
                  const adminSnap = await getDoc(adminRef);
                  if (!adminSnap.exists()) {
                    await setDoc(adminRef, {
                      uid: user.uid,
                      email: user.email,
                      name: user.displayName || 'Operations Admin',
                      createdAt: serverTimestamp(),
                    });
                  }
                } catch {
                  // Rules might not yet be deployed or admins doc already exists
                }
              } else {
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                adminFlag = adminDoc.exists();
              }
            }
          }
        }

        setIsAdmin(adminFlag);

        if (user.emailVerified && user.email) {
          const userDocRef = doc(db, 'users', user.uid);
          const existingUser = await getDoc(userDocRef);
          const displayName = user.displayName || user.email.split('@')[0] || 'Guest';
          const resolvedRole: 'customer' | 'admin' = adminFlag ? 'admin' : 'customer';

          if (!existingUser.exists()) {
            await setDoc(userDocRef, {
              userId: user.uid,
              name: displayName,
              email: user.email,
              role: resolvedRole,
              createdAt: serverTimestamp(),
            });
          }

          setUserProfile({
            userId: user.uid,
            name: existingUser.exists() ? existingUser.data().name : displayName,
            email: user.email,
            role: resolvedRole,
          });
        }

        if (adminFlag && !seededOnceRef.current) {
          seededOnceRef.current = true;
          await seedInitialDataIfEmpty();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `admins/${user.uid}`);
        setIsAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [seedInitialDataIfEmpty]);

  // 2. Real-Time Catalog & Storefront Listeners (filtered to active-only for public visitors)
  useEffect(() => {
    const handleListenerError = (error: unknown, op: OperationType, path: string) => {
      handleFirestoreError(error, op, path);
      const code = (error as { code?: string })?.code;
      const msg = error instanceof Error ? error.message : String(error);
      if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
        setFirestoreStatus('permission-denied');
      } else {
        setFirestoreStatus('offline');
      }
    };

    const categoriesSource = isAdmin
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('isActive', '==', true));

    const unsubCategories = onSnapshot(
      categoriesSource,
      (snapshot) => {
        setFirestoreStatus('connected');
        if (!snapshot.empty) {
          const loaded: CategoryDoc[] = snapshot.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                categoryId: String(data.categoryId || d.id),
                categoryName: String(data.categoryName || d.id),
                description: data.description ? String(data.description) : undefined,
                image: data.image ? String(data.image) : undefined,
                isActive: data.isActive !== false,
                displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
              };
            })
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          setCategories(loaded);
        }
      },
      (error) => handleListenerError(error, OperationType.LIST, 'categories')
    );

    const menuSource = isAdmin
      ? collection(db, 'menuItems')
      : query(collection(db, 'menuItems'), where('availability', '==', true));

    const unsubMenu = onSnapshot(
      menuSource,
      (snapshot) => {
        setFirestoreStatus('connected');
        if (!snapshot.empty) {
          const loaded: MenuItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              itemId: String(data.itemId || d.id),
              title: String(data.name || ''),
              urduTitle: data.urduTitle ? String(data.urduTitle) : undefined,
              description: String(data.description || ''),
              portionLabel: data.portionLabel ? String(data.portionLabel) : undefined,
              category: String(data.categoryId || 'bbq') as MenuCategory,
              spice: (data.spice || 'medium') as SpiceTier,
              spiceLabel: data.spiceLabel ? String(data.spiceLabel) : undefined,
              price: Number(data.price || 0),
              image: data.imageUrl ? String(data.imageUrl) : undefined,
              badge: data.badge ? String(data.badge) : undefined,
              badgeVariant: data.badgeVariant,
              homeCategory: data.homeCategory,
              variants: Array.isArray(data.variants) ? data.variants : undefined,
              inStock: data.availability !== false,
              featuredOnHome: Boolean(data.featured),
            };
          });
          setMenuItems(loaded);
        }
        setCatalogLoading(false);
      },
      (error) => {
        handleListenerError(error, OperationType.LIST, 'menuItems');
        setCatalogLoading(false);
      }
    );

    const offersSource = isAdmin
      ? collection(db, 'offers')
      : query(collection(db, 'offers'), where('isActive', '==', true));

    const unsubOffers = onSnapshot(
      offersSource,
      (snapshot) => {
        setFirestoreStatus('connected');
        if (!snapshot.empty) {
          const loaded: PromoCode[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              offerId: String(data.offerId || d.id),
              title: String(data.title || data.code || 'Special Offer'),
              code: String(data.code || ''),
              discountType: data.discountType === 'fixed' ? 'fixed' : 'percent',
              discountValue: Number(data.discount || 0),
              description: String(data.description || ''),
              imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
              startDate: data.startDate ? String(data.startDate) : undefined,
              endDate: data.endDate ? String(data.endDate) : undefined,
              validUntil: data.endDate ? String(data.endDate) : 'Active Tonight',
              redemptions: Number(data.redemptions || 0),
              active: data.isActive !== false,
            };
          });
          setPromos(loaded);
        }
      },
      (error) => handleListenerError(error, OperationType.LIST, 'offers')
    );

    const unsubSettings = onSnapshot(
      doc(db, 'restaurantSettings', 'main'),
      (snapshot) => {
        setFirestoreStatus('connected');
        if (snapshot.exists()) {
          const data = snapshot.data();
          setConfig({
            branchName: String(data.restaurantName || INITIAL_CONFIG.branchName),
            landline: String(data.phone || INITIAL_CONFIG.landline),
            whatsappLine: String(data.whatsappNumber || INITIAL_CONFIG.whatsappLine),
            operatingHours: String(data.openingHours || INITIAL_CONFIG.operatingHours),
            deliveryRadius: String(data.deliveryRadius || INITIAL_CONFIG.deliveryRadius),
            deliveryFee: Number(data.deliveryCharges ?? INITIAL_CONFIG.deliveryFee),
            minimumOrder: Number(data.minimumOrder ?? INITIAL_CONFIG.minimumOrder),
            gpsCoordinates: String(data.gpsCoordinates || INITIAL_CONFIG.gpsCoordinates),
            addressLine: String(data.address || INITIAL_CONFIG.addressLine),
            logoUrl: data.logoUrl ? String(data.logoUrl) : BRAND_EMBLEM_URL,
            heroBannerUrl: data.heroBannerUrl ? String(data.heroBannerUrl) : HERO_PLATTER_IMAGE_URL,
          });
        }
      },
      (error) => handleListenerError(error, OperationType.GET, 'restaurantSettings/main')
    );

    return () => {
      unsubCategories();
      unsubMenu();
      unsubOffers();
      unsubSettings();
    };
  }, [isAdmin]);

  // 3. Admin-Only Real-Time Orders Listener (with incoming order notifications)
  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      setOrdersLoading(false);
      initialOrdersSnapshotDoneRef.current = false;
      return;
    }

    setOrdersLoading(true);
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(
      q,
      (snapshot) => {
        if (initialOrdersSnapshotDoneRef.current) {
          const newlyAdded = snapshot
            .docChanges()
            .filter((c) => c.type === 'added' && c.doc.data().orderStatus === 'Pending');
          if (newlyAdded.length > 0) {
            setNewOrderAlertCount((n) => n + newlyAdded.length);
            const first = newlyAdded[0].doc.data();
            showToast(
              `New Order #${first.orderId} from ${first.customerName} (Rs. ${Number(
                first.totalAmount || 0
              ).toLocaleString('en-PK')})`,
              'notifications_active'
            );
          }
        } else {
          initialOrdersSnapshotDoneRef.current = true;
        }

        const loadedOrders: Order[] = snapshot.docs.map((d) => {
          const data = d.data();
          const items: OrderItemLine[] = Array.isArray(data.items)
            ? data.items.map((it: Record<string, unknown>) => ({
                menuItemId: it.menuItemId ? String(it.menuItemId) : undefined,
                title: String(it.title || 'Dish'),
                qty: Number(it.qty || 1),
                price: Number(it.price || 0),
              }))
            : [];
          return {
            id: d.id,
            orderId: String(data.orderId || d.id),
            trackingToken: data.trackingToken ? String(data.trackingToken) : undefined,
            createdAtLabel: formatCreatedAtLabel(data.createdAt),
            customerName: String(data.customerName || ''),
            phone: String(data.customerPhone || ''),
            address: String(data.deliveryAddress || ''),
            landmark: data.landmark ? String(data.landmark) : undefined,
            notes: data.orderNotes ? String(data.orderNotes) : undefined,
            paymentMethod: String(data.paymentMethod || 'Cash on Delivery (COD)'),
            channel: (data.channel || 'online') as 'whatsapp' | 'online' | 'cod',
            promoCode: data.promoCode ? String(data.promoCode) : undefined,
            status: (data.orderStatus || 'Pending') as OrderStatus,
            itemsSummary: items.map((i) => `${i.qty}x ${i.title}`).join(', '),
            items,
            subtotal: Number(data.subtotal || 0),
            discountAmount: Number(data.discountAmount || 0),
            deliveryCharges: Number(data.deliveryCharges ?? 0),
            taxAmount: Number(data.taxAmount ?? 0),
            totalBill: Number(data.totalAmount || 0),
            userId: data.userId ? String(data.userId) : undefined,
            riderName: data.riderName ? String(data.riderName) : undefined,
            riderPhone: data.riderPhone ? String(data.riderPhone) : undefined,
            destinationShort:
              String(data.deliveryAddress || '')
                .split(',')
                .slice(-2)
                .join(',')
                .trim() || 'Karachi',
            etaMinutes: typeof data.etaMinutes === 'number' ? data.etaMinutes : 35,
          };
        });

        setOrders(loadedOrders);
        setOrdersLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
        setOrdersLoading(false);
      }
    );

    return () => unsubOrders();
  }, [isAdmin, showToast]);

  // 4. Real-time Non-PII Customer Order Tracking Listener (secure token OR customer UID ownership)
  useEffect(() => {
    const cleanId = trackedOrderId.trim().toUpperCase();
    if (!cleanId) {
      setTrackedOrder(null);
      setTrackedOrderError('');
      setTrackedOrderLoading(false);
      return;
    }

    if (authLoading) return;

    const isToken = TRACKING_TOKEN_REGEX.test(cleanId);
    if (!isToken && !currentUser) {
      setTrackedOrder(null);
      setTrackedOrderLoading(false);
      setTrackedOrderError(
        'Enter your full secure tracking token (e.g. FKH-123456-...) or sign in to track by Order ID.'
      );
      return;
    }

    setTrackedOrderLoading(true);
    setTrackedOrderError('');

    if (!isToken && currentUser) {
      const ownedQuery = query(
        collection(db, 'orderTracking'),
        where('userId', '==', currentUser.uid),
        where('orderId', '==', cleanId),
        limit(1)
      );
      const unsubOwned = onSnapshot(
        ownedQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setTrackedOrder({
              orderId: String(data.orderId || cleanId),
              trackingToken: data.trackingToken ? String(data.trackingToken) : snapshot.docs[0].id,
              orderStatus: (data.orderStatus || 'Pending') as OrderStatus,
              etaMinutes: typeof data.etaMinutes === 'number' ? data.etaMinutes : undefined,
              userId: data.userId ? String(data.userId) : undefined,
            });
          } else {
            setTrackedOrder(null);
          }
          setTrackedOrderLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `orderTracking/${cleanId}`);
          setTrackedOrder(null);
          setTrackedOrderError(
            'Unable to retrieve tracking details. Check your token or permissions.'
          );
          setTrackedOrderLoading(false);
        }
      );
      return () => unsubOwned();
    }

    const unsubTrack = onSnapshot(
      doc(db, 'orderTracking', cleanId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTrackedOrder({
            orderId: String(data.orderId || cleanId),
            trackingToken: data.trackingToken ? String(data.trackingToken) : cleanId,
            orderStatus: (data.orderStatus || 'Pending') as OrderStatus,
            etaMinutes: typeof data.etaMinutes === 'number' ? data.etaMinutes : undefined,
            userId: data.userId ? String(data.userId) : undefined,
          });
        } else {
          setTrackedOrder(null);
        }
        setTrackedOrderLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `orderTracking/${cleanId}`);
        setTrackedOrder(null);
        setTrackedOrderError(
          'Access denied or invalid tracking token. Verify the full token from your order receipt.'
        );
        setTrackedOrderLoading(false);
      }
    );

    return () => unsubTrack();
  }, [trackedOrderId, currentUser, authLoading]);

  const clearNewOrderAlerts = useCallback(() => setNewOrderAlertCount(0), []);

  // Auth methods
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      showToast('Verification email sent. Check your inbox.', 'mark_email_read');
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    showToast('Signed out of Operations HQ', 'logout');
  }, [showToast]);

  // Cart operations
  const addToCart: StoreContextValue['addToCart'] = useCallback(
    (item) => {
      setCart((prev) => {
        const existing = prev.find((c) => c.id === item.id);
        if (existing) {
          return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        }
        return [...prev, { ...item, qty: 1 }];
      });
      showToast(`Added ${item.title} (Rs. ${item.price.toLocaleString('en-PK')}) to Tray`);
    },
    [showToast]
  );

  const decrementCartItem = useCallback((cartItemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === cartItemId ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0)
    );
  }, []);

  const removeCartItem = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.qty, 0),
    [cart]
  );

  // Place Order via Trusted Server-Side Cloud Function (authoritative price/delivery/promo validation)
  const placeOrder: StoreContextValue['placeOrder'] = useCallback(
    async (payload) => {
      if (cart.length === 0) {
        throw new Error('Your feast bag is empty.');
      }

      const cleanPromo = payload.promoCode?.trim().toUpperCase() || undefined;
      const createOrderFn = httpsCallable<
        {
          customerName: string;
          customerPhone: string;
          deliveryAddress: string;
          landmark?: string;
          orderNotes?: string;
          paymentMethod: string;
          channel: 'whatsapp' | 'online' | 'cod';
          promoCode?: string;
          items: { menuItemId: string; variantKey?: 'half' | 'full'; qty: number }[];
        },
        {
          orderId: string;
          trackingToken: string;
          items: OrderItemLine[];
          subtotal: number;
          discountAmount: number;
          deliveryCharges: number;
          taxAmount: number;
          totalAmount: number;
          etaMinutes: number;
        }
      >(functions, 'createValidatedOrder');

      const response = await createOrderFn(
        stripUndefined({
          customerName: payload.customerName.trim().slice(0, 120),
          customerPhone: payload.phone.trim().slice(0, 30),
          deliveryAddress: payload.address.trim().slice(0, 400),
          landmark: payload.landmark?.trim() ? payload.landmark.trim().slice(0, 200) : undefined,
          orderNotes: payload.notes?.trim() ? payload.notes.trim().slice(0, 400) : undefined,
          paymentMethod: payload.paymentMethod,
          channel: payload.channel,
          promoCode: cleanPromo,
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            ...(line.variantKey ? { variantKey: line.variantKey } : {}),
            qty: Math.max(1, Math.min(100, Math.floor(line.qty))),
          })),
        }) as {
          customerName: string;
          customerPhone: string;
          deliveryAddress: string;
          landmark?: string;
          orderNotes?: string;
          paymentMethod: string;
          channel: 'whatsapp' | 'online' | 'cod';
          promoCode?: string;
          items: { menuItemId: string; variantKey?: 'half' | 'full'; qty: number }[];
        }
      );

      const res = response.data;
      setTrackedOrderId(res.trackingToken || res.orderId);

      return {
        id: res.orderId,
        orderId: res.orderId,
        trackingToken: res.trackingToken,
        createdAtLabel: 'Just now',
        customerName: payload.customerName.trim(),
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        landmark: payload.landmark?.trim(),
        notes: payload.notes?.trim(),
        paymentMethod: payload.paymentMethod,
        channel: payload.channel,
        promoCode: cleanPromo,
        status: 'Pending',
        itemsSummary: res.items.map((i) => `${i.qty}x ${i.title}`).join(', '),
        items: res.items,
        subtotal: res.subtotal,
        discountAmount: res.discountAmount,
        deliveryCharges: res.deliveryCharges,
        taxAmount: res.taxAmount,
        totalBill: res.totalAmount,
        destinationShort:
          payload.address.split(',').slice(-2).join(',').trim() || 'Karachi',
        etaMinutes: res.etaMinutes ?? 35,
      };
    },
    [cart, setTrackedOrderId]
  );

  // Admin: Update order status (+ atomic tracking sync)
  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      extra?: { riderName?: string; riderPhone?: string; etaMinutes?: number }
    ) => {
      try {
        const existingOrder = orders.find((o) => o.id === orderId || o.orderId === orderId);
        const trackingDocId = existingOrder?.trackingToken || orderId;
        const batch = writeBatch(db);
        const orderUpdate = stripUndefined({
          orderStatus: status,
          riderName: extra?.riderName,
          riderPhone: extra?.riderPhone,
          etaMinutes: extra?.etaMinutes,
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'orders', orderId), orderUpdate);

        const trackingUpdate = stripUndefined({
          orderStatus: status,
          etaMinutes: extra?.etaMinutes,
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'orderTracking', trackingDocId), trackingUpdate);

        await batch.commit();
        showToast(`Order #${orderId} updated to ${status}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`, true);
      }
    },
    [orders, showToast]
  );

  // Admin: Menu Items CRUD
  const toggleDishStock = useCallback(
    async (dishId: string, inStock: boolean) => {
      try {
        await updateDoc(doc(db, 'menuItems', dishId), {
          availability: inStock,
          updatedAt: serverTimestamp(),
        });
        showToast(
          inStock ? 'Dish marked Available on live menu' : 'Dish marked Out of Stock',
          inStock ? 'check_circle' : 'block'
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `menuItems/${dishId}`, true);
      }
    },
    [showToast]
  );

  const updateDishPrice = useCallback(
    async (dishId: string, newPrice: number) => {
      try {
        const existing = menuItems.find((m) => m.id === dishId);
        const updatedVariants =
          existing?.variants && existing.variants.length > 0
            ? existing.variants.map((v, idx) => (idx === 0 ? { ...v, price: newPrice } : v))
            : undefined;

        await updateDoc(
          doc(db, 'menuItems', dishId),
          stripUndefined({
            price: newPrice,
            variants: updatedVariants,
            updatedAt: serverTimestamp(),
          })
        );
        showToast(`Updated rate to PKR ${newPrice.toLocaleString('en-PK')}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `menuItems/${dishId}`, true);
      }
    },
    [menuItems, showToast]
  );

  const updateDish = useCallback(
    async (dishId: string, payload: DishMutationPayload, previousImageUrl?: string) => {
      try {
        const existing = menuItems.find((m) => m.id === dishId);
        const updatedVariants =
          existing?.variants && existing.variants.length > 0
            ? existing.variants.map((v, idx) => (idx === 0 ? { ...v, price: payload.price } : v))
            : undefined;

        const spiceLabel =
          payload.spice === 'mild'
            ? 'Mild Aromatic'
            : payload.spice === 'spicy'
            ? 'Angara Heat'
            : 'Medium Spice';

        await updateDoc(
          doc(db, 'menuItems', dishId),
          stripUndefined({
            name: payload.title.trim(),
            urduTitle: payload.urduTitle?.trim() || undefined,
            description: payload.description.trim(),
            portionLabel: payload.portionLabel?.trim() || undefined,
            categoryId: payload.category,
            spice: payload.spice,
            spiceLabel,
            price: payload.price,
            imageUrl: payload.image || undefined,
            availability: payload.inStock,
            featured: Boolean(payload.featuredOnHome),
            variants: updatedVariants,
            updatedAt: serverTimestamp(),
          })
        );

        if (previousImageUrl && previousImageUrl !== payload.image) {
          await deleteStorageImageByUrl(previousImageUrl);
        }

        showToast(`Saved changes to "${payload.title}"`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `menuItems/${dishId}`, true);
      }
    },
    [menuItems, showToast]
  );

  const deleteDish = useCallback(
    async (dishId: string, imageUrl?: string) => {
      try {
        await deleteDoc(doc(db, 'menuItems', dishId));
        if (imageUrl) {
          await deleteStorageImageByUrl(imageUrl);
        }
        showToast('Dish removed from active menu', 'delete');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `menuItems/${dishId}`, true);
      }
    },
    [showToast]
  );

  const createDish = useCallback(
    async (payload: DishMutationPayload) => {
      const id = `dish_${Date.now()}`;
      const spiceLabel =
        payload.spice === 'mild'
          ? 'Mild Aromatic'
          : payload.spice === 'spicy'
          ? 'Angara Heat'
          : 'Medium Spice';

      try {
        await setDoc(
          doc(db, 'menuItems', id),
          stripUndefined({
            itemId: id,
            name: payload.title.trim(),
            urduTitle: payload.urduTitle?.trim() || undefined,
            description:
              payload.description.trim() ||
              'Prepared fresh over glowing tamarind charcoal with ancestral Burns Road spices.',
            portionLabel: payload.portionLabel?.trim() || undefined,
            categoryId: payload.category,
            spice: payload.spice,
            spiceLabel,
            price: payload.price,
            imageUrl: payload.image || undefined,
            availability: payload.inStock,
            featured: Boolean(payload.featuredOnHome),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
        showToast(`Added "${payload.title}" to royal menu!`);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `menuItems/${id}`, true);
      }
    },
    [showToast]
  );

  // Admin: Categories CRUD
  const createCategory = useCallback(
    async (payload: CategoryMutationPayload) => {
      const slug = payload.categoryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const categoryId = slug || `cat_${Date.now()}`;

      try {
        await setDoc(
          doc(db, 'categories', categoryId),
          stripUndefined({
            categoryId,
            categoryName: payload.categoryName.trim(),
            description: payload.description?.trim() || undefined,
            image: payload.image || undefined,
            isActive: payload.isActive,
            displayOrder: categories.length + 1,
            createdAt: serverTimestamp(),
          })
        );
        showToast(`Category "${payload.categoryName}" added`);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `categories/${categoryId}`, true);
      }
    },
    [categories.length, showToast]
  );

  const toggleCategoryActive = useCallback(
    async (categoryId: string, isActive: boolean) => {
      try {
        await updateDoc(doc(db, 'categories', categoryId), { isActive });
        showToast(isActive ? 'Category enabled' : 'Category hidden from menu');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `categories/${categoryId}`, true);
      }
    },
    [showToast]
  );

  const deleteCategory = useCallback(
    async (categoryId: string, imageUrl?: string) => {
      try {
        await deleteDoc(doc(db, 'categories', categoryId));
        if (imageUrl) {
          await deleteStorageImageByUrl(imageUrl);
        }
        showToast('Category removed', 'delete');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`, true);
      }
    },
    [showToast]
  );

  // Admin: Offers / Promos CRUD
  const createPromo = useCallback(
    async (payload: PromoMutationPayload) => {
      const cleanCode = payload.code.trim().toUpperCase();
      const id = `promo_${Date.now()}`;
      try {
        await setDoc(
          doc(db, 'offers', id),
          stripUndefined({
            offerId: id,
            title: payload.title?.trim() || `${cleanCode} Offer`,
            code: cleanCode,
            description: payload.description.trim(),
            discount: payload.discountValue,
            discountType: payload.discountType,
            imageUrl: payload.imageUrl || undefined,
            startDate: payload.startDate || undefined,
            endDate: payload.endDate || 'Active Tonight',
            redemptions: 0,
            isActive: true,
            createdAt: serverTimestamp(),
          })
        );
        showToast(`Voucher ${cleanCode} activated & synced with checkout`);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `offers/${id}`, true);
      }
    },
    [showToast]
  );

  const togglePromoActive = useCallback(
    async (promoId: string, active: boolean) => {
      try {
        await updateDoc(doc(db, 'offers', promoId), { isActive: active });
        showToast(active ? 'Promo voucher activated' : 'Promo voucher paused');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `offers/${promoId}`, true);
      }
    },
    [showToast]
  );

  const deletePromo = useCallback(
    async (promoId: string, imageUrl?: string) => {
      try {
        await deleteDoc(doc(db, 'offers', promoId));
        if (imageUrl) {
          await deleteStorageImageByUrl(imageUrl);
        }
        showToast('Promo voucher removed', 'delete');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `offers/${promoId}`, true);
      }
    },
    [showToast]
  );

  // Admin: Restaurant Settings update
  const updateConfig = useCallback(
    async (next: RestaurantConfig) => {
      try {
        await setDoc(
          doc(db, 'restaurantSettings', 'main'),
          stripUndefined({
            restaurantName: next.branchName.trim(),
            phone: next.landline.trim(),
            whatsappNumber: next.whatsappLine.trim(),
            address: next.addressLine.trim(),
            openingHours: next.operatingHours.trim(),
            deliveryCharges: Number(next.deliveryFee) || 0,
            minimumOrder: Number(next.minimumOrder) || 0,
            deliveryRadius: next.deliveryRadius.trim(),
            gpsCoordinates: next.gpsCoordinates.trim(),
            logoUrl: next.logoUrl || undefined,
            heroBannerUrl: next.heroBannerUrl || undefined,
            updatedAt: serverTimestamp(),
          })
        );

        if (config.logoUrl && config.logoUrl !== next.logoUrl) {
          await deleteStorageImageByUrl(config.logoUrl);
        }
        if (config.heroBannerUrl && config.heroBannerUrl !== next.heroBannerUrl) {
          await deleteStorageImageByUrl(config.heroBannerUrl);
        }

        showToast('Kitchen & dispatch settings saved to Firebase');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'restaurantSettings/main', true);
      }
    },
    [config.heroBannerUrl, config.logoUrl, showToast]
  );

  const value: StoreContextValue = {
    activeTab,
    setActiveTab,
    currentUser,
    authLoading,
    isAdmin,
    userProfile,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    resendVerificationEmail,
    logout,
    firestoreStatus,
    categories,
    menuItems,
    catalogLoading,
    cart,
    orders,
    ordersLoading,
    newOrderAlertCount,
    clearNewOrderAlerts,
    promos,
    config,
    toast,
    menuSearchQuery,
    setMenuSearchQuery,
    showToast,
    addToCart,
    decrementCartItem,
    removeCartItem,
    clearCart,
    cartCount,
    cartSubtotal,
    placeOrder,
    trackedOrderId,
    setTrackedOrderId,
    trackedOrder,
    trackedOrderLoading,
    trackedOrderError,
    runDiagnostics: runAdminFirestoreHealthCheck,
    updateOrderStatus,
    toggleDishStock,
    updateDishPrice,
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
    seedInitialDataIfEmpty,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
