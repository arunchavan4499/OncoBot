import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, LogIn, Mail, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import type { UserProfile } from '../types';

interface SignInPageProps {
  onSignIn: (user: UserProfile) => void;
  onBack: () => void;
}

const DEMO_CLINICIAN: UserProfile = {
  name: 'Dr. Rahul',
  title: 'Principal Clinical Oncologist & Molecular Pathologist',
  email: 'rahul@oncology.mskcc.org',
  institution: 'Memorial Sloan Kettering Cancer Center',
  department: 'Genitourinary Oncology & Precision Therapeutics',
  licenseNumber: 'MD-NY-849204',
  role: 'MD',
  casesReviewedCount: 24,
  lastLogin: 'Just now',
};

export const SignInPage: React.FC<SignInPageProps> = ({ onSignIn, onBack }) => {
  const [email, setEmail] = useState('rahul@oncology.mskcc.org');
  const [password, setPassword] = useState('••••••••••••');
  const [institution, setInstitution] = useState('Memorial Sloan Kettering Cancer Center');
  const [role, setRole] = useState('MD');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn({
      ...DEMO_CLINICIAN,
      email: email || DEMO_CLINICIAN.email,
      institution: institution || DEMO_CLINICIAN.institution,
      role: role || DEMO_CLINICIAN.role,
    });
  };

  const handleQuickDemoSignIn = () => {
    onSignIn(DEMO_CLINICIAN);
  };

  return (
    <main className="w-full max-w-[1400px] mx-auto mb-8 min-h-[560px]">

      <section
        aria-labelledby="sign-in-title"
        className="rounded-3xl border border-deep-teal/20 bg-card-mint p-5 shadow-sm lg:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-charcoal-navy/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-deep-teal/15 bg-sea-foam text-deep-teal">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-deep-teal">
                Multimodal Oncology Access
              </span>
              <h1 id="sign-in-title" className="font-serif text-[26px] font-normal tracking-tight text-charcoal-navy lg:text-[30px]">
                Clinician &amp; Investigator Sign In
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-charcoal-navy/15 bg-paper-white px-4 py-2 font-sans text-[12px] font-semibold text-charcoal-navy/70 transition-colors hover:border-deep-teal/30 hover:text-deep-teal cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to Console</span>
          </button>
        </div>

        {/* Content Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sign In Form */}
          <div className="lg:col-span-7 bg-paper-white rounded-2xl border border-charcoal-navy/10 p-6 lg:p-7 shadow-xs">
            <div className="mb-5">
              <h2 className="font-serif text-[20px] font-medium text-charcoal-navy">
                Secure Workstation Authentication
              </h2>
              <p className="mt-1 font-sans text-[13px] text-[#4a5e5d]">
                Enter your institutional credentials or clinical NPI to access whole-slide inference and patient prognostic models.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block font-sans text-[12px] font-semibold text-charcoal-navy mb-1.5" htmlFor="email-input">
                  Institutional Email / NPI
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-charcoal-navy/40">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@cancer-center.org"
                    className="w-full rounded-xl border border-charcoal-navy/20 bg-white pl-9 pr-3.5 py-2.5 font-sans text-[13px] text-charcoal-navy placeholder:text-charcoal-navy/40 focus:border-deep-teal focus:outline-none focus:ring-1 focus:ring-deep-teal/30"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-sans text-[12px] font-semibold text-charcoal-navy mb-1.5" htmlFor="password-input">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-charcoal-navy/40">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-charcoal-navy/20 bg-white pl-9 pr-3.5 py-2.5 font-sans text-[13px] text-charcoal-navy placeholder:text-charcoal-navy/40 focus:border-deep-teal focus:outline-none focus:ring-1 focus:ring-deep-teal/30"
                  />
                </div>
              </div>

              {/* Institution and Role selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block font-sans text-[12px] font-semibold text-charcoal-navy mb-1.5" htmlFor="institution-select">
                    Affiliated Cancer Center
                  </label>
                  <select
                    id="institution-select"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full rounded-xl border border-charcoal-navy/20 bg-white px-3 py-2 font-sans text-[12px] text-charcoal-navy focus:border-deep-teal focus:outline-none"
                  >
                    <option value="Memorial Sloan Kettering Cancer Center">MSKCC</option>
                    <option value="Dana-Farber Cancer Institute">Dana-Farber</option>
                    <option value="Johns Hopkins Medicine">Johns Hopkins</option>
                    <option value="TCGA Genomic Consortium">TCGA Consortium</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-[12px] font-semibold text-charcoal-navy mb-1.5" htmlFor="role-select">
                    Clinical Role
                  </label>
                  <select
                    id="role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-charcoal-navy/20 bg-white px-3 py-2 font-sans text-[12px] text-charcoal-navy focus:border-deep-teal focus:outline-none"
                  >
                    <option value="MD">Attending Oncologist (MD)</option>
                    <option value="Pathologist">Surgical Pathologist (MD/DO)</option>
                    <option value="PhD">Genomics Fellow (PhD)</option>
                    <option value="Fellow">Clinical Oncology Fellow</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-sans text-[12px] text-charcoal-navy/80">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-charcoal-navy/30 text-deep-teal focus:ring-deep-teal"
                  />
                  <span>Remember this clinical device</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert("Local Clinical Workstation: Password resets must be requested through your site pathology administrator. Alternatively, please use 'Quick Demo Access'.")}
                  className="font-sans text-[12px] font-medium text-deep-teal hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-deep-teal px-5 py-2.5 font-sans text-[13px] font-semibold text-white shadow-xs hover:bg-forest-floor transition-colors cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In to Workstation
                </button>

                <button
                  type="button"
                  onClick={handleQuickDemoSignIn}
                  className="flex items-center justify-center gap-2 rounded-full border border-deep-teal/30 bg-sea-foam px-4 py-2.5 font-sans text-[12px] font-semibold text-deep-teal hover:bg-deep-teal/15 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick Demo Access
                </button>
              </div>
            </form>
          </div>

          {/* Security & System Clearance Sidecard */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-2xl border border-deep-teal/20 bg-paper-white p-5 lg:p-6 shadow-xs">
              <div className="flex items-center gap-2 text-deep-teal font-mono text-[11px] font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="h-4 w-4" />
                HIPAA &amp; TCGA Verification
              </div>
              <h3 className="font-serif text-[18px] font-normal text-charcoal-navy">
                Clinical Multi-Omic Protocol
              </h3>
              <p className="mt-1.5 font-sans text-[12.5px] leading-relaxed text-[#4a5e5d]">
                Onco_Bot combines patient-level gigapixel histology and RNA-Seq pathway expression profiles with Cox-PH hazard stratification. All patient data is anonymized according to HIPAA Safe Harbor guidelines.
              </p>

              <div className="mt-4 pt-3 border-t border-charcoal-navy/10 space-y-2">
                <div className="flex items-center gap-2 font-sans text-[12px] text-charcoal-navy/85">
                  <CheckCircle2 className="h-3.5 w-3.5 text-deep-teal shrink-0" />
                  <span>256-bit TLS encrypted inference stream</span>
                </div>
                <div className="flex items-center gap-2 font-sans text-[12px] text-charcoal-navy/85">
                  <CheckCircle2 className="h-3.5 w-3.5 text-deep-teal shrink-0" />
                  <span>Interactive attention map export &amp; report PDF</span>
                </div>
                <div className="flex items-center gap-2 font-sans text-[12px] text-charcoal-navy/85">
                  <CheckCircle2 className="h-3.5 w-3.5 text-deep-teal shrink-0" />
                  <span>Local Cox-PH and KEGG pathway attention caching</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Clinician Info Box */}
            <div className="rounded-2xl border border-charcoal-navy/10 bg-sea-foam/50 p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-deep-teal">
                <KeyRound className="h-3.5 w-3.5" />
                PRE-CONFIGURED CLINICIAN CREDENTIALS
              </div>
              <p className="mt-1 font-sans text-[12px] text-charcoal-navy/70">
                You can test without signing up by clicking <strong>Quick Demo Access</strong> above to log in as <em>Dr. Rahul (MSKCC)</em>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
