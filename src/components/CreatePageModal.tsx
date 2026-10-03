import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { X, Sparkles, Send, AlertCircle, ShieldCheck, Hash, Layers } from 'lucide-react';

interface CreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slug: string) => void;
}

export const CreatePageModal: React.FC<CreatePageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, t, lang } = useAuth();
  const [question, setQuestion] = useState('');
  const [slug, setSlug] = useState('');
  const [maxComments, setMaxComments] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const suggestions = [
    lang === 'ar' ? 'ما هي أبرز صفة تميز شخصيتي من تعاملك معي؟' : 'What is my most distinct personality trait?',
    lang === 'ar' ? 'لو كنت كتاباً، فما هو العنوان الذي تراه مناسباً لي؟' : 'If I were a book, what would my title be?',
    lang === 'ar' ? 'نصيحة صادقة من قلبك تفيدني في حياتي أو عملي؟' : 'One sincere piece of advice for my growth?',
    lang === 'ar' ? 'ما هو الانطباع الأول الذي تركته عندك عند لقائنا؟' : 'What was your honest first impression of me?',
    lang === 'ar' ? 'ما الشيء الذي إذا غيرته سأكون أفضل بكثير؟' : 'One thing I should improve or develop?',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة السؤال أولاً.' : 'Please enter a question.');
      return;
    }

    if (question.trim().length < 5) {
      setErrorMsg(lang === 'ar' ? 'السؤال يجب أن يحتوي على 5 أحرف على الأقل.' : 'Question must be at least 5 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify({
          question: question.trim(),
          custom_slug: slug.trim() || undefined,
          max_comments: maxComments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || (lang === 'ar' ? 'فشل إنشاء الصفحة' : 'Failed to create page'));
        setLoading(false);
        return;
      }

      setQuestion('');
      setSlug('');
      onClose();
      onSuccess(data.page.slug);
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ar' ? 'حدث خطأ في الاتصال' : 'Connection error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 end-4 sm:end-5 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {lang === 'ar' ? 'إنشاء صفحة وسؤال جديد' : 'Create New Question Page'}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {lang === 'ar'
              ? 'اطرح سؤالك الصريح وشارك الرابط لجمع آراء مجهولة وتحليلها بالذكاء الاصطناعي'
              : 'Launch your prompt, collect anonymous feedback, and run Gemini AI traits analysis'}
          </p>
        </div>

        {/* User Google Account verification notice */}
        {user && (
          <div className="mb-4 p-3 rounded-2xl bg-slate-800/70 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user.profile_image}
                alt={user.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500/50 shrink-0"
              />
              <span className="text-slate-300 truncate">
                {lang === 'ar' ? `مالك الصفحة: ${user.name}` : `Page Owner: ${user.name}`}
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Google</span>
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('create_label_question')}
            </label>
            <textarea
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: ما هي أبرز صفة إيجابية أو سلبية تراها في شخصيتي؟' : 'e.g., What is my most prominent personality trait?'}
              maxLength={300}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none transition-all outline-none"
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500">
              <span>{lang === 'ar' ? 'سؤال صريح يتيح للآخرين التعبير بحرية' : 'Open question for honest feedback'}</span>
              <span>{question.length}/300</span>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              {t('create_suggestions_label')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestion(s)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-white transition-all text-start"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>

          {/* Comment Cap limit selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'ar' ? 'سقف عدد التعليقات الأقصى:' : 'Maximum Comments Limit:'}</span>
              </span>
              <span className="text-[11px] font-mono text-indigo-400 font-bold">{maxComments} {lang === 'ar' ? 'تعليق' : 'comments'}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 100].map(cap => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setMaxComments(cap)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    maxComments === cap
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {cap} {lang === 'ar' ? 'تعليق' : 'comments'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Slug (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('create_label_slug')}</span>
            </label>
            <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-indigo-500 px-3.5 py-2.5 transition-colors">
              <span className="text-xs text-indigo-400 font-mono font-semibold select-none" dir="ltr">
                /q/
              </span>
              <input
                type="text"
                dir="ltr"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="8f3a91c2"
                className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {lang === 'ar' ? 'اتركه فارغاً للتوليد التلقائي لرمز آمن وفريد' : 'Leave empty to auto-generate a secure unique slug'}
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              {t('create_cancel_btn')}
            </button>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>{lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'نشر الصفحة الآن' : 'Publish Page'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
