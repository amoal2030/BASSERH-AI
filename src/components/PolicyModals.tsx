import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, ShieldCheck, Lock, EyeOff, Scale, AlertOctagon } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { t, lang } = useAuth();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t('privacy_title')}</h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'التزامنا الكامل بحماية الهوية والأمان' : 'Our commitment to anonymity and security'}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-white mb-2">
              <EyeOff className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'ar' ? '1. هوية المعلقين مجهولة 100%' : '1. 100% Anonymous Commenters'}</span>
            </div>
            <p className="text-slate-400">
              {lang === 'ar'
                ? 'لا يتم إظهار اسمك، بريدك الإلكتروني، صورة حسابك، أو أي تفاصيل شخصية لصاحب الصفحة مطلقاً. تظهر جميع التعليقات بوسم "مجهول" فقط.'
                : 'Your name, email, avatar, or account info is never disclosed to the page creator. All responses appear exclusively as "Anonymous".'}
            </p>
          </section>

          <section className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-white mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>{lang === 'ar' ? '2. البيانات التقنية للأمان ومكافحة الإساءة' : '2. Technical Security & Anti-Abuse'}</span>
            </div>
            <p className="text-slate-400">
              {lang === 'ar'
                ? 'يحتفظ النظام من الداخل برمز تحقق مشفر أحادي الاتجاه (One-way cryptographic hash) يُستخدم حصراً لمنع التكرار (Rate limiting)، منع التصويت المزدوج، والتصدي للهجمات المزعجة (Spam). لا يمكن لصاحب الصفحة أو أي طرف ثالث الوصول لهذه المعرفات.'
                : 'The system retains a one-way hashed identifier strictly for abuse prevention, rate limiting, and single-vote enforcement. This is never accessible to the question creator.'}
            </p>
          </section>

          <section className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-white mb-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? '3. معالجة الذكاء الاصطناعي (AI Processing)' : '3. AI Processing & Analysis'}</span>
            </div>
            <p className="text-slate-400">
              {lang === 'ar'
                ? 'تتم معالجة نصوص التعليقات بواسطة نموذج الذكاء الاصطناعي لاستخراج الصفات والنسب التكرارية فقط. النتائج تمثل وجهات نظر المعلقين المشاركين ولا تشكل أي تشخيص طبي أو تقييم نفسي معتمد.'
                : 'Comment text is processed by Gemini AI solely to cluster recurring traits and percentages. Insights represent personal impressions, not medical or clinical evaluations.'}
            </p>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            {t('close_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TermsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { t, lang } = useAuth();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t('terms_title')}</h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'القواعد المجتمعية وسياسة الاستخدام الآمن' : 'Community standards and terms of use'}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1.5">
              {lang === 'ar' ? '1. الحظر الصارم للتنمر والتهديدات' : '1. Zero Tolerance for Bullying & Threats'}
            </h4>
            <p className="text-slate-400">
              {lang === 'ar'
                ? 'يُحظر تماماً كتابة أي رسائل تحض على الكراهية، الشتائم المباشرة، التهديدات الجسدية، أو نشر معلومات شخصية وأرقام هواتف. يتم حظر هذه الرسائل تلقائياً عبر فلاتر الحماية.'
                : 'Harassment, hate speech, direct violent threats, and leaking private phone numbers or personal information are strictly forbidden.'}
            </p>
          </section>

          <section className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1.5">
              {lang === 'ar' ? '2. حد التعليقات وحماية الخادم' : '2. Comments Limit & Fair Use'}
            </h4>
            <p className="text-slate-400">
              {lang === 'ar'
                ? 'تسمح كل صفحة بحد أقصى 50 تعليقاً للحفاظ على عمق التحليل ومنع الإغراق. يحق لصاحب الصفحة إيقاف استقبال التعليقات أو حذف التعليقات المسيئة في أي وقت.'
                : 'Each page allows a maximum of 50 comments. The creator may pause submissions or remove offensive content at any time.'}
            </p>
          </section>

          <section className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1.5">
              {lang === 'ar' ? '3. إخلاء المسؤولية' : '3. Disclaimer of Liability'}
            </h4>
            <p className="text-slate-400">
              {lang === 'ar'
                ? 'المنصة أداة تفاعلية للمصارحة الإيجابية. الآراء والنسب تعبر عن وجهة نظر كتابها فقط ولا تمثل منصة بصيرة AI ولا تشكل حكماً موضوعياً مطلقاً.'
                : 'Baseera AI is a constructive feedback medium. Opinions and traits represent the views of the individual commenters and not scientific assessments.'}
            </p>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            {t('close_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};
