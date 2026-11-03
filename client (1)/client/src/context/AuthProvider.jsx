import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, firebaseConfigured } from '../firebase.js';
import { getMyProfile, saveMyProfile } from '../api/profileApi.js';
import { AuthContext } from './auth-context.js';

const NOT_CONFIGURED =
  'Firebase is not configured. Check the VITE_FIREBASE values in client/.env.local.';

function requireAuth() {
  if (!auth) throw new Error(NOT_CONFIGURED);
  return auth;
}

async function signIn(email, password) {
  return signInWithEmailAndPassword(requireAuth(), email.trim(), password);
}

async function register(email, password) {
  return createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
}

async function sendPasswordReset(email) {
  return sendPasswordResetEmail(requireAuth(), email.trim());
}

async function signOut() {
  return firebaseSignOut(requireAuth());
}

function mapApiProfile(profile, user) {
  return {
    firstName: profile.firstName,
    middleName: profile.middleName ?? '',
    lastName: profile.lastName,
    age: Number(profile.age),
    gender: profile.gender,
    address: {
      street: profile.streetAddress,
      barangay: profile.barangay,
      city: profile.cityMunicipality,
      province: profile.province,
      postalCode: profile.postalCode,
    },
    email: user.email,
  };
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [profileState, setProfileState] = useState({
    uid: null,
    data: null,
    failed: false,
  });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!auth) return undefined;

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setProfileState({ uid: null, data: null, failed: false });
        setLoading(false);
      },
      () => {
        setUser(null);
        setProfileState({ uid: null, data: null, failed: false });
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    getMyProfile(user)
      .then((apiProfile) => {
        if (cancelled) return;

        setProfileState({
          uid: user.uid,
          data: apiProfile ? mapApiProfile(apiProfile, user) : null,
          failed: false,
        });
      })
      .catch((error) => {
        console.error('Could not load the customer profile from the API.', error);

        if (cancelled) return;

        setProfileState({ uid: user.uid, data: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadCount]);

  const reloadProfile = useCallback(() => {
    setProfileState({ uid: null, data: null, failed: false });
    setReloadCount((count) => count + 1);
  }, []);

  const saveProfile = useCallback(
    async (values) => {
      if (!user) {
        throw new Error('You need to be signed in to save your details.');
      }

      const apiProfile = {
        firstName: values.firstName,
        middleName: values.middleName || null,
        lastName: values.lastName,
        age: Number(values.age),
        gender: values.gender,
        streetAddress: values.street,
        barangay: values.barangay,
        cityMunicipality: values.city,
        province: values.province,
        postalCode: values.postalCode,
      };

      await saveMyProfile(user, apiProfile);

      try {
        await updateProfile(user, {
          displayName: `${values.firstName} ${values.lastName}`,
        });
      } catch (error) {
        console.error('Could not update the display name.', error);
      }

      setProfileState({
        uid: user.uid,
        data: mapApiProfile(apiProfile, user),
        failed: false,
      });
    },
    [user],
  );

  const profileReady = Boolean(user) && profileState.uid === user.uid;
  const profile = profileReady ? profileState.data : null;
  const profileLoading = Boolean(user) && !profileReady;
  const profileFailed = profileReady && profileState.failed;

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      profile,
      profileLoading,
      profileFailed,
      reloadProfile,
      saveProfile,
      signIn,
      register,
      sendPasswordReset,
      signOut,
    }),
    [
      user,
      loading,
      profile,
      profileLoading,
      profileFailed,
      reloadProfile,
      saveProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}