# Fayyaz Kabaab House — Firebase Backend Setup, Testing & Deployment Guide

This application is wired directly to **Google Firebase** (`fkh-31097`) with the `(default)` Cloud Firestore database, Firebase Authentication (including custom claims), Firebase Storage, Cloud Functions, Composite Indexes, and hardened Security Rules.

---

## 1. Environment Variables & Config

Firebase client configuration loads directly from Vite environment variables (`VITE_FIREBASE_*`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=fkh-31097
VITE_FIREBASE_STORAGE_BUCKET=fkh-31097.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 2. One-Time Firebase Console Steps

1. **Authentication -> Sign-in method**:
   - **Google Sign-In** is ready for the bootstrapped administrator (`orgqfn@gmail.com`).
   - To enable **Email & Password** login and Forgot Password for staff admins, open **Firebase Console -> Authentication -> Sign-in method -> Email/Password -> Enable**.
   - Create an admin account and add its UID to the `admins/{uid}` collection (with `{ uid, email, name, createdAt }`) so `syncAdminCustomClaim` sets `{ admin: true, role: 'admin' }` on the user's Firebase Auth token, or sign in as `orgqfn@gmail.com` with a verified email.
2. **Firebase Storage**:
   - Open **Firebase Console -> Storage -> Get Started** (if not yet initialized) and deploy `storage.rules` so admins can upload logos, hero banners, dish photography, and offer images.

---

## 3. Firestore Collections & Security Model

- `admins/{userId}` — Admin RBAC directory (`syncAdminCustomClaim` Cloud Function syncs `{ admin: true }` custom claims).
- `users/{userId}` — Customer/admin profiles (`role: 'customer' | 'admin'`; users cannot self-assign `admin`).
- `categories/{categoryId}` — Visitors can read only `isActive == true` categories; admin full CRUD.
- `menuItems/{itemId}` — Visitors can read only `availability == true` items; admin full CRUD.
- `offers/{offerId}` — Visitors can read only `isActive == true` offers; admin full CRUD.
- `restaurantSettings/main` — Public storefront settings readable by visitors; other settings documents and writes restricted to admins.
- `test/{docId}` — Admin-only diagnostic read/write check triggered from Operations HQ (never queried on public visitor page loads).
- `orders/{orderId}` — Customer PII protected (only readable by `isAdmin()` or owning `userId`). Created server-side by the `createValidatedOrder` Cloud Function after verifying menu item prices, stock availability, promo discounts, `minimumOrder`, and `deliveryCharges`.
- `orderTracking/{trackingToken}` — Non-PII tracking records keyed by unguessable `FKH-xxxxxx-<HEX>` token (readable only by possessing the secret tracking token, matching `userId`, or `isAdmin()`).

---

## 4. Verification & Testing Checklist

### Security Rules (Firebase Emulator Suite)
Install the rules test helper (once) and run the automated rules test harness (`firestore.rules.test.ts`):
```bash
npm install -D @firebase/rules-unit-testing
firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
```
Lint rules statically:
```bash
npx eslint firestore.rules
```

---

## 5. Deployment

Deploy Firestore Rules, Indexes, Storage Rules, Cloud Functions, and Hosting to `fkh-31097`:

```bash
npm run build
cd functions && npm install && npm run build && cd ..
firebase use fkh-31097
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
```
