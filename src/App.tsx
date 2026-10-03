import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PublicQuestionPage } from './pages/PublicQuestionPage.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { CreatePageModal } from './components/CreatePageModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { ReportModal } from './components/ReportModal.tsx';
import { PrivacyModal, TermsModal } from './components/PolicyModals.tsx';
import { UpgradeModal } from './components/UpgradeModal.tsx';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage.tsx';
import { PaymentCancelPage } from './pages/PaymentCancelPage.tsx';
import { Page } from './types/index.ts';

type AppViewType = 'home' | 'dashboard' | 'public' | 'payment_success' | 'payment_cancel';

const parseCurrentRoute = () => {
  if (typeof window === 'undefined') return { view: 'home' as AppViewType, slug: 'omar-traits' };

  // 1. Check Path for Payments
  const path = window.location.pathname;
  if (path === '/payment/success' || path.startsWith('/payment/success')) {
    return { view: 'payment_success' as AppViewType, slug: '' };
  }
  if (path === '/payment/cancel' || path.startsWith('/payment/cancel')) {
    return { view: 'payment_cancel' as AppViewType, slug: '' };
  }

  // 2. Check Query Params (?q=slug or ?u=slug or ?page=slug)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      return { view: 'payment_success' as AppViewType, slug: '' };
    }
    if (urlParams.get('payment') === 'cancel') {
      return { view: 'payment_cancel' as AppViewType, slug: '' };
    }

    const qSlug = urlParams.get('q') || urlParams.get('u') || urlParams.get('page') || urlParams.get('slug');
    if (qSlug && qSlug.trim()) {
      return {
        view: 'public' as AppViewType,
        slug: decodeURIComponent(qSlug.trim()),
      };
    }
  } catch (e) {}

  // 3. Check Hash (#/q/slug or #/u/slug or #q=slug or #u=slug)
  try {
    const hash = window.location.hash;
    if (hash === '#/payment/success') return { view: 'payment_success' as AppViewType, slug: '' };
    if (hash === '#/payment/cancel') return { view: 'payment_cancel' as AppViewType, slug: '' };
    if (hash.startsWith('#/q/') || hash.startsWith('#/u/')) {
      const parts = hash.substring(4).split('/');
      const slug = decodeURIComponent(parts[0] || 'omar-traits');
      return { view: 'public' as AppViewType, slug };
    }
    if (hash.startsWith('#q=') || hash.startsWith('#u=')) {
      const slug = decodeURIComponent(hash.substring(3));
      return { view: 'public' as AppViewType, slug };
    }
    if (hash === '#dashboard') {
      return { view: 'dashboard' as AppViewType, slug: 'omar-traits' };
    }
  } catch (e) {}

  // 4. Check Path (/q/slug or /u/slug or /dashboard)
  if (path.startsWith('/q/') || path.startsWith('/u/')) {
    const parts = path.substring(3).split('/');
    let slug = 'omar-traits';
    try {
      slug = decodeURIComponent(parts[0] || 'omar-traits');
    } catch (e) {
      slug = parts[0] || 'omar-traits';
    }
    return { view: 'public' as AppViewType, slug };
  }
  if (path === '/dashboard') {
    return { view: 'dashboard' as AppViewType, slug: 'omar-traits' };
  }

  return { view: 'home' as AppViewType, slug: 'omar-traits' };
};

function MainApp() {
  const { user, openLoginModal, isLoginModalOpen, closeLoginModal, lang } = useAuth();

  // Navigation state initialized directly from current path
  const initial = parseCurrentRoute();
  const [currentView, setCurrentView] = useState<AppViewType>(initial.view);
  const [activeSlug, setActiveSlug] = useState<string>(initial.slug);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | null>(null);
  const [unlockedToast, setUnlockedToast] = useState<{ show: boolean; name: string }>({ show: false, name: '' });
  const [upgradeData, setUpgradeData] = useState<{ isOpen: boolean; page: Page | null }>({
    isOpen: false,
    page: null,
  });
  const [shareData, setShareData] = useState<{ isOpen: boolean; slug: string; question: string }>({
    isOpen: false,
    slug: '',
    question: '',
  });
  const [reportData, setReportData] = useState<{ isOpen: boolean; commentId: string }>({
    isOpen: false,
    commentId: '',
  });
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Trigger action after Google sign in
  useEffect(() => {
    if (user) {
      if (pendingAction === 'create') {
        setIsCreateOpen(true);
        setPendingAction(null);
      }
      setUnlockedToast({ show: true, name: user.name });
      const timer = setTimeout(() => {
        setUnlockedToast(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Parse path on initial load & popstate & hashchange
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseCurrentRoute();
      setCurrentView(route.view);
      setActiveSlug(route.slug);
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateTo = (view: AppViewType, slug?: string) => {
    setCurrentView(view);
    if (slug) {
      setActiveSlug(slug);
    }

    // Update browser URL smoothly without reloading
    let targetPath = '/';
    if (view === 'dashboard') targetPath = '/dashboard';
    else if (view === 'public' && slug) targetPath = `/q/${slug}`;
    else if (view === 'payment_success') targetPath = '/payment/success';
    else if (view === 'payment_cancel') targetPath = '/payment/cancel';

    window.history.pushState({}, '', targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStart = () => {
    if (user) {
      setIsCreateOpen(true);
    } else {
      setPendingAction('create');
      openLoginModal();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative">
      {/* Google Unlocked Features Toast */}
      {unlockedToast.show && (
        <div className="fixed top-18 sm:top-20 inset-x-4 sm:inset-x-auto sm:end-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="text-base">🎉</span>
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-bold text-white">
                {lang === 'ar' ? `مرحباً ${unlockedToast.name}! تم فتح جميع الميزات` : `Welcome ${unlockedToast.name}! All features unlocked`}
              </p>
              <ul className="mt-1 text-[11px] text-slate-300 space-y-0.5">
                <li>✓ {lang === 'ar' ? 'إنشاء صفحات واستطلاعات جديدة برابط خاص' : 'Create custom question pages'}</li>
                <li>✓ {lang === 'ar' ? 'التعليق بهوية مجهولة 100% والتصويت' : 'Comment anonymously on any page'}</li>
                <li>✓ {lang === 'ar' ? 'لوحة تحكم كاملة وتحليل Gemini 3.8 Flash' : 'Full dashboard & Gemini 3.8 Flash analysis'}</li>
              </ul>
            </div>
            <button
              onClick={() => setUnlockedToast({ show: false, name: '' })}
              className="text-slate-400 hover:text-white p-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={(view, slug) => navigateTo(view as any, slug)}
        openCreateModal={() => {
          if (!user) {
            setPendingAction('create');
            openLoginModal();
          } else {
            setIsCreateOpen(true);
          }
        }}
        openPrivacyModal={() => setIsPrivacyOpen(true)}
        openTermsModal={() => setIsTermsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onStart={handleStart}
            onViewDemo={() => navigateTo('public', 'omar-traits')}
            onNavigateDashboard={() => navigateTo('dashboard')}
            onNavigateQuestion={slug => navigateTo('public', slug)}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenShare={(slug, question) =>
              setShareData({ isOpen: true, slug, question })
            }
            onOpenPublic={slug => navigateTo('public', slug)}
            onOpenUpgrade={page => setUpgradeData({ isOpen: true, page })}
          />
        )}

        {currentView === 'payment_success' && (
          <PaymentSuccessPage
            onNavigateHome={() => navigateTo('home')}
            onNavigateDashboard={() => navigateTo('dashboard')}
            onNavigateQuestion={slug => navigateTo('public', slug)}
          />
        )}

        {currentView === 'payment_cancel' && (
          <PaymentCancelPage
            onNavigateHome={() => navigateTo('home')}
            onNavigateDashboard={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'public' && (
          <PublicQuestionPage
            slug={activeSlug}
            onOpenShare={(slug, question) =>
              setShareData({ isOpen: true, slug, question })
            }
            onOpenReport={commentId =>
              setReportData({ isOpen: true, commentId })
            }
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">
              {lang === 'ar' ? 'بصيرة AI' : 'Baseera AI'}
            </span>
            <span>—</span>
            <span>
              {lang === 'ar'
                ? 'استطلاع الآراء المجهولة والتحليل الذكي للسمات'
                : 'Anonymous Feedback & AI Traits Analysis'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:text-white transition-colors"
            >
              {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </button>
            <span>•</span>
            <button
              onClick={() => setIsTermsOpen(true)}
              className="hover:text-white transition-colors"
            >
              {lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />

      <CreatePageModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={slug => {
          navigateTo('public', slug);
          setShareData({
            isOpen: true,
            slug,
            question: '',
          });
        }}
      />

      <ShareModal
        isOpen={shareData.isOpen}
        onClose={() => setShareData({ ...shareData, isOpen: false })}
        pageSlug={shareData.slug}
        question={shareData.question}
        onNavigateToQuestion={slug => navigateTo('public', slug)}
      />

      <ReportModal
        isOpen={reportData.isOpen}
        onClose={() => setReportData({ ...reportData, isOpen: false })}
        commentId={reportData.commentId}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <UpgradeModal
        isOpen={upgradeData.isOpen}
        onClose={() => setUpgradeData({ isOpen: false, page: null })}
        page={upgradeData.page}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
