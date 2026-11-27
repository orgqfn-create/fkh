import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Connect to the EXISTING DEFAULT Firestore database.
export const db = getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_ADMIN_EMAIL = 'orgqfn@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  if (rethrow) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

export type FirestoreConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'permission-denied'
  | 'offline';

/**
 * Authorized Admin-only Firestore read/write diagnostic on `test/connection`.
 * Not executed on public page load so unauthenticated visitors never trigger
 * unnecessary `test/connection` permission errors.
 */
export async function runAdminFirestoreHealthCheck(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!auth.currentUser) {
    return { ok: false, message: 'Sign in as administrator to run read/write verification.' };
  }
  try {
    const diagRef = doc(db, 'test', 'connection');
    await setDoc(diagRef, {
      checkedBy: auth.currentUser.uid,
      checkedAt: serverTimestamp(),
      projectId: app.options.projectId || 'fkh-31097',
      databaseId: '(default)',
    });
    const snap = await getDocFromServer(diagRef);
    return {
      ok: snap.exists(),
      message: snap.exists()
        ? 'Verified live Firestore write & server read on fkh-31097 (default).'
        : 'Diagnostic document write succeeded, but server read returned empty.',
    };
  } catch (error) {
    const info = handleFirestoreError(error, OperationType.WRITE, 'test/connection');
    return { ok: false, message: info.error };
  }
}
