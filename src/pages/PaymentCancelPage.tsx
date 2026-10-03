import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { XCircle, ArrowRight, ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';

interface PaymentCancelPageProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
}

export const PaymentCancelPage: React.FC<PaymentCancelPageProps> = ({
  onNavigateHome,
  onNavigateDashboard,
}) => {
  const { lang } = useAuth();

  return (
    <div className="max-w-xl mx-auto px-4 py-16 sm:py-20 text-center">
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-7 sm:p-10">
        <div className="w-18 h-18 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-500/10">
          <XCircle className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold mb-3">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'ar' ? 'تم إلغاء عملية الدفع' : 'Payment Cancelled'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          {lang === 'ar' ? 'لم يتم خصم أي مبالغ' : 'No Charges Were Made'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
          {lang === 'ar'
            ? 'لقد قمت بإلغاء العملية على PayPal أو إغلاق النافذة. حسابك وبطاقتك بأمان تماماً ولم يتم إجراء أي خصم. يمكنك المحاولة مجدداً في أي وقت.'
            : 'You cancelled the transaction on PayPal. No charges have been made to your account. You can upgrade anytime.'}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={onNavigateDashboard}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{lang === 'ar' ? 'العودة للوحة التحكم' : 'Return to Dashboard'}</span>
            {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
