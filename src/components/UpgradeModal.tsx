import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { Page } from '../types/index.ts';
import {
  X,
  Zap,
  Check,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  Crown,
  Lock,
} from 'lucide-react';

interface PaymentPackage {
  id: string;
  nameAr: string;
  nameEn: string;
  maxComments: number;
  amount: string;
  currency: string;
  popular?: boolean;
  badge?: string;
  descriptionAr: string;
  descriptionEn: string;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: Page | null;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  page,
  onSuccess,
}) => {
  const { lang, user } = useAuth();
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pkg_1000');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [paypalConfig, setPaypalConfig] = useState<{ mode: string; isConfigured: boolean }>({
    mode: 'sandbox',
    isConfigured: false,
  });

  useEffect(() => {
    if (!isOpen) return;

    // Fetch server packages & paypal configuration
    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const [pkgRes, cfgRes] = await Promise.all([
          authFetch('/api/paypal/packages'),
          authFetch('/api/paypal/config'),
        ]);

        if (pkgRes.ok) {
          const data = await pkgRes.json();
          setPackages(data.packages || []);
        }

        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setPaypalConfig(cfg);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'فشل تحميل باقات الترقية');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen || !page) return null;

  const currentLimit = page.max_comments || 50;

  const handleCheckout = async () => {
    if (!selectedPkgId) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await authFetch('/api/paypal/create-order', {
        method: 'POST',
        body: JSON.stringify({
          page_id: page.id,
          package_id: selectedPkgId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء طلب الدفع في PayPal.');
      }

      if (data.approvalUrl) {
        // Redirect user to official PayPal Checkout approval
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('لم يتم العثور على رابط تأكيد الدفع.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء الاتصال ببوابة PayPal');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 sm:top-5 end-4 sm:end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2.5">
            <Crown className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'ترقية سعة التعليقات' : 'Upgrade Comments Capacity'}</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-[10px] uppercase font-mono">
              PayPal {paypalConfig.mode === 'live' ? 'Live' : 'Sandbox'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            {lang === 'ar' ? 'اختر باقة الترقية المناسبة لسؤالك' : 'Choose Your Capacity Upgrade Tier'}
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto line-clamp-2">
            "{page.question}"
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <span>{lang === 'ar' ? 'سعتك الحالية:' : 'Current capacity:'}</span>
            <span className="font-bold text-indigo-400">
              {currentLimit.toLocaleString()} {lang === 'ar' ? 'تعليق' : 'comments'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live / Sandbox Notice / Unconfigured Warning Banner */}
        {!paypalConfig.isConfigured ? (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200 text-sm">
                  {lang === 'ar'
                    ? `إعدادات PayPal (${paypalConfig.mode === 'live' ? 'Live الحقيقي' : 'Sandbox التجريبي'}) غير مكتملة في الخادم`
                    : `PayPal (${paypalConfig.mode === 'live' ? 'Live' : 'Sandbox'}) Credentials Missing`}
                </p>
                <p className="mt-1 text-xs text-amber-300/85 leading-relaxed">
                  {lang === 'ar'
                    ? `يرجى وضع PAYPAL_CLIENT_ID و PAYPAL_CLIENT_SECRET في ملف .env لتشغيل بوابة PayPal ${paypalConfig.mode === 'live' ? 'Live الحقيقية' : 'Sandbox التجريبية'}.`
                    : `Please configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in the .env file to enable PayPal ${paypalConfig.mode === 'live' ? 'Live' : 'Sandbox'} Checkout.`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 text-[11px] sm:text-xs text-indigo-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>
                {lang === 'ar'
                  ? `الدفع متصل ببوابة PayPal Checkout الرسمية (${paypalConfig.mode === 'live' ? 'Live - حقيقي' : 'Sandbox - تجريبي'}).`
                  : `Connected to official PayPal Checkout (${paypalConfig.mode === 'live' ? 'Live Production' : 'Sandbox'}).`}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              {paypalConfig.mode === 'live' ? 'Live Ready' : 'Sandbox Ready'}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'جاري تحميل باقات PayPal...' : 'Loading packages...'}
            </p>
          </div>
        ) : (
          /* Packages Selection Grid */
          <div className="space-y-3 mb-6">
            {packages.map(pkg => {
              const isSelected = selectedPkgId === pkg.id;
              const isUpgrade = pkg.maxComments > currentLimit;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Badge */}
                  {pkg.badge && (
                    <span className="absolute -top-2.5 end-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] shadow">
                      {pkg.badge}
                    </span>
                  )}

                  {/* Left: Info */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          {lang === 'ar' ? pkg.nameAr : pkg.nameEn}
                        </h4>
                        {!isUpgrade && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {lang === 'ar' ? 'مساوية أو أقل' : 'Current tier'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'ar' ? pkg.descriptionAr : pkg.descriptionEn}
                      </p>
                    </div>
                  </div>

                  {/* Right: Price */}
                  <div className="self-end sm:self-center text-end shrink-0">
                    <div className="text-lg sm:text-xl font-extrabold text-white">
                      ${pkg.amount}
                      <span className="text-xs font-normal text-slate-400 ms-1">
                        {pkg.currency}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 block font-medium">
                      {lang === 'ar' ? 'دفعة واحدة لمدى الحياة' : 'One-time payment'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Benefits list */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6">
          <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'مميزات الترقية:' : 'Upgrade Benefits:'}</span>
          </h5>
          <ul className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'تفعيل فوري للسعة الإضافية' : 'Instant capacity unlock'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'تحليل ذكاء اصطناعي لجميع التعليقات' : 'AI analysis covers all comments'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'حماية مشددة من الحسابات الوهمية' : 'Anti-abuse & one-comment rules'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'دعم كامل لحسابات PayPal و البطاقات' : 'PayPal & card checkout'}</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        {!paypalConfig.isConfigured ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={true}
              className="w-full py-4 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs sm:text-sm border border-slate-700/80 flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
            >
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {lang === 'ar'
                  ? `يرجى وضع مفاتيح PayPal (${paypalConfig.mode === 'live' ? 'Live' : 'Sandbox'}) في ملف .env للتفعيل`
                  : `Add PayPal (${paypalConfig.mode === 'live' ? 'Live' : 'Sandbox'}) keys to .env to enable checkout`}
              </span>
            </button>
            <p className="text-center text-[11px] text-amber-400/90 font-mono">
              PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET
            </p>
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={submitting || loading || !selectedPkgId}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{lang === 'ar' ? 'جاري الاتصال بـ PayPal...' : 'Connecting to PayPal...'}</span>
              </>
            ) : (
              <>
                {/* Official PayPal Logo */}
                <svg className="h-5 w-auto" viewBox="0 0 101 32" fill="currentColor">
                  <path
                    d="M12.237 2.146h-7.75c-.58 0-1.07.44-1.16 1.02L.037 24.326c-.06.39.24.74.64.74h4.15c.58 0 1.07-.44 1.16-1.02l.85-5.38c.09-.58.58-1.02 1.16-1.02h2.46c5.11 0 9.06-2.08 10.23-8.11.52-2.65.04-4.66-1.39-5.95-1.57-1.42-4.14-1.44-7.06-1.44zm1.05 6.94c-.66 3.48-3.08 3.48-5.64 3.48h-1.43l1.1-6.95h1.43c1.74 0 3.32 0 4.04.83.47.54.63 1.43.5 2.64z"
                    fill="#003087"
                  />
                  <path
                    d="M33.687 9.426h-4.18c-.41 0-.76.29-.82.7l-.18 1.14c-.04.25-.26.43-.51.43-.91-1.33-2.92-1.85-5.12-1.85-4.8 0-8.88 3.63-9.67 8.63-.82 5.16 2.8 9.53 7.85 9.53 4.41 0 6.84-2.83 6.84-2.83l-.18 1.13c-.06.39.24.74.64.74h3.76c.58 0 1.07-.44 1.16-1.02l2.36-14.94c.06-.4-.25-.73-.65-.73h-.08zm-5.74 8.76c-.41 2.58-2.51 4.33-5.02 4.33-2.5 0-4.24-1.77-3.83-4.33.4-2.55 2.53-4.34 5.04-4.34 2.5 0 4.22 1.78 3.81 4.34z"
                    fill="#0079C1"
                  />
                  <path
                    d="M48.607 9.426h-4.16c-.43 0-.8.32-.86.75l-4.47 14.88c-.06.39.24.74.64.74h3.9c.47 0 .87-.34.94-.8l1.07-7.23c.09-.58.58-1.02 1.16-1.02h1.61c4.54 0 8.06-1.85 9.1-7.21.46-2.35.03-4.14-1.25-5.28-1.41-1.26-3.7-1.28-6.3-1.28l-1.38.15zm.93 6.18c-.59 3.09-2.74 3.09-5.02 3.09h-.84l.98-6.18h.84c1.55 0 2.95 0 3.59.74.42.48.56 1.27.45 2.35z"
                    fill="#00457C"
                  />
                </svg>
                <span>
                  {lang === 'ar' ? 'الدفع بواسطة PayPal Checkout' : 'Pay with PayPal Checkout'}
                </span>
              </>
            )}
          </button>
        )}

        <p className="text-center text-[11px] text-slate-500 mt-3">
          {lang === 'ar'
            ? 'بإتمام الدفع يتم تفعيل الحد الأقصى الجديد للصفحة فور تأكيد PayPal.'
            : 'Upon payment completion, the new page limit is activated instantly.'}
        </p>
      </div>
    </div>
  );
};
