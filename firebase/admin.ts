import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminServices() {
  let app = getApps()[0];
  if (!app) {
    const {
      FIREBASE_PROJECT_ID: projectId,
      FIREBASE_CLIENT_EMAIL: clientEmail,
      FIREBASE_PRIVATE_KEY: privateKey,
    } = process.env;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin credentials are not configured.");
    }
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}
