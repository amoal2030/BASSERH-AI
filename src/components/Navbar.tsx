import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Sparkles, Globe, LogIn, LogOut, PlusCircle, LayoutDashboard, Shield, FileText, Menu, X, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, slug?: string) => void;
  openCreateModal: () => void;
  openPrivacyModal: () => void;
  openTermsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  openCreateModal,
  openPrivacyModal,
  openTermsModal,
}) => {
  const { user, lang, setLang, t, logout, openLoginModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                {lang === 'ar' ? 'بصيرة AI' : 'Baseera AI'}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight hidden sm:block">
              {t('app_tagline')}
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'home'
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            {t('nav_home')}
          </button>

          {user && (
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'dashboard'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              {t('nav_dashboard')}
            </button>
          )}

          <button
            onClick={openPrivacyModal}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            {t('nav_privacy')}
          </button>
          <button
            onClick={openTermsModal}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            {t('nav_terms')}
          </button>
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title={lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Ask question CTA */}
          {user ? (
            <button
              onClick={openCreateModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/40 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav_create')}</span>
            </button>
          ) : (
            <button
              onClick={openLoginModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/40 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('nav_login')}</span>
            </button>
          )}

          {/* User profile dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-xl border border-slate-800 hover:border-indigo-500/50 bg-slate-900 transition-colors"
              >
                <img
                  src={user.profile_image}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-indigo-500/30"
                  onError={(e) => {
                    // Fallback to placeholder avatar if image fails
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                  }}
                />
              </button>

              {profileDropdownOpen && (
                <div
                  className={`absolute ${
                    lang === 'ar' ? 'left-0' : 'right-0'
                  } mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150`}
                >
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="font-semibold text-sm text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-800 transition-colors text-start"
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>{t('nav_dashboard')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      openCreateModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-800 transition-colors text-start"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <span>{t('nav_create')}</span>
                  </button>
                  <div className="border-t border-slate-800 my-1"></div>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-start"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('nav_logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="sm:hidden p-2 rounded-lg bg-indigo-600 text-white"
              title={t('nav_login')}
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-3 space-y-2">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('home');
            }}
            className="w-full text-start px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900"
          >
            {t('nav_home')}
          </button>
          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('dashboard');
              }}
              className="w-full text-start px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900 flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              <span>{t('nav_dashboard')}</span>
            </button>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              openPrivacyModal();
            }}
            className="w-full text-start px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>{t('nav_privacy')}</span>
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              openTermsModal();
            }}
            className="w-full text-start px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>{t('nav_terms')}</span>
          </button>
        </div>
      )}
    </header>
  );
};
