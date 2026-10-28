import { createContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, firebaseConfigured } from '../firebase.js';

export const AuthContext = createContext(null);

function requireAuth() {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Check the VITE_FIREBASE values in client/.env.local.',
    );
  }

  return auth;
}

async function signIn(email, password) {
  return signInWithEmailAndPassword(
    requireAuth(),
    email.trim(),
    password,
  );
}

async function register(displayName, email, password) {
  const credential = await createUserWithEmailAndPassword(
    requireAuth(),
    email.trim(),
    password,
  );

  const name = displayName.trim();

  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }

  return credential;
}

async function sendPasswordReset(email) {
  return sendPasswordResetEmail(requireAuth(), email.trim());
}

async function signOut() {
  return firebaseSignOut(requireAuth());
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      () => {
        setUser(null);
        setLoading(false);
      },
    );
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      signIn,
      register,
      sendPasswordReset,
      signOut,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}