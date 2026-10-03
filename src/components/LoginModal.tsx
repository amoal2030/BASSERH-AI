import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, ShieldCheck, Sparkles, AlertCircle, Loader2, CheckCircle2, Lock, Zap } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { t, lang, loginWithGoogleFirebase } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const res = await loginWithGoogleFirebase();
      if (res.success) {
        onClose();
      } else {
        if (res.error?.includes('popup') || res.error?.includes('blocked') || res.error?.includes('closed')) {
          try {
            const urlRes = await fetch('/api/auth/google/url');
            const urlData = await urlRes.json();
            if (urlData.url) {
              window.location.href = urlData.url;
              return;
            }
          } catch (e) {}
        }
        setErrorMsg(res.error || (lang === 'ar' ? 'فشل تسجيل الدخول بحساب Google.' : 'Google sign-in failed.'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ar' ? 'حدث خطأ أثناء الاتصال بجوجل.' : 'Error connecting with Google.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 end-4 sm:end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {lang === 'ar' ? 'تسجيل الدخول مع Google' : 'Sign in with Google'}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            {lang === 'ar'
              ? 'سجل دخولك بحساب Google الموثق لفتح لوحة التحكم وتحليل الذكاء الاصطناعي Gemini 3.8 Flash'
              : 'Sign in with your verified Google account to unlock your dashboard and Gemini 3.8 Flash AI analysis'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Unlocked Features Preview */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الميزات التي ستُفتح بحسابك:' : 'Features unlocked upon sign in:'}</span>
          </p>
          <ul className="text-xs sm:text-sm text-slate-300 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'إنشاء أسئلة واستطلاعات رأي مخصصة برابط خاص' : 'Create custom feedback question pages'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'تحليل السمات الشخصية بالذكاء الاصطناعي (Gemini 3.8 Flash)' : 'AI Personality & Traits Analysis by Gemini 3.8 Flash'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'لوحة تحكم تفاعلية لإدارة الردود ومتابعة التصويت' : 'Interactive dashboard to manage responses & votes'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'حماية كاملة وهوية مجهولة للمشاركين بنسبة 100%' : 'Full privacy with 100% anonymous respondents'}</span>
            </li>
          </ul>
        </div>

        {/* Primary Official Google Sign-In Button */}
        <div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm sm:text-base shadow-xl shadow-white/10 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 cursor-pointer group"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {isGoogleLoading
                ? (lang === 'ar' ? 'جاري الاتصال بحساب Google...' : 'Connecting to Google...')
                : (lang === 'ar' ? 'المتابعة باستخدام Google' : 'Continue with Google')}
            </span>
          </button>
        </div>

        {/* Security & Anti-ban Badge */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-300">
              {lang === 'ar' ? 'مصادقة رسمية وآمنة:' : 'Official & Protected:'}
            </span>{' '}
            {lang === 'ar'
              ? 'تم ربط التطبيق مع خوادم Google الرسمية لحماية الحساب من الحظر وضمان تسجيل دخول سلس وفوري.'
              : 'Directly linked with official Google Cloud authentication to prevent blocking and ensure seamless sign-in.'}
          </div>
        </div>
      </div>
    </div>
  );
};
