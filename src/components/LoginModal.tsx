import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, ShieldCheck, UserCheck, Sparkles, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { t, lang, loginWithGoogle, quickLogin } = useAuth();
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch config
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(console.error);
  }, [isOpen]);

  // Initialize Google Identity Services if client ID is present
  useEffect(() => {
    if (!isOpen || !googleClientId) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                setLoading(true);
                const res = await loginWithGoogle(response.credential);
                setLoading(false);
                if (res.success) {
                  onClose();
                } else {
                  setErrorMsg(res.error || 'فشل تسجيل الدخول');
                }
              }
            },
          });

          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            width: 320,
            text: 'continue_with',
          });
        } catch (e) {
          console.error('Google button init error:', e);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, googleClientId, loginWithGoogle, onClose]);

  if (!isOpen) return null;

  const handleQuickLogin = async (name: string, email: string, index: number) => {
    setLoading(true);
    setErrorMsg('');
    const res = await quickLogin(name, email, index);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'حدث خطأ أثناء تسجيل الدخول');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-white">
            {t('login_modal_title')}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t('login_modal_desc')}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google OAuth Official Button (if configured) */}
        {googleClientId && (
          <div className="mb-6 flex flex-col items-center">
            <div ref={googleBtnContainerRef} className="w-full flex justify-center min-h-[44px]"></div>
            <div className="relative w-full flex items-center justify-center my-4">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-semibold">
                {lang === 'ar' ? 'أو' : 'OR'}
              </span>
            </div>
          </div>
        )}

        {/* Quick Demo & Instant Testing Accounts */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400">
            {t('login_quick_label')}
          </label>

          <button
            onClick={() => handleQuickLogin('عمر عبد العزيز (Omar)', 'omar.user@gmail.com', 0)}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all group text-start active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Omar"
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-indigo-500/30"
              />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                  {t('login_quick_account_1')}
                </p>
                <p className="text-[11px] text-slate-400">omar.user@gmail.com</p>
              </div>
            </div>
            <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </button>

          <button
            onClick={() => handleQuickLogin('سارة الشمري (Sara)', 'sara.user@gmail.com', 1)}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all group text-start active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                alt="Sara"
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-indigo-500/30"
              />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                  {t('login_quick_account_2')}
                </p>
                <p className="text-[11px] text-slate-400">sara.user@gmail.com</p>
              </div>
            </div>
            <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </button>

          <button
            onClick={() => handleQuickLogin('فيصل العتيبي (Faisal)', 'faisal.user@gmail.com', 2)}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all group text-start active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                alt="Faisal"
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-indigo-500/30"
              />
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                  {t('login_quick_account_3')}
                </p>
                <p className="text-[11px] text-slate-400">faisal.user@gmail.com</p>
              </div>
            </div>
            <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'بياناتك الشخصية وبريدك مشفر ولن يتم كشفه للمشاركين في التعليقات مطلقاً.'
              : 'Your email and personal account details are encrypted and will never be shared.'}
          </span>
        </div>
      </div>
    </div>
  );
};
