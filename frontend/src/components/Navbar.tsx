import React from 'react';
import { BarChart3, FileText, History, TrendingUp } from 'lucide-react';
import type { SystemStatus, UserProfile } from '../types';
import type { DashboardTab } from './UnifiedDashboard';

interface NavbarProps {
  status: SystemStatus | null;
  activeTab?: DashboardTab;
  onSelectTab?: (tab: DashboardTab) => void;
  caseHistoryCount?: number;
  isCaseHistoryPage?: boolean;
  onOpenCaseHistory?: () => void;
  onNavigateHome?: () => void;
  onOpenResults?: () => void;
  isResultsPage?: boolean;
  user?: UserProfile | null;
  onOpenProfile?: () => void;
  isProfilePage?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  caseHistoryCount = 0,
  isCaseHistoryPage = false,
  onOpenCaseHistory,
  onNavigateHome,
  onOpenResults,
  isResultsPage = false,
  user,
  onOpenProfile,
  isProfilePage = false,
}) => {
  const handleNavClick = (tab: DashboardTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    onOpenResults?.();
    window.requestAnimationFrame(() => {
      document.getElementById('unified-workspace')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const handleResultsClick = () => {
    onSelectTab?.('all');
    onOpenResults?.();
  };

  const primaryPillClass = (isActive: boolean) =>
    `nav-pill-premium h-9 whitespace-nowrap rounded-full border px-3.5 font-sans text-[12px] font-semibold cursor-pointer ${
      isActive
        ? 'nav-pill-active border-deep-teal bg-deep-teal text-white'
        : 'border-transparent bg-transparent text-charcoal-navy/75 hover:border-deep-teal/15 hover:bg-sea-foam/70 hover:text-deep-teal'
    }`;

  const countBadgeClass = (isActive: boolean) =>
    `inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold tracking-tight transition-all ${
      isActive
        ? 'bg-white text-deep-teal shadow-xs'
        : caseHistoryCount > 0
        ? 'border border-deep-teal/20 bg-sea-foam text-deep-teal shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
        : 'border border-charcoal-navy/10 bg-charcoal-navy/[0.05] text-charcoal-navy/55'
    }`;

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
    : 'GI';

  return (
    <nav
      className="nav-premium-shell mx-auto mb-8 grid min-h-[62px] w-full max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full border border-deep-teal/15 px-3 py-2 sm:gap-3 sm:px-4 lg:px-5"

      aria-label="Main Navigation"
    >
      {/* Brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        <a
          href="/"
          onClick={(event) => {
            if (onNavigateHome) {
              event.preventDefault();
              onNavigateHome();
            }
            onSelectTab?.('all');
          }}
          className="shrink-0 font-serif text-[22px] font-semibold tracking-tight text-charcoal-navy transition-colors hover:text-deep-teal"
        >
          <span className="text-deep-teal">Onco_</span>Bot
        </a>
      </div>

      {/* Centered page and result controls */}
      <div className="hidden min-w-0 justify-center lg:flex">
        <div className="flex items-center gap-1 rounded-full border border-charcoal-navy/10 bg-paper-white/75 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <button
            type="button"
            onClick={handleResultsClick}
            className={`${primaryPillClass(isResultsPage && activeTab === 'all')} inline-flex items-center gap-1.5`}
            aria-current={isResultsPage && activeTab === 'all' ? 'page' : undefined}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Analysis Results
          </button>
          <span className="mx-0.5 h-4 w-px shrink-0 bg-charcoal-navy/10" aria-hidden="true" />
          <button
            type="button"
            onClick={onOpenCaseHistory}
            className={`${primaryPillClass(isCaseHistoryPage)} inline-flex items-center gap-1.5`}
            aria-current={isCaseHistoryPage ? 'page' : undefined}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Case History
            <span className={countBadgeClass(isCaseHistoryPage)}>
              {caseHistoryCount}
            </span>
          </button>
          <span className="mx-0.5 h-4 w-px shrink-0 bg-charcoal-navy/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => handleNavClick('survival')}
            className={`${primaryPillClass(isResultsPage && activeTab === 'survival')} inline-flex items-center gap-1.5`}
            aria-current={isResultsPage && activeTab === 'survival' ? 'page' : undefined}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Survival Risk
          </button>
          <span className="mx-0.5 h-4 w-px shrink-0 bg-charcoal-navy/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => handleNavClick('report')}
            className={`${primaryPillClass(isResultsPage && activeTab === 'report')} inline-flex items-center gap-1.5`}
            aria-current={isResultsPage && activeTab === 'report' ? 'page' : undefined}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Clinical Report
          </button>
        </div>
      </div>

      {/* Case utilities & Profile / Sign In Section */}
      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
        {/* Mobile History Toggle */}
        <button
          type="button"
          onClick={onOpenCaseHistory}
          className={`nav-pill-premium flex h-9 items-center gap-1.5 rounded-full border px-2.5 font-sans text-[12px] font-semibold cursor-pointer lg:hidden ${
            isCaseHistoryPage
              ? 'nav-pill-active border-deep-teal bg-deep-teal text-white'
              : 'border-deep-teal/20 bg-paper-white text-deep-teal hover:bg-sea-foam'
          }`}
          aria-current={isCaseHistoryPage ? 'page' : undefined}
          title="Open Case History"
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          <span className={countBadgeClass(isCaseHistoryPage)}>
            {caseHistoryCount}
          </span>
        </button>

        {/* Guest Clinician / Showcase Profile Pill */}
        <button
          type="button"
          onClick={onOpenProfile}
          className={`nav-pill-premium flex h-9 items-center gap-2 rounded-full border px-3 font-sans text-[12px] font-semibold cursor-pointer transition-all ${
            isProfilePage
              ? 'nav-pill-active border-deep-teal bg-deep-teal text-white'
              : 'border-deep-teal/20 bg-paper-white text-charcoal-navy hover:border-deep-teal/40 hover:bg-sea-foam/70 hover:text-deep-teal'
          }`}
          aria-current={isProfilePage ? 'page' : undefined}
          title="Clinician Profile & Session Settings"
        >
          <span className="relative flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono font-bold shrink-0">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                isProfilePage ? 'bg-white text-deep-teal' : 'bg-deep-teal text-white'
              }`}
            >
              {userInitials}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
          </span>
          <span className="truncate max-w-[110px] sm:max-w-[150px]">{user?.name || 'Guest Investigator'}</span>
        </button>
      </div>
    </nav>
  );
};
