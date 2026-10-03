import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch, getPublicShareUrl, copyToClipboard, shareQuestion } from '../utils/api.ts';
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
  Unlock,
  Copy,
  Check,
  Home,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicQuestionPageProps {
  slug: string;
  onOpenShare: (slug: string, question: string) => void;
  onOpenReport: (commentId: string) => void;
}

export const PublicQuestionPage: React.FC<PublicQuestionPageProps> = ({
  slug,
  onOpenShare,
  onOpenReport,
}) => {
  const { user, t, lang, openLoginModal } = useAuth();
  
  // Use preloaded server page if available matching this slug
  const initialPage = typeof window !== 'undefined' && (window as any).__INITIAL_PAGE__?.slug === slug
    ? (window as any).__INITIAL_PAGE__
    : null;

  const [page, setPage] = useState<Page | null>(initialPage);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!initialPage);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);
  const [hasAlreadyCommented, setHasAlreadyCommented] = useState(false);
  const [votingMap, setVotingMap] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyPageLink = async () => {
    if (!page) return;
    const url = getPublicShareUrl(page.slug);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!page) return;
    const url = getPublicShareUrl(page.slug);
    const res = await shareQuestion({
      title: page.question,
      text: `شارك برأيك بصراحة وبشكل مجهول في استطلاع: "${page.question}"`,
      url,
    });
    if (res.method === 'clipboard' && res.shared) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const isOwner = user && page && user.id === page.user_id;

  const loadPageAndComments = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/pages/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        setErrorMsg(lang === 'ar' ? 'الصفحة غير موجودة أو تم حذفها.' : 'Page not found or deleted.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPage(data.page);

      // Load comments
      const cRes = await authFetch(`/api/pages/${data.page.id}/comments?sort=${sortBy}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setComments(cData.comments || []);
        if (typeof cData.has_user_commented === 'boolean') {
          setHasAlreadyCommented(cData.has_user_commented);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageAndComments();
  }, [slug, sortBy, user]);

  // Restore draft comment from sessionStorage if exists
  useEffect(() => {
    if (page?.id) {
      try {
        const saved = sessionStorage.getItem(`baseera_draft_${page.id}`);
        if (saved && !commentText) {
          setCommentText(saved);
        }
      } catch (e) {}
    }
  }, [page?.id]);

  const handleCommentTextChange = (text: string) => {
    setCommentText(text);
    if (page?.id) {
      try {
        if (text) {
          sessionStorage.setItem(`baseera_draft_${page.id}`, text);
        } else {
          sessionStorage.removeItem(`baseera_draft_${page.id}`);
        }
      } catch (e) {}
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg(lang === 'ar' ? 'يجب تسجيل الدخول بحساب Google لإرسال تعليق.' : 'Google sign-in required to comment.');
      openLoginModal();
      return;
    }
    if (!commentText.trim() || !page) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await authFetch(`/api/pages/${page.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg(lang === 'ar' ? 'يجب تسجيل الدخول أولًا.' : 'Please sign in first.');
          openLoginModal();
        } else if (res.status === 409 || (data.error && (data.error.includes('بالفعل') || data.error.includes('مسبقاً')))) {
          setErrorMsg(lang === 'ar' ? 'لقد أرسلت تعليقًا بالفعل على هذه الصفحة.' : 'You have already commented on this page.');
          setHasAlreadyCommented(true);
        } else if (res.status === 403) {
          setErrorMsg(data.error || (lang === 'ar' ? 'غير مصرح لك بإرسال التعليق.' : 'Forbidden'));
        } else if (res.status >= 500) {
          setErrorMsg(lang === 'ar' ? 'تعذر حفظ التعليق، حاول مرة أخرى.' : 'Could not save comment, please try again.');
        } else {
          setErrorMsg(data.error || (lang === 'ar' ? 'تعذر إرسال التعليق.' : 'Could not send comment.'));
        }
        setSubmitting(false);
        return;
      }

      setCommentText('');
      try {
        sessionStorage.removeItem(`baseera_draft_${page.id}`);
      } catch (e) {}
      setSuccessNotice(true);
      setHasAlreadyCommented(true);
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Refresh comments and page count
      loadPageAndComments();
      setTimeout(() => setSuccessNotice(false), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ar' ? 'تعذر حفظ التعليق، حاول مرة أخرى.' : 'Could not save comment, please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string) => {
    if (votingMap[commentId]) return;
    setVotingMap(prev => ({ ...prev, [commentId]: true }));

    try {
      const res = await authFetch(`/api/comments/${commentId}/vote`, { method: 'POST' });
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
      const res = await authFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
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
      const res = await authFetch(`/api/comments/${commentId}/hide`, { method: 'PATCH' });
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
      <div className="max-w-md mx-auto my-16 sm:my-24 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-3">
          404 Not Found
        </span>
        <h2 className="text-xl font-extrabold text-white mb-2">
          {lang === 'ar' ? 'هذه الصفحة غير موجودة أو تم حذفها' : 'This page does not exist or was deleted'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          {lang === 'ar'
            ? 'عذراً، الرابط الذي تحاول الوصول إليه غير صحيح أو قد انتهت صلاحيته أو قام صاحب الاستطلاع بحذفه.'
            : 'Sorry, the link you are trying to access is invalid or has been deleted by its creator.'}
        </p>
        <a
          href="/"
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{lang === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home Page'}</span>
        </a>
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
        {/* Creator Info & Header Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Page Link Button */}
            <button
              onClick={handleCopyPageLink}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={lang === 'ar' ? 'نسخ رابط الصفحة' : 'Copy page link'}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>{lang === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lang === 'ar' ? 'نسخ رابط الصفحة' : 'Copy Link'}</span>
                </>
              )}
            </button>

            {/* Web Share Button */}
            <button
              onClick={handleNativeShare}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={t('dash_btn_share')}
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
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
          {user ? (
            /* Unlocked status badge */
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-semibold">
                  {lang === 'ar' ? `مرحباً ${user.name} - ميزة كتابة التعليق مفتوحة بحسابك` : `Welcome ${user.name} - Commenting is unlocked`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <EyeOff className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'هويتك مجهولة 100% لصاحب السؤال' : '100% Anonymous to page owner'}</span>
              </div>
            </div>
          ) : (
            /* Locked / Google login notice */
            <div className="mb-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className="font-medium">
                  {lang === 'ar'
                    ? 'يجب تسجيل الدخول بحساب Google لإرسال تعليق.'
                    : 'Google sign-in required to comment.'}
                </span>
              </div>
              <button
                type="button"
                onClick={openLoginModal}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{lang === 'ar' ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                {lang === 'ar'
                  ? 'تم إرسال تعليقك بنجاح.'
                  : 'Your comment has been submitted successfully.'}
              </span>
            </div>
          )}

          {hasAlreadyCommented ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                {lang === 'ar' ? 'تم إرسال تعليقك بنجاح.' : 'Your comment has been submitted successfully.'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {lang === 'ar'
                  ? 'يُسمح بتعليق واحد فقط لكل مستخدم على هذه الصفحة.'
                  : 'Only one comment is allowed per user on this page.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={commentText}
                  onChange={e => handleCommentTextChange(e.target.value)}
                  placeholder={t('public_textarea_placeholder')}
                  maxLength={500}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 text-sm text-slate-100 placeholder-slate-500 resize-none transition-all outline-none"
                />
                <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-500">
                  <span>{t('public_disclaimer_notice')}</span>
                  <span>{commentText.length}/500</span>
                </div>
              </div>

              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(lang === 'ar' ? 'يجب تسجيل الدخول بحساب Google لإرسال تعليق.' : 'Google sign-in required to comment.');
                    openLoginModal();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{lang === 'ar' ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
              )}
            </form>
          )}
        </div>
      )}

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
