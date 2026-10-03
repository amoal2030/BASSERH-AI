import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface PaymentSuccessPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateQuestion: (slug: string) => void;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  onNavigateHome,
  onNavigateDashboard,
  onNavigateQuestion,
}) => {
  const { lang, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<{
    captureId: string;
    newMaxComments: number;
    amount: number;
    currency: string;
    package: any;
    pageTitle: string;
    pageId: string;
  } | null>(null);

  useEffect(() => {
    const processCapture = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        // PayPal passes 'token' as the order ID in the return URL
        const rawOrderId = params.get('order_id');
        const tokenParam = params.get('token');
        const orderId = (rawOrderId && rawOrderId !== '{order_id}') ? rawOrderId : tokenParam;
        const pageId = params.get('page_id');

        if (!orderId || !pageId) {
          setErrorMsg(
            lang === 'ar'
              ? 'بيانات التحقق من عملية الدفع غير مكتملة في الرابط.'
              : 'Payment verification data is missing from URL.'
          );
          setLoading(false);
          return;
        }

        const res = await authFetch('/api/paypal/capture-order', {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId, page_id: pageId }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'فشل تأكيد عملية الدفع من PayPal.');
        }

        setReceipt({
          ...data,
          pageId,
        });

        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.5 },
          });
        } catch (e) {}
      } catch (err: any) {
        setErrorMsg(err.message || 'حدث خطأ أثناء تأكيد الدفع.');
      } finally {
        setLoading(false);
      }
    };

    processCapture();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-10 text-center">
        {loading ? (
          <div className="py-12">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {lang === 'ar' ? 'جاري تأكيد الدفع مع PayPal...' : 'Verifying PayPal Payment...'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              {lang === 'ar'
                ? 'يرجى الانتظار لحظات ريثما يتم التحقق وتفعيل السعة الجديدة في قاعدة البيانات.'
                : 'Please wait while we confirm your payment and upgrade the page capacity.'}
            </p>
          </div>
        ) : errorMsg ? (
          <div className="py-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {lang === 'ar' ? 'تعذر تأكيد عملية الدفع' : 'Payment Verification Failed'}
            </h3>
            <p className="text-sm text-red-300 max-w-md mx-auto mb-6 leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={onNavigateDashboard}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs sm:text-sm transition-all"
              >
                {lang === 'ar' ? 'العودة للوحة التحكم' : 'Return to Dashboard'}
              </button>
            </div>
          </div>
        ) : receipt ? (
          <div>
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'ar' ? 'تم الدفع وتفعيل الباقة بنجاح' : 'Payment & Upgrade Completed'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {lang === 'ar' ? 'تهانينا! تمت ترقية صفحتك' : 'Congratulations! Page Upgraded'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
              {lang === 'ar'
                ? `تمت ترقية سعة صفحة السؤال بنجاح إلى ${receipt.newMaxComments.toLocaleString()} تعليق، ويمكن للمشاركين الآن إرسال المزيد من التعليقات الصريحة.`
                : `Your question capacity has been successfully upgraded to ${receipt.newMaxComments.toLocaleString()} comments.`}
            </p>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-5 text-start space-y-3 mb-8">
              <div className="flex justify-between items-center pb-3 border-b border-slate-850 text-xs">
                <span className="text-slate-400">{lang === 'ar' ? 'السؤال المستهدف:' : 'Question:'}</span>
                <span className="font-semibold text-white truncate max-w-xs text-end">
                  "{receipt.pageTitle}"
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-850 text-xs">
                <span className="text-slate-400">{lang === 'ar' ? 'الباقة المفعلة:' : 'Package:'}</span>
                <span className="font-bold text-amber-400">
                  {lang === 'ar' ? receipt.package?.nameAr : receipt.package?.nameEn}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-850 text-xs">
                <span className="text-slate-400">{lang === 'ar' ? 'السعة الجديدة:' : 'New Limit:'}</span>
                <span className="font-bold text-indigo-400">
                  {receipt.newMaxComments.toLocaleString()} {lang === 'ar' ? 'تعليق' : 'comments'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-850 text-xs">
                <span className="text-slate-400">{lang === 'ar' ? 'المبلغ المدفوع:' : 'Amount Paid:'}</span>
                <span className="font-extrabold text-white text-sm">
                  ${receipt.amount} {receipt.currency}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1 text-slate-500 font-mono">
                <span>{lang === 'ar' ? 'رقم التأكيد (Capture ID):' : 'Capture ID:'}</span>
                <span>{receipt.captureId}</span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={onNavigateDashboard}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{lang === 'ar' ? 'الانتقال إلى لوحة التحكم' : 'Go to Dashboard'}</span>
                {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
