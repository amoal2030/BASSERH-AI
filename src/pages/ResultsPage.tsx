import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Page, Comment, AiAnalysis } from '../types/index.ts';
import {
  Sparkles,
  BarChart3,
  ThumbsUp,
  RefreshCw,
  Copy,
  Check,
  Share2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResultsPageProps {
  slug: string;
  onBackToQuestion: () => void;
  onOpenShare: (slug: string, question: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  slug,
  onBackToQuestion,
  onOpenShare,
}) => {
  const { t, lang } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const ArrowIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const loadData = async () => {
    try {
      setLoading(true);
      const pRes = await fetch(`/api/pages/${slug}`);
      if (!pRes.ok) {
        setErrorMsg('الصفحة غير موجودة.');
        setLoading(false);
        return;
      }
      const pData = await pRes.json();
      setPage(pData.page);

      // Fetch existing analysis
      const aRes = await fetch(`/api/pages/${pData.page.id}/analysis`);
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.hasAnalysis && aData.analysis) {
          setAnalysis(aData.analysis);
        }
      }

      // Fetch comments to show top agreed
      const cRes = await fetch(`/api/pages/${pData.page.id}/comments?sort=votes`);
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
    loadData();
  }, [slug]);

  const handleRunAnalysis = async () => {
    if (!page) return;
    setAnalyzing(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/pages/${page.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'فشل التحليل');
        setAnalyzing(false);
        return;
      }
      setAnalysis(data.analysis);
      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopySummary = () => {
    if (!analysis || !page) return;
    const text = `📊 تقرير تحليل بصيرة AI لسؤال:\n"${page.question}"\n\n📌 ملخص التحليل:\n${
      lang === 'ar' ? analysis.summary : analysis.summaryEn
    }\n\n🏆 أكثر صفة تكراراً: ${
      lang === 'ar' ? analysis.dominantTrait.trait : analysis.dominantTrait.traitEn
    } (${analysis.dominantTrait.percentage}%)\n\nرابط المشاركة:\n${window.location.origin}/u/${page.slug}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400">
          {lang === 'ar' ? 'جاري استرجاع النتائج والتحليلات...' : 'Loading results...'}
        </p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-white mb-2">
          {lang === 'ar' ? 'الصفحة غير متوفرة' : 'Page Not Found'}
        </p>
      </div>
    );
  }

  const topVotedComments = comments.filter(c => c.votes_count > 0).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToQuestion}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowIcon className="w-4 h-4" />
          <span>{lang === 'ar' ? 'العودة لصفحة السؤال والتعليقات' : 'Back to question & comments'}</span>
        </button>

        <button
          onClick={() => onOpenShare(page.slug, page.question)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Share2 className="w-4 h-4 text-indigo-400" />
          <span>{t('results_share_btn')}</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-violet-950/80 border border-indigo-500/30 shadow-2xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('results_analyzed_badge', { count: comments.length })}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {t('results_title')}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              {t('results_subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || comments.length === 0}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-102 active:scale-98 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? t('results_analyzing') : t('results_reanalyze_btn')}</span>
            </button>

            {analysis && (
              <button
                onClick={handleCopySummary}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t('results_copied') : t('results_copy_summary')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Question Title */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <p className="text-xs text-indigo-400 font-semibold mb-1">
            {lang === 'ar' ? 'السؤال محل التحليل:' : 'Analyzed Question:'}
          </p>
          <p className="text-sm sm:text-base font-bold text-white">
            "{page.question}"
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* No analysis yet state */}
      {!analysis ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900 border border-slate-800 p-8">
          <BarChart3 className="w-14 h-14 text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            {lang === 'ar' ? 'لم يتم إجراء التحليل بعد' : 'No Analysis Generated Yet'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            {comments.length === 0
              ? lang === 'ar'
                ? 'لا توجد تعليقات كافية حتى الآن. شارك الرابط لتلقي أولى الآراء ثم اضغط زر التحليل.'
                : 'No comments yet. Share your link to collect opinions, then trigger AI analysis.'
              : lang === 'ar'
              ? `يوجد ${comments.length} تعليقاً جاهزاً للتحليل بواسطة Gemini AI.`
              : `${comments.length} comments are ready to be analyzed by Gemini AI.`}
          </p>

          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || comments.length === 0}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('results_reanalyze_btn')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dominant Trait Highlight */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shrink-0">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                  <Award className="w-7 h-7 text-amber-400" />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  {t('results_dominant_title')}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {lang === 'ar' ? analysis.dominantTrait.trait : analysis.dominantTrait.traitEn}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'ar'
                    ? `تكررت هذه السمة في ${analysis.dominantTrait.count} من أصل ${analysis.totalComments} تعليقاً مستلماً.`
                    : `Mentioned in ${analysis.dominantTrait.count} of ${analysis.totalComments} comments.`}
                </p>
              </div>
            </div>

            <div className="text-start md:text-end shrink-0">
              <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-amber-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent font-mono">
                {analysis.dominantTrait.percentage}%
              </span>
              <span className="block text-[11px] text-slate-500 font-semibold uppercase">
                {lang === 'ar' ? 'نسبة التكرار' : 'Mention Frequency'}
              </span>
            </div>
          </div>

          {/* AI Executive Summary Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{t('results_summary_title')}</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              {lang === 'ar' ? analysis.summary : analysis.summaryEn}
            </p>
          </div>

          {/* Recurring Traits Percentage Bars */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800">
            <h3 className="text-base sm:text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>{t('results_traits_title')}</span>
            </h3>

            <div className="space-y-6">
              {analysis.topTraits.map((tItem, idx) => {
                const traitTitle = lang === 'ar' ? tItem.trait : tItem.traitEn;
                const isGrowth = tItem.category === 'growth';

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-xs">#{idx + 1}</span>
                        <span>{traitTitle}</span>
                        {isGrowth && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {lang === 'ar' ? 'نصيحة تطويرية' : 'Growth Tip'}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-indigo-400 text-sm sm:text-base">
                        {tItem.percentage}%
                      </span>
                    </div>

                    {/* Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isGrowth
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500'
                        }`}
                        style={{ width: `${tItem.percentage}%` }}
                      ></div>
                    </div>

                    <p className="text-xs text-slate-400 leading-normal">
                      {tItem.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Growth Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>{t('results_strengths_title')}</span>
              </h3>
              <ul className="space-y-2.5">
                {(analysis.positiveThemes || []).map((pt, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs sm:text-sm text-slate-200 flex items-start gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth / Suggestions */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2 text-amber-400">
                <Lightbulb className="w-4 h-4" />
                <span>{t('results_growth_title')}</span>
              </h3>
              <ul className="space-y-2.5">
                {(analysis.constructiveCritiques || []).map((cc, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs sm:text-sm text-slate-200 flex items-start gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                    <span>{cc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Top Agreed Comments */}
          {topVotedComments.length > 0 && (
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-indigo-400" />
                <span>{t('results_top_voted_title')}</span>
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {topVotedComments.map(c => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4"
                  >
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      "{c.content}"
                    </p>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{c.votes_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Truthful Scientific Disclaimer Card */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800/80 flex items-start gap-3.5 text-xs text-slate-400 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-300 mb-1">
                {lang === 'ar' ? 'إشعار الشفافية والموضوعية:' : 'Objective Transparency Notice:'}
              </p>
              <p>{analysis.disclaimer || t('results_disclaimer')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
