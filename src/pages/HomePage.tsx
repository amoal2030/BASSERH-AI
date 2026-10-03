import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Shield,
  ThumbsUp,
  BarChart3,
  MessageSquare,
  Users,
  CheckCircle2,
  Lock,
  ChevronRight,
  EyeOff,
} from 'lucide-react';

interface HomePageProps {
  onStart: () => void;
  onViewDemo: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStart, onViewDemo }) => {
  const { t, lang } = useAuth();
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[250px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>{t('hero_badge')}</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            <span>{t('hero_title_1')} </span>
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
              {t('hero_title_2')}
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('hero_desc')}
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <span>{t('hero_cta')}</span>
              <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onViewDemo}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{t('hero_demo_btn')}</span>
            </button>
          </div>

          {/* Key Stat Cards */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 text-start">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base">{t('hero_stat_1')}</h4>
              </div>
              <p className="text-xs text-slate-400">{t('hero_stat_1_sub')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <EyeOff className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base">{t('hero_stat_2')}</h4>
              </div>
              <p className="text-xs text-slate-400">{t('hero_stat_2_sub')}</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base">{t('hero_stat_3')}</h4>
              </div>
              <p className="text-xs text-slate-400">{t('hero_stat_3_sub')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Mockup / Product Concept Showcase */}
      <section className="py-12 border-y border-slate-900 bg-slate-950/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {lang === 'ar' ? 'كيف يعمل التحليل الذكي؟' : 'How does AI analysis work?'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {lang === 'ar' ? 'من التعليقات العفوية... إلى نسب حقيقية' : 'From raw feedback to truthful insights'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Sample Comments */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-300">
                      {lang === 'ar' ? 'التعليقات الواردة (مجهولة)' : 'Incoming Anonymous Comments'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">14 / 50</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">
                        {lang === 'ar' ? 'مجهول' : 'Anonymous'}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-200">
                        "شخص قوي الشخصية وتعرف تتخذ قرارات حاسمة."
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold shrink-0">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>24</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">
                        {lang === 'ar' ? 'مجهول' : 'Anonymous'}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-200">
                        "اجتماعي جداً والكل يحب يتكلم معك، بس خفف من ضغط الشغل شوية."
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold shrink-0">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>19</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">
                        {lang === 'ar' ? 'مجهول' : 'Anonymous'}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-200">
                        "متعاون وطيب القلب، مستعد تساعد أي شخص بدون مقابل."
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold shrink-0">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>16</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{lang === 'ar' ? 'تصويت بنقرة واحدة' : '1-click agree voting'}</span>
                <span className="text-emerald-400 font-medium">
                  {lang === 'ar' ? '✓ هوية المعلق مخفية تماماً' : '✓ Full anonymity protected'}
                </span>
              </div>
            </div>

            {/* Right: AI Output breakdown */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-indigo-500/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">
                      {lang === 'ar' ? 'تحليل Gemini AI الفوري' : 'Live Gemini AI Trait Extraction'}
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
                    {lang === 'ar' ? '14 رأياً محللاً' : '14 comments'}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Trait 1 */}
                  <div>
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-white mb-1.5">
                      <span>{lang === 'ar' ? 'قوي الشخصية والقيادة' : 'Strong Personality & Leadership'}</span>
                      <span className="text-indigo-400 font-mono">57%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 w-[57%]"></div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'ar' ? 'ذكر 8 من أصل 14 تعليقاً عبارات ترتبط بالقيادة وقوة الرأي.' : 'Mentioned in 8 of 14 comments.'}
                    </p>
                  </div>

                  {/* Trait 2 */}
                  <div>
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-white mb-1.5">
                      <span>{lang === 'ar' ? 'الاجتماعية والمحبة' : 'Sociable & Likable'}</span>
                      <span className="text-violet-400 font-mono">43%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 w-[43%]"></div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'ar' ? 'تكرر وصفك بالشخص الودود ومحبوب الجلسات في 6 تعليقات.' : 'Repeated in 6 comments.'}
                    </p>
                  </div>

                  {/* Trait 3 */}
                  <div>
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-white mb-1.5">
                      <span>{lang === 'ar' ? 'التعاون وخدمة الآخرين' : 'Cooperative & Helpful'}</span>
                      <span className="text-emerald-400 font-mono">36%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 w-[36%]"></div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'ar' ? 'أشاد 5 معلقين بمد يد العون والمبادرة.' : 'Praised by 5 commenters.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-2xl bg-indigo-950/50 border border-indigo-500/20 text-[11px] text-indigo-200">
                <p>
                  {lang === 'ar'
                    ? '💡 النسب مبنية حصرياً على تكرار الأفكار في التعليقات الفعلية بدون أي تخمين أو أحكام مصطنعة.'
                    : '💡 Percentages reflect actual frequencies in submitted feedback.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works steps */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'ar' ? '4 خطوات بسيطة للحصول على الصراحة' : '4 Simple Steps to Authentic Feedback'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center mb-4">
              1
            </span>
            <h4 className="font-bold text-white text-base mb-1.5">
              {lang === 'ar' ? 'اطرح سؤالك' : 'Ask Your Question'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'سجل دخولك بحساب Google وأنشئ صفحة بسؤالك المخصص أو اختر من المقترحات.'
                : 'Sign in with Google and craft your custom prompt or select a suggested topic.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center mb-4">
              2
            </span>
            <h4 className="font-bold text-white text-base mb-1.5">
              {lang === 'ar' ? 'شارك الرابط' : 'Share Your Link'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'انسخ رابطك الفريد وشاركه في قصصك (Stories)، واتساب، أو مجموعات أصدقائك.'
                : 'Copy your unique link and post it on your stories, group chats, or status.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center mb-4">
              3
            </span>
            <h4 className="font-bold text-white text-base mb-1.5">
              {lang === 'ar' ? 'آراء وتصويت' : 'Opinions & Voting'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'يكتب الناس آراءهم بهوية مجهولة تماماً، ويصوتون على التعليقات التي يتفقون معها.'
                : 'Visitors submit comments anonymously and vote on answers they agree with.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center mb-4">
              4
            </span>
            <h4 className="font-bold text-white text-base mb-1.5">
              {lang === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'AI Traits Report'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'استكشف ملخصاً ذكياً يستخرج أكثر السمات تكراراً ونسبها الواقعية مع نصائح للتطوير.'
                : 'Uncover traits clustered by AI with exact frequencies and constructive insights.'}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-indigo-900/60 via-slate-900 to-violet-950/60 border border-indigo-500/30 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
            {lang === 'ar' ? 'جاهز لمعرفة كيف يراك الآخرون؟' : 'Ready to find out how others see you?'}
          </h3>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
            {lang === 'ar'
              ? 'أنشئ أول سؤال لك الآن واستقبل آراء صادقة في بيئة آمنة ومجهولة بالكامل.'
              : 'Create your first question today and discover sincere, constructive feedback.'}
          </p>
          <button
            onClick={onStart}
            className="px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm sm:text-base shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            {t('hero_cta')}
          </button>
        </div>
      </section>
    </div>
  );
};
