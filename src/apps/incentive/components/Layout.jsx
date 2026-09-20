'use client';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@incentive/lib/AppContext';
import { useAuth } from '@incentive/lib/AuthContext';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Calculator as CalcIcon,
  LogOut,
  User as UserIcon,
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const LOGO_URL = '/logo.png';

export default function Layout({ children }) {
  const { t, lang, setLang } = useApp();
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const showSidebarLabels = !sidebarCollapsed;

  const navItems = [
    { to: '/', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/calculator', label: t('nav_calculator'), icon: CalcIcon },
    { to: '/statement', label: t('nav_statement'), icon: FileText },
    { to: '/scheme', label: t('nav_scheme'), icon: BookOpen },
  ];

  const roleLabel =
    user?.role === 'admin'
      ? 'Admin'
      : user?.role === 'branch_user'
        ? 'Branch'
        : user?.role === 'zone_user'
          ? 'Zone'
          : 'Viewer';

  const scopeLabel = profile?.zone_name
    ? `Zone: ${profile.zone_name}`
    : profile?.branch_name
      ? `Branch: ${profile.branch_name}`
      : '';

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex">
      <aside
        className={`sticky top-0 h-screen shrink-0 hidden md:flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}`}
        style={{ backgroundColor: '#21264e' }}
      >
        <div className={`px-4 py-4 border-b border-white/10 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
          <img
            src="/logo.png"
            alt="Logo"
            crossOrigin="anonymous"
            className={sidebarCollapsed ? 'h-8 w-8 object-contain' : 'h-8'}
          />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button
            onClick={() => { window.location.href = '/home'; }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <Home className="w-4 h-4" />
            {showSidebarLabels && 'Back to Home'}
          </button>
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => { navigate(item.to); closeMobileNav(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${sidebarCollapsed ? 'justify-center' : ''} ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {showSidebarLabels && item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          {showSidebarLabels && <div className="px-4 py-1 text-xs text-white/50">{t('appSubtitle')}</div>}
          {showSidebarLabels && profile?.branch_name && (
            <div className="px-4 py-1 text-[11px] text-white/50 truncate">
              {scopeLabel}
            </div>
          )}
          {showSidebarLabels && (
            <div className="mt-3 border-t border-white/10 px-4 pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Language</div>
              <div className="flex gap-2">
                <button onClick={() => setLang('en')} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${lang === 'en' ? 'bg-white text-[#21264e]' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>EN</button>
                <button onClick={() => setLang('it')} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${lang === 'it' ? 'bg-white text-[#21264e]' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>IT</button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex p-2.5 text-white/40 hover:text-white border-t border-white/10 items-center justify-center"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 shrink-0 md:hidden" />
        <header className="fixed inset-x-0 top-0 z-40 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-[#21264e] md:static md:h-16 md:pt-0 md:bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Lycamobile" crossOrigin="anonymous" className="h-8 w-auto object-contain md:hidden" />
            <h1 className="text-sm font-bold text-white md:text-lg md:text-slate-800">{t('appTitle')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="rounded-lg p-1.5 text-white hover:bg-white/10 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: '#006AE0' }}>
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-medium text-slate-800 leading-tight">
                  {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">{roleLabel}</div>
              </div>
              <button
                onClick={() => logout(true)}
                title="Log out"
                className="ml-1 p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-[80] flex md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={closeMobileNav} />
            <aside className="relative flex w-72 max-w-[82%] flex-col bg-[#21264e] pt-[env(safe-area-inset-top)] text-white shadow-2xl">
              <button onClick={closeMobileNav} aria-label="Close navigation" className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
                <img src="/logo.png" alt="Logo" className="h-9 w-9 object-contain" />
                <div>
                  <p className="text-sm font-bold text-white">Retailer Statement</p>
                  <p className="text-xs text-white/50">LycaMobile Italy</p>
                </div>
              </div>
              <nav className="flex-1 space-y-1 px-3 py-4">
                <button onClick={() => { window.location.href = '/home'; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"><Home className="h-5 w-5" />Back to Home</button>
                {navItems.map((item) => { const Icon = item.icon; return <button key={item.to} onClick={() => { navigate(item.to); closeMobileNav(); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${location.pathname === item.to ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Icon className="h-5 w-5" />{item.label}</button> })}
              </nav>
              <div className="border-t border-white/10 px-4 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Language</p>
                <div className="flex gap-2">
                  <button onClick={() => setLang('en')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${lang === 'en' ? 'bg-white text-[#21264e]' : 'bg-white/10 text-white/70'}`}>EN</button>
                  <button onClick={() => setLang('it')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${lang === 'it' ? 'bg-white text-[#21264e]' : 'bg-white/10 text-white/70'}`}>IT</button>
                </div>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-visible">{children}</main>
      </div>
    </div>
  );
}
