/**
 * Firebase Emulator Suite Security Rules Test Harness
 * Run with: firebase emulators:exec --only firestore,storage "npx tsx firestore.rules.test.ts"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

async function runTests() {
  const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');
  const storageRules = fs.readFileSync('storage.rules', 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: 'fkh-31097',
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });

  const adminClaimCtx = testEnv.authenticatedContext('admin-claim-uid', {
    email: 'manager@fayyazkabaab.pk',
    email_verified: true,
    admin: true,
  });
  const bootstrappedAdminCtx = testEnv.authenticatedContext('boot-admin-uid', {
    email: 'orgqfn@gmail.com',
    email_verified: true,
  });
  const unverifiedSpoofCtx = testEnv.authenticatedContext('spoof-uid', {
    email: 'orgqfn@gmail.com',
    email_verified: false,
  });
  const customerCtx = testEnv.authenticatedContext('cust-uid', {
    email: 'customer@example.com',
    email_verified: true,
  });
  const otherCustomerCtx = testEnv.authenticatedContext('other-cust-uid', {
    email: 'other@example.com',
    email_verified: true,
  });
  const anonCtx = testEnv.unauthenticatedContext();

  // Seed initial active & private documents as verified admin
  await assertSucceeds(
    setDoc(doc(bootstrappedAdminCtx.firestore(), 'restaurantSettings', 'main'), {
      restaurantName: 'Fayyaz Kabaab House',
      phone: '+92 21 32624589',
      whatsappNumber: '+92 300 1234567',
      address: 'Food Street, Burns Road, Saddar, Karachi',
      openingHours: '12 PM - 02 AM',
      deliveryCharges: 150,
      minimumOrder: 500,
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'restaurantSettings', 'internal'), {
      restaurantName: 'Internal Branch Ops',
      phone: '+92 21 32624589',
      whatsappNumber: '+92 300 1234567',
      address: 'Burns Road Vault',
      openingHours: '12 PM - 02 AM',
      deliveryCharges: 150,
      minimumOrder: 500,
      updatedAt: serverTimestamp(),
    })
  );

  // Test 4: Unauthenticated visitor can read public restaurant settings ('main'), NOT internal docs
  await assertSucceeds(getDoc(doc(anonCtx.firestore(), 'restaurantSettings', 'main')));
  await assertFails(getDoc(doc(anonCtx.firestore(), 'restaurantSettings', 'internal')));
  await assertFails(getDocs(collection(anonCtx.firestore(), 'restaurantSettings')));

  // Test 6 & 12: Unauthenticated visitor / customer cannot access admin diagnostic or admin directory
  await assertFails(getDoc(doc(anonCtx.firestore(), 'test', 'connection')));
  await assertFails(getDoc(doc(customerCtx.firestore(), 'test', 'connection')));
  await assertFails(getDoc(doc(anonCtx.firestore(), 'admins', 'admin-claim-uid')));
  await assertFails(
    setDoc(doc(anonCtx.firestore(), 'menuItems', 'anon_inject'), {
      itemId: 'anon_inject',
      name: 'Unauthorized',
      description: 'Test',
      categoryId: 'bbq',
      price: 100,
      availability: true,
      featured: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'test', 'connection'), {
      checkedBy: 'admin-claim-uid',
      checkedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(getDoc(doc(adminClaimCtx.firestore(), 'test', 'connection')));

  // Spoofed unverified email & privilege escalation rejected
  await assertFails(
    setDoc(doc(unverifiedSpoofCtx.firestore(), 'menuItems', 'seekh_spoof'), {
      itemId: 'seekh_spoof',
      name: 'Beef Seekh',
      description: 'Test',
      categoryId: 'bbq',
      price: 890,
      availability: true,
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    setDoc(doc(customerCtx.firestore(), 'users', 'cust-uid'), {
      userId: 'cust-uid',
      name: 'Attacker',
      email: 'customer@example.com',
      role: 'admin',
      createdAt: serverTimestamp(),
    })
  );

  // Test 2 & 7: Categories public active read & admin CRUD
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'categories', 'bbq'), {
      categoryId: 'bbq',
      categoryName: 'Charcoal BBQ',
      isActive: true,
      displayOrder: 1,
      createdAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'categories', 'hidden_cat'), {
      categoryId: 'hidden_cat',
      categoryName: 'Secret Prep',
      isActive: false,
      displayOrder: 2,
      createdAt: serverTimestamp(),
    })
  );
  await assertSucceeds(getDoc(doc(anonCtx.firestore(), 'categories', 'bbq')));
  await assertFails(getDoc(doc(anonCtx.firestore(), 'categories', 'hidden_cat')));
  await assertSucceeds(
    getDocs(query(collection(anonCtx.firestore(), 'categories'), where('isActive', '==', true)))
  );
  await assertFails(getDocs(collection(anonCtx.firestore(), 'categories')));

  // Test 1, 7 & 8: Admin adds menu items & updates prices; visitor reads only available items
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'menuItems', 'seekh_active'), {
      itemId: 'seekh_active',
      name: 'Beef Seekh',
      description: 'Charcoal grilled',
      categoryId: 'bbq',
      price: 890,
      availability: true,
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(adminClaimCtx.firestore(), 'menuItems', 'seekh_active'), {
      price: 950,
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(customerCtx.firestore(), 'menuItems', 'seekh_active'), {
      price: 1,
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'menuItems', 'seekh_inactive'), {
      itemId: 'seekh_inactive',
      name: 'Sold Out Special',
      description: 'Inactive',
      categoryId: 'bbq',
      price: 990,
      availability: false,
      featured: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(getDoc(doc(anonCtx.firestore(), 'menuItems', 'seekh_active')));
  await assertFails(getDoc(doc(anonCtx.firestore(), 'menuItems', 'seekh_inactive')));
  await assertSucceeds(
    getDocs(query(collection(anonCtx.firestore(), 'menuItems'), where('availability', '==', true)))
  );
  await assertFails(getDocs(collection(anonCtx.firestore(), 'menuItems')));

  // Test 3 & 9: Admin manages offers; visitor reads only active offers
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'offers', 'offer_active'), {
      offerId: 'offer_active',
      title: 'Burns Road Night',
      code: 'BURNSROAD',
      description: '10% Off',
      discount: 10,
      discountType: 'percent',
      isActive: true,
      createdAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(adminClaimCtx.firestore(), 'offers', 'offer_active'), {
      discount: 15,
    })
  );
  await assertSucceeds(
    setDoc(doc(adminClaimCtx.firestore(), 'offers', 'offer_paused'), {
      offerId: 'offer_paused',
      title: 'Staff Discount',
      code: 'STAFF50',
      description: '50% Off',
      discount: 50,
      discountType: 'percent',
      isActive: false,
      createdAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(customerCtx.firestore(), 'offers', 'offer_active'), {
      discount: 99,
    })
  );
  await assertSucceeds(getDoc(doc(anonCtx.firestore(), 'offers', 'offer_active')));
  await assertFails(getDoc(doc(anonCtx.firestore(), 'offers', 'offer_paused')));
  await assertSucceeds(
    getDocs(query(collection(anonCtx.firestore(), 'offers'), where('isActive', '==', true)))
  );
  await assertFails(getDocs(collection(anonCtx.firestore(), 'offers')));
  await assertSucceeds(deleteDoc(doc(adminClaimCtx.firestore(), 'offers', 'offer_paused')));

  // Test 5 & 10: Unauthenticated/customer cannot directly create or tamper with order totals
  await assertFails(
    setDoc(doc(anonCtx.firestore(), 'orders', 'FKH-331766'), {
      orderId: 'FKH-331766',
      trackingToken: 'FKH-331766-ABCDEF1234567890',
      customerName: 'Guest',
      customerPhone: '0300-1234567',
      deliveryAddress: 'Clifton Karachi',
      items: [{ title: 'Beef Seekh', qty: 1, price: 890 }],
      subtotal: 890,
      discountAmount: 0,
      deliveryCharges: 150,
      taxAmount: 45,
      totalAmount: 1085,
      paymentMethod: 'COD',
      orderStatus: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  const validToken = 'FKH-900200-A1B2C3D4E5F60718';
  const adminBatch = writeBatch(adminClaimCtx.firestore());
  adminBatch.set(doc(adminClaimCtx.firestore(), 'orders', 'FKH-900200'), {
    orderId: 'FKH-900200',
    trackingToken: validToken,
    customerName: 'Ali Raza',
    customerPhone: '0300-1234567',
    deliveryAddress: 'Clifton Block 4, Karachi',
    items: [{ title: 'Beef Seekh', qty: 1, price: 950 }],
    subtotal: 950,
    discountAmount: 0,
    deliveryCharges: 150,
    taxAmount: 48,
    totalAmount: 1148,
    paymentMethod: 'Cash on Delivery (COD)',
    orderStatus: 'Pending',
    userId: 'cust-uid',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  adminBatch.set(doc(adminClaimCtx.firestore(), 'orderTracking', validToken), {
    orderId: 'FKH-900200',
    trackingToken: validToken,
    orderStatus: 'Pending',
    etaMinutes: 35,
    userId: 'cust-uid',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(adminBatch.commit());

  // Test 5, 11 & 12: Customer cannot access another customer's order or PII; unauth cannot read orders
  await assertSucceeds(getDoc(doc(customerCtx.firestore(), 'orders', 'FKH-900200')));
  await assertFails(getDoc(doc(otherCustomerCtx.firestore(), 'orders', 'FKH-900200')));
  await assertFails(getDoc(doc(anonCtx.firestore(), 'orders', 'FKH-900200')));
  await assertFails(getDocs(collection(anonCtx.firestore(), 'orders')));
  await assertFails(getDocs(collection(otherCustomerCtx.firestore(), 'orders')));
  await assertSucceeds(
    getDocs(query(collection(customerCtx.firestore(), 'orders'), where('userId', '==', 'cust-uid')))
  );

  // Test 10: Customer cannot modify order totals or status; Admin can update status
  await assertFails(
    updateDoc(doc(customerCtx.firestore(), 'orders', 'FKH-900200'), {
      totalAmount: 1,
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    updateDoc(doc(customerCtx.firestore(), 'orders', 'FKH-900200'), {
      orderStatus: 'Delivered',
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(
    updateDoc(doc(adminClaimCtx.firestore(), 'orders', 'FKH-900200'), {
      orderStatus: 'Confirmed',
      updatedAt: serverTimestamp(),
    })
  );

  // Order tracking security: guessable ID fails for anon; secret trackingToken succeeds
  await assertFails(getDoc(doc(anonCtx.firestore(), 'orderTracking', 'FKH-331766')));
  await assertSucceeds(getDoc(doc(anonCtx.firestore(), 'orderTracking', validToken)));
  await assertFails(getDocs(collection(anonCtx.firestore(), 'orderTracking')));
  await assertFails(getDocs(collection(otherCustomerCtx.firestore(), 'orderTracking')));
  await assertSucceeds(deleteDoc(doc(adminClaimCtx.firestore(), 'menuItems', 'seekh_inactive')));

  // Test 13: Firebase Storage upload/read/delete permissions
  const validImageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  await assertSucceeds(
    uploadBytes(ref(adminClaimCtx.storage(), 'restaurant/menu/seekh.jpg'), validImageBytes, {
      contentType: 'image/jpeg',
    })
  );
  await assertFails(
    uploadBytes(ref(customerCtx.storage(), 'restaurant/menu/hack.jpg'), validImageBytes, {
      contentType: 'image/jpeg',
    })
  );
  await assertFails(
    uploadBytes(ref(adminClaimCtx.storage(), 'restaurant/menu/bad.pdf'), validImageBytes, {
      contentType: 'application/pdf',
    })
  );
  await assertFails(
    uploadBytes(ref(adminClaimCtx.storage(), 'private/secret.jpg'), validImageBytes, {
      contentType: 'image/jpeg',
    })
  );
  await assertSucceeds(getBytes(ref(anonCtx.storage(), 'restaurant/menu/seekh.jpg')));
  await assertFails(deleteObject(ref(customerCtx.storage(), 'restaurant/menu/seekh.jpg')));
  await assertSucceeds(deleteObject(ref(adminClaimCtx.storage(), 'restaurant/menu/seekh.jpg')));

  await testEnv.cleanup();
  console.log('All 13 Firestore & Storage Security Rules tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
