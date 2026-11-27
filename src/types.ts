export type TabRoute = 'home' | 'menu-bbq' | 'cart-order' | 'admin-panel';

export type MenuCategory = 'bbq' | 'karahi' | 'breads' | 'sides' | 'drinks' | 'deals' | string;

export type SpiceTier = 'mild' | 'medium' | 'spicy';

export interface MenuVariant {
  key: 'half' | 'full';
  label: string;
  price: number;
}

export interface CategoryDoc {
  id: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  image?: string;
  isActive: boolean;
  displayOrder?: number;
}

export interface MenuItem {
  id: string;
  itemId?: string;
  title: string;
  urduTitle?: string;
  description: string;
  portionLabel?: string;
  category: MenuCategory;
  spice: SpiceTier;
  spiceLabel?: string;
  price: number;
  image?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary';
  variants?: MenuVariant[];
  inStock: boolean;
  featuredOnHome?: boolean;
  homeCategory?: 'seekh' | 'tikka' | 'bihari';
}

export interface CartItem {
  id: string;
  menuItemId: string;
  variantKey?: 'half' | 'full';
  title: string;
  subtitle?: string;
  price: number;
  qty: number;
  image?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItemLine {
  menuItemId?: string;
  title: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  orderId: string;
  trackingToken?: string;
  createdAtLabel: string;
  customerName: string;
  phone: string;
  address: string;
  landmark?: string;
  notes?: string;
  paymentMethod: string;
  channel: 'whatsapp' | 'online' | 'cod';
  promoCode?: string;
  status: OrderStatus;
  itemsSummary: string;
  items: OrderItemLine[];
  subtotal: number;
  discountAmount: number;
  deliveryCharges: number;
  taxAmount: number;
  totalBill: number;
  userId?: string;
  riderName?: string;
  riderPhone?: string;
  destinationShort?: string;
  etaMinutes?: number;
}

export interface OrderTrackingDoc {
  orderId: string;
  trackingToken?: string;
  orderStatus: OrderStatus;
  etaMinutes?: number;
  userId?: string;
}

export interface PromoCode {
  id: string;
  offerId?: string;
  title: string;
  code: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  description: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  validUntil: string;
  redemptions: number;
  active: boolean;
}

export interface RestaurantConfig {
  branchName: string;
  landline: string;
  whatsappLine: string;
  operatingHours: string;
  deliveryRadius: string;
  deliveryFee: number;
  minimumOrder: number;
  gpsCoordinates: string;
  addressLine: string;
  logoUrl?: string;
  heroBannerUrl?: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
}
