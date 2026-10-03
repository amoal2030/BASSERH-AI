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
    // Clear any residual session in Firebase before initiating sign-in
    try {
      await fbSignOut(auth);
    } catch (e) {}

    // Instantiate a fresh provider on every click to force account picker
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      auth_type: 'reauthenticate',
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken(true);
    const googleId = user.providerData?.[0]?.uid || user.uid;

    return {
      success: true,
      user: {
        uid: googleId,
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
