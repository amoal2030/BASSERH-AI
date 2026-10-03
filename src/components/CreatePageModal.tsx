import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, HelpCircle, Sparkles, Send, Link as LinkIcon, AlertCircle } from 'lucide-react';

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
  const { t, lang } = useAuth();
  const [question, setQuestion] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const suggestions = [
    t('create_sugg_1'),
    t('create_sugg_2'),
    t('create_sugg_3'),
    t('create_sugg_4'),
    t('create_sugg_5'),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة السؤال أولاً.' : 'Please enter a question.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          custom_slug: slug.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'فشل إنشاء الصفحة');
        setLoading(false);
        return;
      }

      setQuestion('');
      setSlug('');
      onClose();
      onSuccess(data.page.slug);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-white">{t('create_title')}</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{t('create_subtitle')}</p>
        </div>

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
              placeholder={t('create_placeholder_question')}
              maxLength={300}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 resize-none transition-all outline-none"
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500">
              <span>{lang === 'ar' ? 'الحد الأقصى للتعليقات: 50 تعليقاً' : 'Max limit: 50 comments'}</span>
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

          {/* Custom Slug (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('create_label_slug')}
            </label>
            <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-indigo-500 px-3.5 py-2.5 transition-colors">
              <span className="text-xs text-slate-500 font-mono select-none" dir="ltr">
                /u/
              </span>
              <input
                type="text"
                dir="ltr"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="my-personal-question"
                className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-300 transition-colors"
            >
              {t('create_cancel_btn')}
            </button>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('create_submit_btn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
