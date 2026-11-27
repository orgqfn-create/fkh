import { randomBytes, randomInt } from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

const BOOTSTRAPPED_ADMIN_EMAIL = 'orgqfn@gmail.com';

/**
 * Automatically sync Firebase Auth Custom Claims (`admin: true`)
 * whenever an entry in `admins/{userId}` is created or removed.
 */
export const syncAdminCustomClaim = onDocumentWritten('admins/{userId}', async (event) => {
  const uid = event.params.userId;
  const exists = Boolean(event.data?.after.exists);
  try {
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      admin: exists,
      role: exists ? 'admin' : 'customer',
    });
  } catch (err) {
    console.warn(`Could not sync custom claims for ${uid}:`, err);
  }
});

/**
 * Trusted server-side admin verification callable.
 * Grants/refreshes Firebase Auth custom claims for verified admins.
 */
export const verifyAdminRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid = request.auth.uid;
  const email = String(request.auth.token.email || '').toLowerCase();
  const emailVerified = request.auth.token.email_verified === true;

  if (!emailVerified) {
    return { isAdmin: false };
  }

  const adminRef = db.doc(`admins/${uid}`);
  const adminSnap = await adminRef.get();
  const isBootstrapped = email === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  if (isBootstrapped && !adminSnap.exists) {
    await adminRef.set({
      uid,
      email,
      name: String(request.auth.token.name || 'Operations Admin'),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const isAuthorized = isBootstrapped || adminSnap.exists || request.auth.token.admin === true;

  if (isAuthorized) {
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    if (existingClaims.admin !== true) {
      await adminAuth.setCustomUserClaims(uid, {
        ...existingClaims,
        admin: true,
        role: 'admin',
      });
    }
  }

  return { isAdmin: isAuthorized };
});

/**
 * Server-side validated order creation callable Cloud Function.
 * Never trusts browser-supplied prices, discounts, delivery fees, or totals:
 * - Re-reads item prices & stock availability from authoritative `menuItems`
 * - Applies active `offers` discounts
 * - Enforces `restaurantSettings/main` `minimumOrder` and `deliveryCharges`
 * - Generates unguessable `trackingToken` and writes `orders/{orderId}` + PII-free `orderTracking/{trackingToken}` atomically
 */
export const createValidatedOrder = onCall(async (request) => {
  const data = request.data as {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    landmark?: string;
    orderNotes?: string;
    paymentMethod: string;
    channel?: 'whatsapp' | 'online' | 'cod';
    promoCode?: string;
    items: { menuItemId: string; variantKey?: 'half' | 'full'; qty: number }[];
  };

  if (!data || !Array.isArray(data.items) || data.items.length === 0 || data.items.length > 30) {
    throw new HttpsError('invalid-argument', 'Order must contain 1 to 30 items.');
  }

  const customerName = String(data.customerName || '').trim().slice(0, 120);
  const customerPhone = String(data.customerPhone || '').trim().slice(0, 30);
  const deliveryAddress = String(data.deliveryAddress || '').trim().slice(0, 400);
  const paymentMethod = String(data.paymentMethod || 'Cash on Delivery (COD)').trim().slice(0, 80);

  if (!customerName || customerPhone.length < 5 || deliveryAddress.length < 3) {
    throw new HttpsError(
      'invalid-argument',
      'Customer name, phone number, and delivery address are required.'
    );
  }

  const settingsSnap = await db.doc('restaurantSettings/main').get();
  const settings = settingsSnap.data() || { deliveryCharges: 150, minimumOrder: 0 };
  const deliveryCharges = Math.max(0, Number(settings.deliveryCharges ?? 150));
  const minimumOrder = Math.max(0, Number(settings.minimumOrder ?? 0));

  let subtotal = 0;
  const verifiedItems: { menuItemId: string; title: string; qty: number; price: number }[] = [];

  for (const line of data.items) {
    const qty = Math.floor(Number(line.qty));
    const menuItemId = String(line.menuItemId || '').trim();
    if (!menuItemId || !Number.isFinite(qty) || qty < 1 || qty > 100) {
      throw new HttpsError('invalid-argument', 'Invalid item or quantity.');
    }

    const itemSnap = await db.doc(`menuItems/${menuItemId}`).get();
    if (!itemSnap.exists) {
      throw new HttpsError('not-found', `Menu item ${menuItemId} does not exist.`);
    }
    const item = itemSnap.data()!;
    if (item.availability !== true) {
      throw new HttpsError('failed-precondition', `${item.name} is currently out of stock.`);
    }

    let unitPrice = Number(item.price);
    let title = String(item.name);
    if (line.variantKey && Array.isArray(item.variants)) {
      const variant = item.variants.find(
        (v: { key: string; price: number }) => v.key === line.variantKey
      );
      if (!variant) {
        throw new HttpsError('invalid-argument', `Invalid portion variant for ${item.name}.`);
      }
      unitPrice = Number(variant.price);
      title = `${item.name} (${line.variantKey === 'half' ? 'Half' : 'Full'})`;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new HttpsError('internal', `Invalid configured price for ${item.name}.`);
    }

    subtotal += unitPrice * qty;
    verifiedItems.push({ menuItemId, title, qty, price: unitPrice });
  }

  if (minimumOrder > 0 && subtotal < minimumOrder) {
    throw new HttpsError(
      'failed-precondition',
      `Minimum order amount is Rs. ${minimumOrder.toLocaleString('en-PK')}.`
    );
  }

  let discountAmount = 0;
  const cleanPromo = data.promoCode ? String(data.promoCode).trim().toUpperCase().slice(0, 40) : '';
  if (cleanPromo) {
    const offerQuery = await db
      .collection('offers')
      .where('code', '==', cleanPromo)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!offerQuery.empty) {
      const offer = offerQuery.docs[0].data();
      discountAmount =
        offer.discountType === 'fixed'
          ? Math.min(subtotal, Number(offer.discount))
          : Math.round((subtotal * Number(offer.discount)) / 100);
    }
  }

  const effectiveSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(effectiveSubtotal * 0.05);
  const totalAmount = effectiveSubtotal + deliveryCharges + taxAmount;

  const orderDigits = randomInt(100000, 999999);
  const orderId = `FKH-${orderDigits}`;
  const trackingSecret = randomBytes(8).toString('hex').toUpperCase();
  const trackingToken = `${orderId}-${trackingSecret}`;

  const batch = db.batch();

  batch.set(db.doc(`orders/${orderId}`), {
    orderId,
    trackingToken,
    customerName,
    customerPhone,
    deliveryAddress,
    ...(data.landmark?.trim() ? { landmark: String(data.landmark).trim().slice(0, 200) } : {}),
    ...(data.orderNotes?.trim() ? { orderNotes: String(data.orderNotes).trim().slice(0, 400) } : {}),
    items: verifiedItems,
    subtotal,
    discountAmount,
    deliveryCharges,
    taxAmount,
    totalAmount,
    paymentMethod,
    channel: data.channel || 'online',
    ...(cleanPromo ? { promoCode: cleanPromo } : {}),
    orderStatus: 'Pending',
    ...(request.auth?.uid ? { userId: request.auth.uid } : {}),
    etaMinutes: 35,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(db.doc(`orderTracking/${trackingToken}`), {
    orderId,
    trackingToken,
    orderStatus: 'Pending',
    etaMinutes: 35,
    ...(request.auth?.uid ? { userId: request.auth.uid } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    orderId,
    trackingToken,
    items: verifiedItems,
    subtotal,
    discountAmount,
    deliveryCharges,
    taxAmount,
    totalAmount,
    etaMinutes: 35,
  };
});

/**
 * Notify admin FCM topic when a new customer order arrives.
 */
export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data();
  if (!order) return;

  try {
    await getMessaging().send({
      topic: 'admin-orders',
      notification: {
        title: `New Order #${order.orderId}`,
        body: `${order.customerName} · Rs. ${order.totalAmount}`,
      },
      data: { orderId: String(order.orderId) },
    });
  } catch (err) {
    console.warn('FCM admin notification skipped:', err);
  }
});

/**
 * Sync non-PII tracking status whenever an admin updates orders/{orderId}.
 */
export const onOrderStatusUpdated = onDocumentUpdated('orders/{orderId}', async (event) => {
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  if (!after || !before || after.orderStatus === before.orderStatus) return;

  const trackingDocId = String(after.trackingToken || event.params.orderId);
  await db.doc(`orderTracking/${trackingDocId}`).set(
    {
      orderId: String(after.orderId || event.params.orderId),
      trackingToken: trackingDocId,
      orderStatus: after.orderStatus,
      etaMinutes: after.etaMinutes ?? 30,
      ...(after.userId ? { userId: String(after.userId) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: after.createdAt,
    },
    { merge: true }
  );
});
