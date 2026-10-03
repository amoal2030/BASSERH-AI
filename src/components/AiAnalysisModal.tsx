import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { Page, AiAnalysis } from '../types/index.ts';
import {
  Sparkles,
  X,
  RefreshCw,
  TrendingUp,
  Award,
  AlertCircle,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface AiAnalysisModalProps {
  page: Page | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ page, isOpen, onClose }) => {
  const { lang } = useAuth();
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('ready');
  const [isUpdating, setIsUpdating] = useState(false);
  const [commentsAnalyzedCount, setCommentsAnalyzedCount] = useState<number>(0);
  const [analyzedAt, setAnalyzedAt] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const fetchAnalysis = async (isManual = false) => {
    if (!page) return;
    if (isManual) setManualRefreshing(true);
    setErrorMsg('');

    try {
      const res = await authFetch(`/api/pages/${page.id}/analysis`);
      if (res.status === 403) {
        setErrorMsg(
          lang === 'ar'
            ? 'غير مصرح لك بالوصول. تحليل الذكاء الاصطناعي متاح فقط لصاحب السؤال.'
            : 'Forbidden. AI analysis is restricted to the question owner only.'
        );
        setLoading(false);
        setManualRefreshing(false);
        return;
      }
      if (!res.ok) {
        throw new Error(lang === 'ar' ? 'فشل جلب تحليل الذكاء الاصطناعي.' : 'Failed to fetch AI analysis.');
      }

      const data = await res.json();
      setStatus(data.status || 'ready');
      setIsUpdating(data.status === 'updating' || data.needs_update === true);
      setCommentsAnalyzedCount(data.comments_analyzed_count || 0);
      setAnalyzedAt(data.analyzed_at || '');

      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis(null);
      }
    } catch (err: any) {
      console.error('Error fetching analysis:', err);
      setErrorMsg(err.message || (lang === 'ar' ? 'حدث خطأ أثناء تحميل التحليل.' : 'Error loading analysis.'));
    } finally {
      setLoading(false);
      setManualRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && page) {
      setLoading(true);
      fetchAnalysis();

      // Poll periodically if currently updating
      const interval = setInterval(() => {
        if (isOpen && page) {
          fetchAnalysis();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, page?.id]);

  const handleManualTrigger = async () => {
    if (!page) return;
    setManualRefreshing(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/pages/${page.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحديث');
      }
      setAnalysis(data.analysis);
      setCommentsAnalyzedCount(data.comments_analyzed_count || 0);
      setAnalyzedAt(data.analyzed_at || new Date().toISOString());
      setStatus('ready');
      setIsUpdating(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث التحليل');
    } finally {
      setManualRefreshing(false);
    }
  };

  if (!isOpen || !page) return null;

  const currentCount = page.comments_count || 0;
  const maxLimit = page.max_comments || 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold text-indigo-400">
                  {lang === 'ar' ? 'تحليل الذكاء الاصطناعي التلقائي' : 'Automated AI Insights'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">
                  Gemini 3.8 Flash
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  {lang === 'ar' ? 'خاص بصاحب السؤال فقط' : 'Private to Owner'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2">
                "{page.question}"
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status & Capacity Tracker Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-300">
                <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{lang === 'ar' ? 'إجمالي التعليقات:' : 'Total comments:'}</span>
                <strong className="text-white font-mono">{currentCount} / {maxLimit.toLocaleString()}</strong>
              </div>

              {commentsAnalyzedCount > 0 && (
                <span className="text-slate-400">
                  ({lang === 'ar' ? `التحليل بُني على ${commentsAnalyzedCount} تعليقاً` : `Based on ${commentsAnalyzedCount} comments`})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isUpdating ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{lang === 'ar' ? 'جارِ تحديث التحليل تلقائيًا...' : 'Auto-updating analysis...'}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'التحليل محدث' : 'Up to date'}</span>
                </div>
              )}

              {analyzedAt && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(analyzedAt).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'جاري تحميل تحليل الذكاء الاصطناعي...' : 'Loading AI insights...'}
              </p>
            </div>
          ) : currentCount === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 p-6">
              <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                {lang === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {lang === 'ar'
                  ? 'بمجرد أن يشارك المتابعون أو الأصدقاء تعليقاتهم على هذا السؤال، سيقوم الذكاء الاصطناعي بتحليلها واستخراج النسب والسمات تلقائيًا هنا.'
                  : 'As soon as followers or friends share comments, AI will automatically analyze them and compute trait percentages here.'}
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Comprehensive Neutral Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/30 to-slate-900 border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-xs">
                  <Lightbulb className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'الملخص العام المحايد' : 'Objective Overview'}</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {lang === 'ar' ? analysis.summary : analysis.summaryEn || analysis.summary}
                </p>
              </div>

              {/* Dominant Trait Highlight */}
              {analysis.dominantTrait && analysis.dominantTrait.count > 0 && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {lang === 'ar' ? 'أبرز صفة مجمعة في الآراء' : 'Dominant Trait'}
                      </span>
                      <h4 className="text-lg font-black text-white">
                        {lang === 'ar' ? analysis.dominantTrait.trait : analysis.dominantTrait.traitEn}
                      </h4>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {analysis.dominantTrait.percentage}%
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {lang === 'ar'
                        ? `ذكرت في ${analysis.dominantTrait.count} من أصل ${analysis.totalComments} تعليقاً`
                        : `Mentioned in ${analysis.dominantTrait.count} of ${analysis.totalComments} comments`}
                    </span>
                  </div>
                </div>
              )}

              {/* Top Repeated Traits & Percentages */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>{lang === 'ar' ? 'أكثر الصفات والأفكار تكرارًا والنسب المئوية' : 'Most Frequent Traits & Percentages'}</span>
                </h4>

                <div className="space-y-3">
                  {(analysis.topTraits || []).map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold text-white truncate">
                            {lang === 'ar' ? t.trait : t.traitEn}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              t.category === 'strength'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : t.category === 'growth'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {t.category === 'strength'
                              ? (lang === 'ar' ? 'نقطة قوة' : 'Strength')
                              : t.category === 'growth'
                              ? (lang === 'ar' ? 'مجال تطوير' : 'Growth')
                              : (lang === 'ar' ? 'سمة محايدة' : 'Neutral')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400 font-mono">
                            {t.count} {lang === 'ar' ? 'تعليق' : 'comments'}
                          </span>
                          <span className="text-sm font-black text-indigo-400 font-mono min-w-[3rem] text-right">
                            {t.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            t.category === 'strength'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : t.category === 'growth'
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, t.percentage))}%` }}
                        ></div>
                      </div>

                      {t.explanation && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Growth Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Positive Themes */}
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                  <h5 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'أبرز النقاط الإيجابية المشتركة' : 'Common Strengths'}</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {(analysis.positiveThemes || []).map((theme, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{theme}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Constructive Critiques */}
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20">
                  <h5 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'مجالات ونصائح للتطوير' : 'Growth Opportunities'}</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {(analysis.constructiveCritiques || []).map((critique, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{critique}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Strict Privacy & Neutrality Disclaimer */}
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {analysis.disclaimer ||
                    (lang === 'ar'
                      ? 'التحليل مبني على محتوى التعليقات الفعلية فقط مع حجب كامل ومحكم لهوية وكاتبي التعليقات للحفاظ على سرية المشاركين.'
                      : 'Analysis is based strictly on anonymous comment text content; author identities are never disclosed.')}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              {lang === 'ar' ? 'التحليل قيد المعالجة وسيظهر تلقائياً...' : 'Analysis is processing...'}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {lang === 'ar'
                ? 'يتم تحديث التحليل تلقائيًا عند وصول أي تعليق جديد.'
                : 'Analysis updates automatically with each new comment.'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentCount > 0 && (
              <button
                type="button"
                onClick={handleManualTrigger}
                disabled={manualRefreshing || isUpdating}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${manualRefreshing ? 'animate-spin' : ''}`} />
                <span>{manualRefreshing ? (lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...') : (lang === 'ar' ? 'تحديث فوري' : 'Refresh Now')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
