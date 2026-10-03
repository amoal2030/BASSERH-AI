import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import config from '../firebase-applet-config.json';

export const app = initializeApp(config);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function signInWithGoogleFirebase() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      success: true,
      user: {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      },
      idToken,
    };
  } catch (error: any) {
    console.error('Firebase Google Sign-In Error:', error);
    return {
      success: false,
      error: error.message || 'فشل تسجيل الدخول بحساب جوجل',
    };
  }
}

export async function signOutFirebase() {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.error(e);
  }
}
