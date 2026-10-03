import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Language } from '../types/index.ts';
import { translations } from '../i18n/translations.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (name?: string, email?: string, avatarIndex?: number) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isLoginModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('baseera_lang') as Language) || 'ar';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync HTML dir and lang attributes
  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('baseera_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Load user on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to check auth state:', err);
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
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }
      setUser(data.user);
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const quickLogin = async (name?: string, email?: string, avatarIndex?: number) => {
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatarIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }
      setUser(data.user);
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        lang,
        setLang,
        t,
        loginWithGoogle,
        quickLogin,
        logout,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
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
