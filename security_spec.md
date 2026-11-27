# Security Specification — Fayyaz Kabaab House

## 1. Data Invariants
1. **Menu & Categories**: Publicly readable (`get`, `list`) for storefront display; only verified admins (`isAdmin()`) can create, update, or delete categories, menu items, offers, or restaurant settings.
2. **PII Isolation on Users & Orders**:
   - Customer personal information (`customerName`, `customerPhone`, `deliveryAddress`, `email`, `phone`) in `users` and `orders` is never publicly readable or listable.
   - Only `isAdmin()` or the owning authenticated user (`request.auth.uid == userId`) can read `users/{userId}` or `orders/{orderId}`.
3. **Server-Side Order Validation**:
   - Every created order must have `orderStatus == 'Pending'`, server-validated timestamps (`createdAt == request.time`, `updatedAt == request.time`), `subtotal > 0`, `deliveryCharges` matching `restaurantSettings/main.data.deliveryCharges`, and `totalAmount == (subtotal - discountAmount) + deliveryCharges + taxAmount`.
   - Orders must atomically create a corresponding non-PII `orderTracking/{orderId}` document via `existsAfter()`.
4. **Privilege Escalation Prevention**:
   - Users creating their own `/users/{userId}` document must have `role == 'customer'` and cannot set `role == 'admin'` or mutate `role` on update.
   - `admins/{userId}` is strictly writable only by existing verified admins (`isAdmin()`).
5. **Path Variable & Payload Size Hardening**:
   - Every document ID is checked with `isValidId()` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars) and every string/array enforces explicit size bounds.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User with `email: 'orgqfn@gmail.com'` and `email_verified: false` attempts to write to `menuItems/test_item`.
2. **Customer Self-Escalation**: Signed-in customer creates `users/{uid}` with `role: 'admin'`.
3. **Ghost Field Shadow Write on MenuItem**: Admin or attacker creates `menuItems/seekh_1` with an extra shadow key `isFreePromo: true`.
4. **Tampered Delivery Fee**: Customer creates `orders/FKH-9001` with `deliveryCharges: 0` when `restaurantSettings/main.deliveryCharges == 150`.
5. **Tampered Total Amount**: Customer creates `orders/FKH-9002` with `subtotal: 1000, deliveryCharges: 150, taxAmount: 50, totalAmount: 10`.
6. **Pre-Confirmed Order Status**: Customer creates `orders/FKH-9003` with `orderStatus: 'Delivered'`.
7. **Client-Forged Timestamp**: Customer creates `orders/FKH-9004` with `createdAt: '2020-01-01T00:00:00Z'` instead of `request.time`.
8. **Unauthorized Order Read / PII Scrape**: Unauthenticated user or non-owner customer calls `getDoc(orders/FKH-1048)` or `getDocs(collection(db, 'orders'))`.
9. **Unauthorized Order Status Mutation**: Non-admin customer updates `orders/FKH-1048` `orderStatus` to `'Delivered'`.
10. **ID Poisoning**: Attacker attempts `setDoc(doc(db, 'orders', '../../admin_hack'), ...)`.
11. **Oversized Items Array**: Attacker submits `orders/FKH-9005` with 100 items (`> 30`).
12. **Public OrderTracking List Scrape**: Unauthenticated user calls `getDocs(collection(db, 'orderTracking'))` (`allow list` must deny!).
