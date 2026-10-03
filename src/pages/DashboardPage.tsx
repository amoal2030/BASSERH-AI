import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch, getPublicShareUrl, copyToClipboard } from '../utils/api.ts';
import { Page } from '../types/index.ts';
import { AiAnalysisModal } from '../components/AiAnalysisModal.tsx';
import {
  PlusCircle,
  Share2,
  BarChart3,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Trash2,
  MessageSquare,
  ThumbsUp,
  FileQuestion,
  Lock,
  Unlock,
  Sparkles,
  Zap,
  Copy,
  Check,
  Database,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenCreate: () => void;
  onOpenShare: (slug: string, question: string) => void;
  onOpenPublic: (slug: string) => void;
  onOpenUpgrade?: (page: Page) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreate,
  onOpenShare,
  onOpenPublic,
  onOpenUpgrade,
}) => {
  const { user, t, lang, openLoginModal } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [analysisModalPage, setAnalysisModalPage] = useState<Page | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    try {
      setBackingUp(true);
      setBackupMsg(null);
      const res = await authFetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBackupMsg(
          lang === 'ar'
            ? `✅ تم إنشاء نسخة احتياطية بنجاح: ${data.backup?.filename}`
            : `✅ Backup created: ${data.backup?.filename}`
        );
        setTimeout(() => setBackupMsg(null), 5000);
      } else {
        setBackupMsg(`❌ ${data.error || 'فشل النسخ'}`);
      }
    } catch (e: any) {
      setBackupMsg(`❌ ${e.message || 'فشل الاتصال'}`);
    } finally {
      setBackingUp(false);
    }
  };

  const handleCopyLink = async (slug: string) => {
    const url = getPublicShareUrl(slug);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2500);
    }
  };

  const fetchPages = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await authFetch('/api/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      } else {
        setErrorMsg('فشل تحميل الصفحات');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [user]);

  const handleToggleActive = async (pageId: string) => {
    try {
      const res = await authFetch(`/api/pages/${pageId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setPages(prev =>
          prev.map(p => (p.id === pageId ? { ...p, is_active: data.is_active } : p))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!window.confirm(t('dash_delete_confirm'))) return;
    try {
      setDeletingId(pageId);
      const res = await authFetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (res.ok) {
        setPages(prev => prev.filter(p => p.id !== pageId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  // If not logged in, prompt user to unlock features with Google
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            {lang === 'ar' ? 'لوحة التحكم مقفلة' : 'Dashboard Locked'}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'سجّل الدخول بحساب Google لفتح لوحة التحكم الخاصة بك، إدارة أسئلتك، واستعراض تحليلات الذكاء الاصطناعي Gemini 3.8 Flash.'
              : 'Sign in with Google to unlock your private dashboard, manage your polls, and view Gemini 3.8 Flash AI insights.'}
          </p>

          <button
            onClick={openLoginModal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm sm:text-base shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>{lang === 'ar' ? 'تسجيل الدخول مع Google' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    );
  }

  const totalComments = pages.reduce((acc, p) => acc + (p.comments_count || 0), 0);
  const totalVotes = pages.reduce((acc, p) => acc + (p.total_votes || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Google User Welcome Status */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={user.profile_image}
            alt={user.name}
            className="w-11 h-11 rounded-xl object-cover ring-2 ring-emerald-500/40 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
            }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm sm:text-base">{user.name}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                <span>{lang === 'ar' ? 'حساب Google موثق' : 'Google Verified'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{lang === 'ar' ? 'Gemini 3.8 Flash مفعّل لتحليل السمات' : 'Gemini 3.8 Flash AI Active'}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {t('dash_title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t('dash_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleCreateBackup}
            disabled={backingUp}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-all hover:scale-102 active:scale-98 shrink-0 cursor-pointer disabled:opacity-50"
            title={lang === 'ar' ? 'إنشاء نسخة احتياطية من قاعدة البيانات وحفظها' : 'Create database backup'}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>{backingUp ? (lang === 'ar' ? 'جاري النسخ...' : 'Backing up...') : (lang === 'ar' ? 'نسخ احتياطي للقاعدة' : 'Backup DB')}</span>
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-102 active:scale-98 shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('dash_create_btn')}</span>
          </button>
        </div>
      </div>

      {backupMsg && (
        <div className="my-3 p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <span>{backupMsg}</span>
          <button
            onClick={() => setBackupMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats row (Responsive: 1 col on mobile, 3 on tablet/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 my-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dash_stat_pages')}</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{pages.length}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dash_stat_comments')}</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{totalComments}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4 sm:col-span-2 md:col-span-1">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dash_stat_votes')}</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{totalVotes}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400">
            {lang === 'ar' ? 'جاري تحميل صفحاتك...' : 'Loading your questions...'}
          </p>
        </div>
      ) : pages.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 sm:p-8">
          <FileQuestion className="w-12 h-12 sm:w-14 sm:h-14 text-slate-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base font-semibold text-slate-300 max-w-md mx-auto mb-6">
            {t('dash_no_pages')}
          </p>
          <button
            onClick={onOpenCreate}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            {t('dash_create_btn')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pages.map(page => {
            const max = page.max_comments || 50;
            const count = page.comments_count || 0;
            const remaining = Math.max(0, max - count);
            const percentage = Math.min(100, Math.round((count / max) * 100));
            const isActive = page.is_active === 1 || page.is_active === true;

            return (
              <div
                key={page.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {isActive ? t('dash_status_active') : t('dash_status_paused')}
                      </span>
                      <span className="text-xs text-indigo-400 font-mono font-medium" dir="ltr">
                        /q/{page.slug}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(page.created_at).toLocaleDateString(
                          lang === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                    </div>

                    <h3
                      onClick={() => onOpenPublic(page.slug)}
                      className="text-base sm:text-lg font-bold text-white mb-3 break-words cursor-pointer hover:text-indigo-400 transition-colors"
                      title={lang === 'ar' ? 'اضغط لفتح صفحة السؤال' : 'Click to view question'}
                    >
                      "{page.question}"
                    </h3>

                    {/* Usage Progress Bar */}
                    <div className="max-w-md">
                      <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                        <span>
                          {t('public_comments_usage', { used: count, max })}
                        </span>
                        <span className="font-semibold text-indigo-400">
                          {count >= max
                            ? (lang === 'ar' ? 'مكتمل' : 'Full')
                            : t('public_comments_left', { left: remaining })}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            count >= max
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      {/* Upgrade Prompt */}
                      {onOpenUpgrade && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {lang === 'ar' ? 'السعة الحالية: ' : 'Limit: '}
                            <strong className="text-slate-200">{max.toLocaleString()} {lang === 'ar' ? 'تعليق' : 'comments'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenUpgrade(page)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer hover:scale-102"
                            title={lang === 'ar' ? 'ترقية سعة التعليقات عبر PayPal' : 'Upgrade capacity via PayPal'}
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>{lang === 'ar' ? 'ترقية السعة (PayPal)' : 'Upgrade Limit'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {onOpenUpgrade && (
                      <button
                        onClick={() => onOpenUpgrade(page)}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102"
                        title={lang === 'ar' ? 'ترقية السعة عبر PayPal' : 'Upgrade via PayPal'}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'ar' ? 'ترقية السعة' : 'Upgrade'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyLink(page.slug)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        copiedSlug === page.slug
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                      title={lang === 'ar' ? 'نسخ رابط السؤال' : 'Copy link'}
                    >
                      {copiedSlug === page.slug ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onOpenShare(page.slug, page.question)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('dash_btn_share')}</span>
                    </button>

                    <button
                      onClick={() => setAnalysisModalPage(page)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600/30 to-violet-600/30 hover:from-indigo-600/40 hover:to-violet-600/40 border border-indigo-500/40 text-xs font-bold text-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102"
                      title={lang === 'ar' ? 'استعراض تحليل الذكاء الاصطناعي التلقائي' : 'View automated AI analysis'}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{lang === 'ar' ? 'تحليل AI (تلقائي)' : 'AI Analysis'}</span>
                    </button>

                    <button
                      onClick={() => onOpenPublic(page.slug)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={t('dash_btn_open')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('dash_btn_open')}</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(page.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                      title={isActive ? t('dash_btn_pause') : t('dash_btn_resume')}
                    >
                      {isActive ? (
                        <PauseCircle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(page.id)}
                      disabled={deletingId === page.id}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                      title={t('dash_btn_delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Automated AI Insights Modal for Page Owner */}
      <AiAnalysisModal
        page={analysisModalPage}
        isOpen={Boolean(analysisModalPage)}
        onClose={() => setAnalysisModalPage(null)}
      />
    </div>
  );
};
