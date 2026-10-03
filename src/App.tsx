import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PublicQuestionPage } from './pages/PublicQuestionPage.tsx';
import { ResultsPage } from './pages/ResultsPage.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { CreatePageModal } from './components/CreatePageModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { ReportModal } from './components/ReportModal.tsx';
import { PrivacyModal, TermsModal } from './components/PolicyModals.tsx';

function MainApp() {
  const { user, openLoginModal, isLoginModalOpen, closeLoginModal, lang } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'public' | 'results'>('home');
  const [activeSlug, setActiveSlug] = useState<string>('omar-traits');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  // Parse path on initial load & popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/u/')) {
        const parts = path.substring(3).split('/');
        const slug = parts[0];
        if (parts[1] === 'results') {
          setActiveSlug(slug);
          setCurrentView('results');
        } else {
          setActiveSlug(slug);
          setCurrentView('public');
        }
      } else if (path === '/dashboard') {
        setCurrentView('dashboard');
      } else {
        setCurrentView('home');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const navigateTo = (view: 'home' | 'dashboard' | 'public' | 'results', slug?: string) => {
    setCurrentView(view);
    if (slug) {
      setActiveSlug(slug);
    }

    // Update browser URL smoothly without reloading
    let targetPath = '/';
    if (view === 'dashboard') targetPath = '/dashboard';
    else if (view === 'public' && slug) targetPath = `/u/${slug}`;
    else if (view === 'results' && slug) targetPath = `/u/${slug}/results`;

    window.history.pushState({}, '', targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStart = () => {
    if (user) {
      setIsCreateOpen(true);
    } else {
      openLoginModal();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={(view, slug) => navigateTo(view as any, slug)}
        openCreateModal={() => {
          if (!user) openLoginModal();
          else setIsCreateOpen(true);
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
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenShare={(slug, question) =>
              setShareData({ isOpen: true, slug, question })
            }
            onOpenResults={slug => navigateTo('results', slug)}
            onOpenPublic={slug => navigateTo('public', slug)}
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
            onOpenResults={slug => navigateTo('results', slug)}
          />
        )}

        {currentView === 'results' && (
          <ResultsPage
            slug={activeSlug}
            onBackToQuestion={() => navigateTo('public', activeSlug)}
            onOpenShare={(slug, question) =>
              setShareData({ isOpen: true, slug, question })
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
