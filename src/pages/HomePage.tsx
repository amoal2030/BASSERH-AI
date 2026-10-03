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
  Unlock,
  ChevronRight,
  EyeOff,
  PlusCircle,
  LayoutDashboard,
  Zap,
} from 'lucide-react';

interface HomePageProps {
  onStart: () => void;
  onViewDemo: () => void;
  onNavigateDashboard?: () => void;
  onNavigateQuestion?: (slug: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStart,
  onViewDemo,
  onNavigateDashboard,
  onNavigateQuestion,
}) => {
  const { user, t, lang, openLoginModal } = useAuth();
  const [quickInput, setQuickInput] = React.useState('');
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const handleOpenQuickLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    let s = quickInput.trim();
    if (s.includes('/q/')) {
      s = s.split('/q/')[1]?.split(/[?#]/)[0] || s;
    } else if (s.includes('/u/')) {
      s = s.split('/u/')[1]?.split(/[?#]/)[0] || s;
    } else if (s.includes('?q=')) {
      s = s.split('?q=')[1]?.split(/[&#]/)[0] || s;
    } else if (s.includes('?u=')) {
      s = s.split('?u=')[1]?.split(/[&#]/)[0] || s;
    }
    s = s.replace(/^#\/(q|u)\//, '').replace(/^\//, '').trim();
    if (s && onNavigateQuestion) {
      onNavigateQuestion(s);
    }
  };

  return (
    <div className="w-full overflow-x-hidden">
      {/* Logged-In User Announcement Banner */}
      {user ? (
        <section className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-emerald-950/40 border-b border-indigo-500/20 py-3.5 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Unlock className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                  <span>{lang === 'ar' ? `مرحباً بك ${user.name}` : `Welcome back, ${user.name}!`}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {lang === 'ar' ? 'الميزات مفتوحة بالكامل' : 'All Features Unlocked'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-300">
                  {lang === 'ar'
                    ? 'حسابك موثق مع Google. يمكنك الآن إنشاء استطلاعات ومتابعة لوحة التحكم والتحليل الذكي بواسطة Gemini 3.8 Flash.'
                    : 'Your Google account is verified. You have full access to create polls, dashboard & Gemini 3.8 Flash AI.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onNavigateDashboard && (
                <button
                  onClick={onNavigateDashboard}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('nav_dashboard')}</span>
                </button>
              )}
              <button
                onClick={onStart}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/30"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('nav_create')}</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-slate-900/60 border-b border-slate-800 py-3 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-start">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'سجّل الدخول بحساب Google لفتح لوحة التحكم، استطلاع الآراء، وتحليل الذكاء الاصطناعي Gemini 3.8 Flash.'
                  : 'Sign in with your Google account to unlock dashboard, anonymous polling, and Gemini 3.8 Flash AI.'}
              </span>
            </div>
            <button
              onClick={openLoginModal}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 shrink-0 transition-colors"
            >
              {lang === 'ar' ? 'تسجيل الدخول مع Google ←' : 'Sign in with Google →'}
            </button>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 md:pt-20 md:pb-28">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[550px] h-[250px] sm:h-[350px] bg-indigo-600/15 blur-[100px] sm:blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/3 w-[200px] sm:w-[300px] h-[180px] sm:h-[250px] bg-violet-600/10 blur-[80px] sm:blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-medium mb-5 sm:mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>{t('hero_badge')}</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.2] sm:leading-[1.15]">
            <span>{t('hero_title_1')} </span>
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
              {t('hero_title_2')}
            </span>
          </h1>

          {/* Description */}
          <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed px-2">
            {t('hero_desc')}
          </p>

          {/* Action CTAs */}
          <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 w-full sm:w-auto px-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{user ? t('dash_create_btn') : t('hero_cta')}</span>
              <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onViewDemo}
              className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{t('hero_demo_btn')}</span>
            </button>
          </div>

          {/* Quick Link/Code Jump Bar */}
          <form
            onSubmit={handleOpenQuickLink}
            className="mt-6 max-w-md mx-auto p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-2"
          >
            <input
              type="text"
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              placeholder={lang === 'ar' ? 'لديك رابط أو رمز سؤال؟ الصقه هنا...' : 'Paste question link or code here...'}
              className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'فتح السؤال' : 'Open'}
            </button>
          </form>

          {/* Key Stat Cards (Responsive: 1 col on mobile, 3 on tablet/desktop) */}
          <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 text-start">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base">{t('hero_stat_1')}</h4>
              </div>
              <p className="text-xs text-slate-400">{t('hero_stat_1_sub')}</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <EyeOff className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base">{t('hero_stat_2')}</h4>
              </div>
              <p className="text-xs text-slate-400">{t('hero_stat_2_sub')}</p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm sm:col-span-2 md:col-span-1">
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

      {/* Unlocked / Locked Features Matrix */}
      <section className="py-12 border-y border-slate-900 bg-slate-950/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {lang === 'ar' ? 'نظام الميزات والمصادقة' : 'Features & Authentication'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {user
                ? (lang === 'ar' ? '🎉 جميع ميزاتك مفعلة ومتاحة الآن' : 'All Features Unlocked')
                : (lang === 'ar' ? 'سجّل الدخول بحساب Google لفتح الميزات التالية' : 'Sign in with Google to Unlock Everything')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1: Create Page */}
            <div className={`p-5 rounded-2xl border transition-all ${
              user ? 'bg-slate-900/80 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-900/40 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  user ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {user ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{user ? (lang === 'ar' ? 'مفتوح' : 'Unlocked') : (lang === 'ar' ? 'يتطلب Google' : 'Google Req')}</span>
                </span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">
                {lang === 'ar' ? 'إنشاء صفحة وسؤال جديد' : 'Create Custom Pages'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'اطرح سؤالك، حدد سقف الردود الأقصى، واحصل على رابط فوري لمشاركته مع أصدقائك.'
                  : 'Launch custom questions with comment caps and unique links.'}
              </p>
            </div>

            {/* Feature 2: Comment on Pages */}
            <div className={`p-5 rounded-2xl border transition-all ${
              user ? 'bg-slate-900/80 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-900/40 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  user ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {user ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{user ? (lang === 'ar' ? 'مفتوح' : 'Unlocked') : (lang === 'ar' ? 'يتطلب Google' : 'Google Req')}</span>
                </span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">
                {lang === 'ar' ? 'التعليق على صفحات الآخرين' : 'Comment on Pages'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'المشاركة في إبداء رأيك الصادق في صفحات أصدقائك بسرية وهوية مجهولة 100%.'
                  : 'Submit sincere feedback on friends\' pages with guaranteed 100% anonymity.'}
              </p>
            </div>

            {/* Feature 3: Full Dashboard */}
            <div className={`p-5 rounded-2xl border transition-all ${
              user ? 'bg-slate-900/80 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-900/40 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  user ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {user ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{user ? (lang === 'ar' ? 'مفتوح' : 'Unlocked') : (lang === 'ar' ? 'يتطلب Google' : 'Google Req')}</span>
                </span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">
                {lang === 'ar' ? 'لوحة تحكم كاملة' : 'Full Dashboard'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'إدارة أسئلتك، إيقاف واستئناف استقبال التعليقات، ومتابعة إحصائيات التفاعل.'
                  : 'Manage active polls, pause or resume submissions, and monitor stats.'}
              </p>
            </div>

            {/* Feature 4: Gemini 3.8 Flash AI Analysis */}
            <div className={`p-5 rounded-2xl border transition-all ${
              user ? 'bg-slate-900/80 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-slate-900/40 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  user ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {user ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{user ? (lang === 'ar' ? 'مفتوح' : 'Unlocked') : (lang === 'ar' ? 'يتطلب Google' : 'Google Req')}</span>
                </span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">
                {lang === 'ar' ? 'تحليل Gemini 3.8 Flash' : 'Gemini 3.8 Flash AI'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'استخراج أدق السمات وتكرارها بنسب مئوية حقيقية مع نصائح ملهمة للنمو.'
                  : 'Extract dominant traits and exact frequencies using Gemini 3.8 Flash.'}
              </p>
            </div>
          </div>

          {!user && (
            <div className="mt-8 text-center">
              <button
                onClick={openLoginModal}
                className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition-all hover:scale-102 active:scale-98 inline-flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'ar' ? 'سجّل الدخول بحساب Google لفتح جميع الميزات' : 'Sign in with Google to Unlock All Features'}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Mockup / Product Concept Showcase */}
      <section className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {lang === 'ar' ? 'كيف يعمل التحليل الذكي؟' : 'How does AI analysis work?'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {lang === 'ar' ? 'من التعليقات العفوية... إلى نسب حقيقية' : 'From raw feedback to truthful insights'}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Sample Comments */}
            <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
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
            <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-indigo-500/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">
                      {lang === 'ar' ? 'تحليل Gemini 3.8 Flash الفوري' : 'Live Gemini 3.8 Flash Trait Extraction'}
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
                    ? '💡 يقوم نموذج Gemini 3.8 Flash بحساب النسب بدقة من واقع تكرار الأفكار في التعليقات المكتوبة بدون تخمين.'
                    : '💡 Gemini 3.8 Flash model computes exact frequencies strictly from actual submitted comments.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works steps */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'ar' ? '4 خطوات بسيطة للحصول على الصراحة' : '4 Simple Steps to Authentic Feedback'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
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

          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
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

          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
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

          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-start relative">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center mb-4">
              4
            </span>
            <h4 className="font-bold text-white text-base mb-1.5">
              {lang === 'ar' ? 'تحليل Gemini 3.8 Flash' : 'Gemini 3.8 Flash Report'}
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
      <section className="py-10 sm:py-14 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl p-6 sm:p-10 md:p-12 bg-gradient-to-r from-indigo-900/60 via-slate-900 to-violet-950/60 border border-indigo-500/30 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">
            {lang === 'ar' ? 'جاهز لمعرفة كيف يراك الآخرون؟' : 'Ready to find out how others see you?'}
          </h3>
          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            {lang === 'ar'
              ? 'أنشئ أول سؤال لك الآن واستقبل آراء صادقة في بيئة آمنة ومجهولة بالكامل.'
              : 'Create your first question today and discover sincere, constructive feedback.'}
          </p>
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm sm:text-base shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {user ? t('dash_create_btn') : t('hero_cta')}
          </button>
        </div>
      </section>
    </div>
  );
};
