import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Language } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';
import { signInWithGoogleFirebase, signOutFirebase } from '../firebase.ts';
import {
  authFetch,
  setStoredToken,
  removeStoredToken,
  getStoredUser,
  setStoredUser,
  getStoredToken,
  setAppBaseUrl,
} from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogleFirebase: () => Promise<{ success: boolean; error?: string }>;
  quickLogin: (name?: string, email?: string, avatarIndex?: number) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isLoginModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lang, setLangState] = useState<Language>(() => {
    try {
      return (localStorage.getItem('baseera_lang') as Language) || 'ar';
    } catch (e) {
      return 'ar';
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync HTML dir and lang attributes
  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('baseera_lang', newLang);
    } catch (e) {}
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Load config & verify user session on mount
  useEffect(() => {
    // Fetch server base config (domain, Google Client ID)
    fetch('/api/config')
      .then(res => res.json())
      .then(cfg => {
        if (cfg.appUrl) setAppBaseUrl(cfg.appUrl);
      })
      .catch(() => {});

    const checkAuth = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            setStoredUser(data.user);
          } else {
            setUser(null);
            removeStoredToken();
          }
        } else {
          setUser(null);
          removeStoredToken();
        }
      } catch (err) {
        console.error('Failed to check auth state:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.ar;
    let str = (dict as any)[key] || (translations.ar as any)[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return str;
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await authFetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
        setUser(data.user);
      }
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const loginWithGoogleFirebase = async () => {
    try {
      const fbResult = await signInWithGoogleFirebase();
      if (!fbResult.success || !fbResult.user) {
        return { success: false, error: fbResult.error || 'فشل تسجيل الدخول بحساب جوجل' };
      }

      const res = await authFetch('/api/auth/firebase-login', {
        method: 'POST',
        body: JSON.stringify({
          uid: fbResult.user.uid,
          name: fbResult.user.displayName,
          email: fbResult.user.email,
          photoURL: fbResult.user.photoURL,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'فشل إنشاء أو تحديث المستخدم' };
      }

      if (data.token) {
        setStoredToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
        setUser(data.user);
      }
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const quickLogin = async (name?: string, email?: string, avatarIndex?: number) => {
    try {
      const res = await authFetch('/api/auth/quick-login', {
        method: 'POST',
        body: JSON.stringify({ name, email, avatarIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
        setUser(data.user);
      }
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    try {
      await signOutFirebase();
    } catch (e) {
      console.error(e);
    } finally {
      removeStoredToken();
      setStoredUser(null);
      setUser(null);
    }
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        lang,
        setLang,
        t,
        loginWithGoogle,
        loginWithGoogleFirebase,
        quickLogin,
        logout,
        openLoginModal,
        closeLoginModal,
        isLoginModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
