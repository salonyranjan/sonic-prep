import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK using a Singleton pattern
function initFirebaseAdmin() {
  const apps = getApps();

  // Return the existing app if already initialized
  if (apps.length > 0) {
    const app = apps[0] as App;
    return {
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  // Formatting the private key is crucial for Windows/PowerShell environments
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

// Export pre-initialized instances for use in Server Actions
export const { auth, db } = initFirebaseAdmin();