import React from 'react';
import {
  ArrowLeft,
  Award,
  Building2,
  CheckCircle2,
  Cpu,
  Dna,
  History,
  Mail,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import type { UserProfile } from '../types';

interface ProfilePageProps {
  user: UserProfile;
  caseHistoryCount: number;
  onResetSession?: () => void;
  onSignOut?: () => void;
  onBackToConsole: () => void;
  onOpenCaseHistory: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  caseHistoryCount,
  onResetSession,
  onSignOut,
  onBackToConsole,
  onOpenCaseHistory,
}) => {
  const handleReset = onResetSession || onSignOut;
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2);

  return (
    <main className="w-full max-w-[1400px] mx-auto mb-8 min-h-[560px]">

      <section
        aria-labelledby="profile-title"
        className="rounded-3xl border border-deep-teal/20 bg-card-mint p-5 shadow-sm lg:p-8"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-charcoal-navy/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-deep-teal/15 bg-sea-foam text-deep-teal">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-deep-teal">
                Clinician Workspace
              </span>
              <h1 id="profile-title" className="font-serif text-[26px] font-normal tracking-tight text-charcoal-navy lg:text-[30px]">
                Clinician Profile &amp; Credentials
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToConsole}
              className="flex items-center gap-2 rounded-full border border-charcoal-navy/15 bg-paper-white px-4 py-2 font-sans text-[12px] font-semibold text-charcoal-navy/70 transition-colors hover:border-deep-teal/30 hover:text-deep-teal cursor-pointer"
              aria-label="Back to console"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Console</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-full border border-charcoal-navy/20 bg-paper-white px-3.5 py-2 font-sans text-[12px] font-semibold text-charcoal-navy hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
              title="Reset Session and Clear History"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Session / Clear History</span>
            </button>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Clinician ID Card */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-charcoal-navy/10 bg-paper-white p-6 shadow-xs text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-deep-teal text-white font-mono text-xl font-bold shadow-xs">
                  {initials}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-sea-foam px-2.5 py-0.5 font-mono text-[10px] font-semibold text-deep-teal mb-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {user.licenseNumber === 'GUEST-PUBLIC-ACCESS' ? 'Public Showcase Clinician' : 'Verified Clinician'}
                  </div>
                  <h2 className="font-serif text-[22px] font-medium text-charcoal-navy">
                    {user.name}
                  </h2>
                  <p className="font-sans text-[12px] text-charcoal-navy/70">
                    {user.title}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-charcoal-navy/10 text-[12.5px] font-sans">
                <div className="flex items-center gap-2.5 text-charcoal-navy/85">
                  <Building2 className="h-4 w-4 text-deep-teal shrink-0" />
                  <span className="truncate">{user.institution}</span>
                </div>
                <div className="flex items-center gap-2.5 text-charcoal-navy/85">
                  <Stethoscope className="h-4 w-4 text-deep-teal shrink-0" />
                  <span className="truncate">{user.department}</span>
                </div>
                <div className="flex items-center gap-2.5 text-charcoal-navy/85">
                  <Mail className="h-4 w-4 text-deep-teal shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-charcoal-navy/85">
                  <Award className="h-4 w-4 text-deep-teal shrink-0" />
                  <span className="font-mono text-[11px]">NPI / License: {user.licenseNumber}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-charcoal-navy/10">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-charcoal-navy/15 bg-canvas px-4 py-2 font-sans text-[12px] font-semibold text-charcoal-navy/80 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Session &amp; Clear History
                </button>
              </div>
            </div>

            {/* Security clearance badge */}
            <div className="rounded-2xl border border-deep-teal/20 bg-sea-foam/40 p-4">
              <div className="flex items-center gap-2 text-deep-teal font-mono text-[11px] font-bold mb-1">
                <ShieldCheck className="h-4 w-4" />
                PUBLIC SHOWCASE &amp; PRIVACY
              </div>
              <p className="font-sans text-[12px] text-charcoal-navy/70 leading-relaxed">
                Public Showcase mode active. All multimodal inference runs and clinical report exports are rendered client-side and ephemeral. Resetting your session clears cached history and resets demo parameters.
              </p>
            </div>
          </div>

          {/* Right Column: Clinical Metrics & System Permissions */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-2xl border border-charcoal-navy/10 bg-paper-white p-4">
                <div className="flex items-center justify-between text-charcoal-navy/60 mb-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-deep-teal">Cases Reviewed</span>
                  <History className="h-4 w-4 text-deep-teal" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-[28px] font-semibold text-charcoal-navy">{caseHistoryCount}</span>
                  <button
                    type="button"
                    onClick={onOpenCaseHistory}
                    className="font-sans text-[11px] text-deep-teal hover:underline cursor-pointer"
                  >
                    View history &rarr;
                  </button>
                </div>
                <p className="mt-1 font-sans text-[11px] text-charcoal-navy/60">Multimodal patient records analyzed</p>
              </div>

              <div className="rounded-2xl border border-charcoal-navy/10 bg-paper-white p-4">
                <div className="flex items-center justify-between text-charcoal-navy/60 mb-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-deep-teal">Active Cohort</span>
                  <Dna className="h-4 w-4 text-deep-teal" />
                </div>
                <div className="font-serif text-[24px] font-semibold text-charcoal-navy">TCGA-BLCA</div>
                <p className="mt-1 font-sans text-[11px] text-charcoal-navy/60">Urothelial Bladder Carcinoma (412 cases)</p>
              </div>

              <div className="rounded-2xl border border-charcoal-navy/10 bg-paper-white p-4">
                <div className="flex items-center justify-between text-charcoal-navy/60 mb-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-deep-teal">Inference Head</span>
                  <Cpu className="h-4 w-4 text-deep-teal" />
                </div>
                <div className="font-serif text-[24px] font-semibold text-charcoal-navy">Cox-PH v2</div>
                <p className="mt-1 font-sans text-[11px] text-charcoal-navy/60">Cross-attention multimodal fusion</p>
              </div>
            </div>

            {/* Clinical Preferences Card */}
            <div className="rounded-2xl border border-charcoal-navy/10 bg-paper-white p-6 shadow-xs">
              <h3 className="font-serif text-[18px] font-medium text-charcoal-navy mb-3">
                Clinical Workflow Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] font-sans">
                <div className="rounded-xl border border-charcoal-navy/10 bg-card-mint/40 p-3.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-deep-teal block mb-1">
                    Risk Stratification Cutoff
                  </span>
                  <p className="font-semibold text-charcoal-navy">Top 33% Cox Hazard Threshold</p>
                  <p className="mt-0.5 text-[11px] text-[#4a5e5d]">Stratifies high vs. low risk patient trajectories on KM curve.</p>
                </div>

                <div className="rounded-xl border border-charcoal-navy/10 bg-card-mint/40 p-3.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-deep-teal block mb-1">
                    Histopathology Attention
                  </span>
                  <p className="font-semibold text-charcoal-navy">Patch-level Gigapixel Overlay (20x)</p>
                  <p className="mt-0.5 text-[11px] text-[#4a5e5d]">Ranks top cellular regions driving recurrence predictions.</p>
                </div>

                <div className="rounded-xl border border-charcoal-navy/10 bg-card-mint/40 p-3.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-deep-teal block mb-1">
                    Genomic Biological Mapping
                  </span>
                  <p className="font-semibold text-charcoal-navy">KEGG Curated Pathway Network</p>
                  <p className="mt-0.5 text-[11px] text-[#4a5e5d]">320 pre-indexed canonical cancer signaling pathways.</p>
                </div>

                <div className="rounded-xl border border-charcoal-navy/10 bg-card-mint/40 p-3.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-deep-teal block mb-1">
                    LLM Synthesis Engine
                  </span>
                  <p className="font-semibold text-charcoal-navy">DeepSeek-R1 / Clinical LLM</p>
                  <p className="mt-0.5 text-[11px] text-[#4a5e5d]">Generates structured oncology consultation summaries.</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="font-mono text-[11px] text-charcoal-navy/60">
                Last authenticated: {user.lastLogin}
              </span>
              <button
                type="button"
                onClick={onBackToConsole}
                className="rounded-full bg-deep-teal px-5 py-2 font-sans text-[12px] font-semibold text-white hover:bg-forest-floor transition-colors cursor-pointer"
              >
                Launch Diagnostic Console
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
