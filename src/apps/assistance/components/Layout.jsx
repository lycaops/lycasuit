'use client';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@assistance/lib/customAuth';
import {
  LayoutDashboard, PlusCircle, ListChecks, Users, Clock, CheckCircle,
  User, LogOut, Menu, X, Home, ChevronLeft, ChevronRight } from
'lucide-react';
import NotificationBar from '@assistance/components/NotificationBar';
import LanguageSwitcher from '@assistance/components/LanguageSwitcher';
import { useLanguage } from '@assistance/lib/LanguageContext';
import logo from '@assistance/Public/logo.svg';

const NAV_ITEMS = {
  standard: [
  { label: 'dashboard', path: '/', icon: LayoutDashboard },
  { label: 'reportIssue', path: '/report-issue', icon: PlusCircle },
  { label: 'myTickets', path: '/my-tickets', icon: ListChecks },
  { label: 'profile', path: '/profile', icon: User }],

  admin: [
  { label: 'dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'allTickets', path: '/all-tickets', icon: ListChecks },
  { label: 'pendingCases', path: '/pending-cases', icon: Clock },
  { label: 'completedCases', path: '/completed-cases', icon: CheckCircle },
  { label: 'staffManagement', path: '/staff-management', icon: Users },
  { label: 'profile', path: '/profile', icon: User }]

};

export default function Layout({ children }) {
  const { currentUser, logout, isAdmin } = useCustomAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = isAdmin ? NAV_ITEMS.admin : NAV_ITEMS.standard;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const showSidebarLabels = !sidebarCollapsed || mobileNavOpen;

  const SidebarContent = () =>
  <div className="flex flex-col h-full">
      <div className={`px-4 py-4 border-b border-white/10 flex items-center gap-3 ${sidebarCollapsed && !mobileNavOpen ? 'justify-center' : 'justify-start'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white">
            <img src={logo} alt="Lyca Ops" className="w-9 h-9 object-contain" />
          </div>
          {showSidebarLabels && <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">LMAC - Lyca Ops</p>
            <p className="text-accent text-xs leading-tight">{t('marketAssistanceCenter')}</p>
          </div>}
        </div>
      </div>

      {showSidebarLabels && <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#245bc1] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{currentUser?.full_name}</p>
            <p className="text-white/50 text-xs truncate">{currentUser?.role} · {currentUser?.territory}</p>
          </div>
        </div>
      </div>}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <a
          href="/home"
          onClick={() => setMobileNavOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <span className="w-6 h-6 rounded-md bg-transparent border border-white flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4 text-[#08dc7d]" />
          </span>
          {showSidebarLabels && 'Back to Home'}
        </a>
        {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            active ?
            'bg-accent text-white rounded-none border-b-4 border-[#08dc7d]' :
            'text-white/70 hover:bg-white/10 hover:text-white'}`
            }>
            
              <span className="w-6 h-6 rounded-md bg-transparent border border-white flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#08dc7d]" />
              </span>
              {showSidebarLabels && t(item.label)}
            </Link>);

      })}
      </nav>

      <div className="px-3 pb-4">
        {showSidebarLabels && <div className="px-3 py-3 mb-2 border-t border-white/10">
          <LanguageSwitcher compact />
        </div>}
        <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all w-full">
        
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {showSidebarLabels && t('logout')}
        </button>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2.5 mt-1 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 bg-foreground flex-col z-30 transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 bg-foreground z-30 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5">
            <img src={logo} alt="Lyca Ops" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-sm">{t('marketAssistanceCenter')}</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="text-white p-1.5 rounded-lg hover:bg-white/10">
          
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen &&
      <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-72 max-w-[80%] bg-foreground flex flex-col">
            <button
            onClick={() => setMobileNavOpen(false)}
            className="absolute top-3 right-3 text-white/60 p-1.5 rounded-lg hover:bg-white/10 z-10">
            
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      }

      {/* Main Content */}
      <main className={`pt-14 lg:pt-0 min-h-screen transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="flex justify-end mb-4">
            <NotificationBar />
          </div>
          {children}
        </div>
      </main>
    </div>);

}