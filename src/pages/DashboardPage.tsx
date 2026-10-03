import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Page } from '../types/index.ts';
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
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenCreate: () => void;
  onOpenShare: (slug: string, question: string) => void;
  onOpenResults: (slug: string) => void;
  onOpenPublic: (slug: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenCreate,
  onOpenShare,
  onOpenResults,
  onOpenPublic,
}) => {
  const { user, t, lang } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pages');
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
  }, []);

  const handleToggleActive = async (pageId: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}/toggle`, { method: 'PATCH' });
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
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (res.ok) {
        setPages(prev => prev.filter(p => p.id !== pageId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const totalComments = pages.reduce((acc, p) => acc + (p.comments_count || 0), 0);
  const totalVotes = pages.reduce((acc, p) => acc + (p.total_votes || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
        <button
          onClick={onOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-102 active:scale-98 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('dash_create_btn')}</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dash_stat_pages')}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{pages.length}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dash_stat_comments')}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalComments}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dash_stat_votes')}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalVotes}</p>
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
        <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8">
          <FileQuestion className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base font-semibold text-slate-300 max-w-md mx-auto mb-6">
            {t('dash_no_pages')}
          </p>
          <button
            onClick={onOpenCreate}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
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
                className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1">
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
                      <span className="text-xs text-slate-500 font-mono" dir="ltr">
                        /u/{page.slug}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(page.created_at).toLocaleDateString(
                          lang === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mb-3">
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
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <button
                      onClick={() => onOpenShare(page.slug, page.question)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('dash_btn_share')}</span>
                    </button>

                    <button
                      onClick={() => onOpenResults(page.slug)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors flex items-center gap-1.5"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('dash_btn_results')}</span>
                    </button>

                    <button
                      onClick={() => onOpenPublic(page.slug)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                      title={t('dash_btn_open')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">{t('dash_btn_open')}</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(page.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
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
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 transition-colors"
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
    </div>
  );
};
