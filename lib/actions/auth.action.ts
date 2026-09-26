"use server";

import { getAdminServices } from "@/firebase/admin";
import { cookies } from "next/headers";
import type { SignInParams, SignUpParams, User } from "@/types";

const SESSION_DURATION = 60 * 60 * 24 * 7;

async function setSessionCookie(idToken: string) {
  const { auth } = getAdminServices();
  const claims = await auth.verifyIdToken(idToken, true);
  if (Date.now() / 1000 - claims.auth_time > 300) {
    throw new Error("Please sign in again.");
  }
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000,
  });
  (await cookies()).set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp({ name, idToken }: SignUpParams) {
  try {
    const { auth, db } = getAdminServices();
    const claims = await auth.verifyIdToken(idToken, true);
    if (Date.now() / 1000 - claims.auth_time > 300)
      throw new Error("Please sign in again.");
    const normalizedName = name.trim();
    if (
      !claims.email ||
      normalizedName.length < 2 ||
      normalizedName.length > 80
    ) {
      return {
        success: false,
        message: "Enter a name between 2 and 80 characters.",
      };
    }
    const ref = db.collection("users").doc(claims.uid);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (!existing.exists)
        transaction.set(ref, { name: normalizedName, email: claims.email });
    });
    await setSessionCookie(idToken);
    return { success: true, message: "Account created successfully." };
  } catch {
    return {
      success: false,
      message:
        "We couldn't finish setting up your account. Please sign in to try again.",
    };
  }
}

export async function signIn({ idToken }: SignInParams) {
  try {
    const { auth, db } = getAdminServices();
    const claims = await auth.verifyIdToken(idToken, true);
    if (Date.now() / 1000 - claims.auth_time > 300)
      throw new Error("Please sign in again.");
    const user = await auth.getUser(claims.uid);
    // Recover accounts whose initial profile setup was interrupted.
    const ref = db.collection("users").doc(claims.uid);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (!existing.exists)
        transaction.set(ref, {
          name: user.displayName || "Candidate",
          email: user.email || "",
        });
    });
    await setSessionCookie(idToken);
    return { success: true, message: "Signed in successfully." };
  } catch {
    return {
      success: false,
      message: "We couldn't sign you in. Please try again.",
    };
  }
}

export async function signOut() {
  (await cookies()).delete("session");
}

export async function getCurrentUser(): Promise<User | null> {
  const sessionCookie = (await cookies()).get("session")?.value;
  if (!sessionCookie) return null;
  try {
    const { auth, db } = getAdminServices();
    const claims = await auth.verifySessionCookie(sessionCookie, true);
    const record = await db.collection("users").doc(claims.uid).get();
    if (!record.exists) return null;
    return { ...record.data(), id: record.id } as User;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return !!(await getCurrentUser());
}
