import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Page, Comment } from '../types/index.ts';
import {
  Sparkles,
  ThumbsUp,
  Shield,
  EyeOff,
  AlertTriangle,
  Send,
  Flag,
  Trash2,
  Eye,
  BarChart3,
  Share2,
  CheckCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicQuestionPageProps {
  slug: string;
  onOpenShare: (slug: string, question: string) => void;
  onOpenReport: (commentId: string) => void;
  onOpenResults: (slug: string) => void;
}

export const PublicQuestionPage: React.FC<PublicQuestionPageProps> = ({
  slug,
  onOpenShare,
  onOpenReport,
  onOpenResults,
}) => {
  const { user, t, lang } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);
  const [votingMap, setVotingMap] = useState<Record<string, boolean>>({});

  const isOwner = user && page && user.id === page.user_id;

  const loadPageAndComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pages/${slug}`);
      if (!res.ok) {
        setErrorMsg('الصفحة غير موجودة أو تم حذفها.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPage(data.page);

      // Load comments
      const cRes = await fetch(`/api/pages/${data.page.id}/comments?sort=${sortBy}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setComments(cData.comments || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageAndComments();
  }, [slug, sortBy]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !page) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/pages/${page.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'فشل إرسال التعليق');
        setSubmitting(false);
        return;
      }

      setCommentText('');
      setSuccessNotice(true);
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Refresh comments and page count
      loadPageAndComments();
      setTimeout(() => setSuccessNotice(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string) => {
    if (votingMap[commentId]) return;
    setVotingMap(prev => ({ ...prev, [commentId]: true }));

    try {
      const res = await fetch(`/api/comments/${commentId}/vote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, votes_count: data.votes_count, has_voted: data.voted }
              : c
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVotingMap(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التعليق؟' : 'Delete this comment?'))
      return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (page) {
          setPage({ ...page, comments_count: Math.max(0, page.comments_count - 1) });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHide = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/hide`, { method: 'PATCH' });
      if (res.ok) {
        setComments(prev =>
          prev.map(c =>
            c.id === commentId ? { ...c, is_hidden: c.is_hidden === 1 ? 0 : 1 } : c
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400">
          {lang === 'ar' ? 'جاري تحميل السؤال...' : 'Loading question...'}
        </p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">
          {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h2>
        <p className="text-xs text-slate-400">{errorMsg || 'تأكد من صحة الرابط.'}</p>
      </div>
    );
  }

  const max = page.max_comments || 50;
  const count = page.comments_count || 0;
  const isCompleted = count >= max;
  const isActive = page.is_active === true || page.is_active === 1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Banner if page completed */}
      {isCompleted && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-center gap-3">
          <Lock className="w-5 h-5 shrink-0" />
          <span>{t('public_page_completed')}</span>
        </div>
      )}

      {/* Banner if page paused */}
      {!isActive && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{t('public_page_paused')}</span>
        </div>
      )}

      {/* Question Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl mb-8">
        {/* Creator Info */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <img
              src={page.owner_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={page.owner_name}
              className="w-11 h-11 rounded-2xl object-cover ring-2 ring-indigo-500/30"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
              }}
            />
            <div>
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                {t('public_asked_by')}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">{page.owner_name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenShare(page.slug, page.question)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title={t('dash_btn_share')}
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
            </button>
            <button
              onClick={() => onOpenResults(page.slug)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تقرير AI' : 'AI Report'}</span>
            </button>
          </div>
        </div>

        {/* Big Question Text */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-relaxed mb-6">
          "{page.question}"
        </h1>

        {/* Usage Progress Tracker */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
            <span className="font-medium">
              {t('public_comments_usage', { used: count, max })}
            </span>
            <span className="font-semibold text-indigo-400">
              {isCompleted ? (lang === 'ar' ? 'اكتمل الحد الأقصى' : 'Max Limit Reached') : t('public_comments_left', { left: Math.max(0, max - count) })}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${Math.min(100, Math.round((count / max) * 100))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Write Anonymous Comment Form */}
      {isActive && !isCompleted && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl mb-10">
          {/* Anonymity Notice */}
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
            <EyeOff className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{t('public_anon_notice')}</span>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'تم إرسال تعليقك بنجاح وبشكل مجهول تماماً! شكراً لصراحتك.'
                  : 'Your comment was submitted anonymously! Thank you.'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div>
              <textarea
                rows={4}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('public_textarea_placeholder')}
                maxLength={500}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 text-sm text-slate-100 placeholder-slate-500 resize-none transition-all outline-none"
              />
              <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-500">
                <span>{t('public_disclaimer_notice')}</span>
                <span>{commentText.length}/500</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>{t('public_sending_btn')}</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('public_send_btn')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* AI Results Promotion Banner */}
      <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-violet-950/70 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {t('public_view_results_banner')}
            </h4>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'استخراج أبرز الصفات، النسب، وتصنيفات الآراء' : 'Trait clustering and percentage insights'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenResults(page.slug)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all shrink-0"
        >
          {t('public_view_results_btn')}
        </button>
      </div>

      {/* Comments List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>{t('public_comments_title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {comments.length}
            </span>
          </h3>

          {/* Sort Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setSortBy('votes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'votes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('public_sort_votes')}
            </button>
            <button
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'newest'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('public_sort_newest')}
            </button>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8">
            <EyeOff className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-slate-400">
              {t('public_no_comments')}
            </p>
          </div>
        ) : (
          comments.map(c => {
            const isHidden = c.is_hidden === 1;

            return (
              <div
                key={c.id}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900/90 border transition-all ${
                  isHidden
                    ? 'border-amber-500/30 opacity-60 bg-amber-950/10'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                      ?
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        {t('public_anonymous_user')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.created_at).toLocaleTimeString(
                          lang === 'ar' ? 'ar-SA' : 'en-US',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2">
                    {/* Owner controls */}
                    {isOwner && (
                      <>
                        <button
                          onClick={() => handleToggleHide(c.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 transition-colors"
                          title={isHidden ? 'إظهار التعليق' : 'إخفاء التعليق'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                          title={t('public_delete_btn')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Report button */}
                    <button
                      onClick={() => onOpenReport(c.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 transition-colors"
                      title={t('public_report_btn')}
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed my-2 whitespace-pre-wrap">
                  {c.content}
                </p>

                {/* Footer: Vote agreement button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 mt-3">
                  <button
                    onClick={() => handleVote(c.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      c.has_voted
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${c.has_voted ? 'fill-current' : ''}`} />
                    <span>{t('public_agree_btn')}</span>
                    <span className="ms-1 font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/20">
                      {c.votes_count}
                    </span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    {c.votes_count > 0
                      ? lang === 'ar'
                        ? `اتفق ${c.votes_count} شخصاً مع هذا الرأي`
                        : `${c.votes_count} people agreed`
                      : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
