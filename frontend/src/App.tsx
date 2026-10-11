import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PatientUploadCard } from './components/PatientUploadCard';
import type { AnalysisSource, PatientUploadData } from './components/PatientUploadCard';
import { StatBannerStrip } from './components/StatBannerStrip';
import type { DashboardTab } from './components/UnifiedDashboard';
import { CaseHistoryPanel } from './components/CaseHistoryPanel';
import { AnalysisResultsPage } from './components/AnalysisResultsPage';
import { ProfilePage } from './components/ProfilePage';
import { Footer } from './components/Footer';
import type {
  SystemStatus,
  PatientSummary,
  PatientProfile,
  InferenceResult,
  HeatmapData,
  KmCurveData,
  PathwayItem,
  ClinicalReport,
  CaseHistoryEntry,
  UserProfile,
} from './types';

type AppPage = 'home' | 'case-history' | 'results' | 'profile';

export const ANONYMOUS_GUEST_USER: UserProfile = {
  name: 'Guest Investigator',
  title: 'Public Showcase Clinician & Researcher',
  email: 'guest@oncobot.app',
  institution: 'OncoBot Demonstration Workstation',
  department: 'Precision Oncology & Multimodal Therapeutics',
  licenseNumber: 'GUEST-PUBLIC-ACCESS',
  role: 'MD',
  casesReviewedCount: 0,
  lastLogin: 'Active Guest Session',
};

const getPageFromPath = (): AppPage => {
  if (window.location.pathname === '/case-history') return 'case-history';
  if (window.location.pathname === '/results') return 'results';
  if (window.location.pathname === '/profile') return 'profile';
  // Redirect legacy /sign-in immediately to home
  if (window.location.pathname === '/sign-in') {
    window.history.replaceState({}, '', '/');
    return 'home';
  }
  return 'home';
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>(getPageFromPath);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([
    { patient_id: 'TCGA-2F-A9KO', label: 'TCGA-2F-A9KO (Primary Test Subject)' },
    { patient_id: 'TCGA-2F-A9KP', label: 'TCGA-2F-A9KP (Validation Case - Low Risk)' },
    { patient_id: 'TCGA-2F-A9KQ', label: 'TCGA-2F-A9KQ (Validation Case - Aggressive Recurrence)' },
  ]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('TCGA-2F-A9KO');
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [kmData, setKmData] = useState<KmCurveData | null>(null);
  const [pathways, setPathways] = useState<PathwayItem[]>([]);
  const [report, setReport] = useState<ClinicalReport | null>(null);

  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [isUploadingPatient, setIsUploadingPatient] = useState<boolean>(false);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>('demo');
  const [hasCompletedAnalysis, setHasCompletedAnalysis] = useState<boolean>(false);
  const [caseHistory, setCaseHistory] = useState<CaseHistoryEntry[]>(() => {
    try {
      const savedHistory = window.localStorage.getItem('oncobot-case-history');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem('oncobot-case-history', JSON.stringify(caseHistory));
  }, [caseHistory]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = window.localStorage.getItem('oncobot-user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) {
          return parsed;
        }
      }
      return ANONYMOUS_GUEST_USER;
    } catch {
      return ANONYMOUS_GUEST_USER;
    }
  });

  useEffect(() => {
    window.localStorage.setItem('oncobot-user', JSON.stringify(currentUser));
  }, [currentUser]);

  const navigateTo = useCallback((page: AppPage) => {
    const path =
      page === 'case-history'
        ? '/case-history'
        : page === 'results'
        ? '/results'
        : page === 'profile'
        ? '/profile'
        : '/';
    window.history.pushState({}, '', path);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 1. Initial System Check & Patient List Fetch
  useEffect(() => {
    const initSystem = async () => {
      try {
        const resStatus = await fetch('/api/status');
        if (resStatus.ok) {
          const s = await resStatus.json();
          setStatus(s);
        }

        const resPatients = await fetch('/api/patients');
        if (resPatients.ok) {
          const p = await resPatients.json();
          if (p.patients && p.patients.length > 0) {
            setPatients(p.patients);
          }
        }
      } catch (err) {
        console.warn('[Onco_Bot] Backend server offline or proxying, using fallback defaults.');
      }
    };

    initSystem();
  }, []);

  // 2. Multimodal Analysis Orchestration
  const executeAnalysis = useCallback(async (patientId: string, source: AnalysisSource = 'demo') => {
    let analysisSucceeded = false;
    let completedCase: CaseHistoryEntry | null = null;

    setHasCompletedAnalysis(false);
    setPatientProfile(null);
    setInferenceResult(null);
    setHeatmapData(null);
    setKmData(null);
    setPathways([]);
    setReport(null);
    setIsAnalyzing(true);
    setAnalysisSource(source);
    setStatusNotification(source === 'demo'
      ? 'Loading bundled demo subject and cross-attending pathways...'
      : 'Processing uploaded patient data and cross-attending pathways...');

    try {
      // 1. Fetch Patient Profile
      const resProfile = await fetch(`/api/patient/${patientId}`);
      if (resProfile.ok) {
        const profile = await resProfile.json();
        setPatientProfile({
          patient_id: profile.patient_id,
          grade: profile.grade ?? profile.histologic_grade ?? 'Not provided',
          stage: profile.stage ?? profile.tumor_stage ?? 'Not provided',
          age: profile.age ?? 0,
          sex: profile.sex ?? profile.gender ?? 'Unknown',
          mutation_count: profile.mutation_count ?? profile.key_mutations?.length ?? 0,
          tmb: profile.tmb ?? 'Pending',
          num_wsi_tiles: profile.num_wsi_tiles ?? 1024,
          description: profile.description ?? profile.smoking_history ?? '',
          key_mutations: profile.key_mutations ?? [],
        });
      }

      // 2. Run Inference
      setStatusNotification('Evaluating Cox Survival Head on Multimodal Embeddings...');
      const inferenceForm = new FormData();
      inferenceForm.append('patient_id', patientId);
      const resInf = await fetch('/api/run-inference', {
        method: 'POST',
        body: inferenceForm,
      });
      if (resInf.ok) {
        const inf = await resInf.json();
        analysisSucceeded = Boolean(inf.success);
        const riskInfo = inf.risk_stratification ?? {};
        const percentile = Number.parseInt(String(riskInfo.percentile ?? '50'), 10);
        completedCase = {
          id: `${patientId}-${Date.now()}`,
          patient_id: patientId,
          source,
          analyzed_at: new Date().toISOString(),
          risk_score: Number(inf.risk_score ?? 0),
          risk_tier: riskInfo.tier ?? 'Moderate Risk',
          median_survival_months: Number(inf.km_curves?.estimated_median_survival_months ?? 0),
        };
        setInferenceResult({
          success: inf.success,
          patient_id: inf.patient_id,
          risk_score: inf.risk_score,
          risk_tier: riskInfo.tier ?? 'Moderate Risk',
          risk_tier_class: riskInfo.badge_color ?? '',
          median_survival_months: inf.km_curves?.estimated_median_survival_months ?? 0,
          cohort_percentile: Number.isNaN(percentile) ? 50 : percentile,
          c_index: inf.multimodal_concordance?.c_index_model ?? 0,
          cross_modal_attention_summary: {
            top_attended_patches_count: inf.wsi_overview?.top_hotspots?.length ?? 0,
            peak_attention_weight: inf.wsi_overview?.top_hotspots?.[0]?.attention_weight ?? 0,
            pathway_count: inf.top_pathways?.length ?? 0,
            modality_interaction: source === 'demo' ? 'Bundled demo inputs' : 'Uploaded patient inputs',
          },
        });
        if (inf.km_curves) {
          setKmData({
            time_points_months: inf.km_curves.timepoints_months,
            high_risk_survival: inf.km_curves.high_risk_cohort,
            low_risk_survival: inf.km_curves.low_risk_cohort,
            patient_trajectory: inf.km_curves.patient_trajectory,
          });
        }
        if (inf.top_pathways) {
          setPathways(inf.top_pathways.map((pathway: { name: string; weight: number; description?: string }) => ({
            name: pathway.name,
            attention_score: pathway.weight,
            percentile: Math.round(pathway.weight * 100),
            biological_role: pathway.description ?? '',
            genes: [],
          })));
        }
      }

      // 3. Fetch Heatmap Tiles
      setStatusNotification('Synthesizing Gigapixel Histology Overlay & Attention Hotspots...');
      const resHeatmap = await fetch(`/api/heatmap/${patientId}`);
      if (resHeatmap.ok) {
        const hm = await resHeatmap.json();
        setHeatmapData(hm);
      }

      // 4. Generate Clinical Report
      setStatusNotification('Synthesizing Multimodal Clinical Report via Hugging Face AI...');
      setIsReportLoading(true);
      const reportForm = new FormData();
      reportForm.append('patient_id', patientId);
      if (completedCase?.risk_score) {
        reportForm.append('risk_score', String(completedCase.risk_score));
      }
      const resReport = await fetch('/api/generate-report', {
        method: 'POST',
        body: reportForm,
      });


      if (resReport.ok) {
        const rep = await resReport.json();
        setReport(rep);
      }
    } catch (err) {
      console.error('[Onco_Bot] Inference pipeline error:', err);
    } finally {
      setIsAnalyzing(false);
      setIsReportLoading(false);
      setStatusNotification(null);
      setHasCompletedAnalysis(analysisSucceeded);
      if (analysisSucceeded && completedCase) {
        const historyEntry = completedCase;
        setCaseHistory((current) => [historyEntry, ...current].slice(0, 20));
        navigateTo('results');
      }
    }
  }, [navigateTo]);

  const handleSelectDemo = (patientId: string) => {
    setSelectedPatientId(patientId);
    setAnalysisSource('demo');
    setHasCompletedAnalysis(false);
  };

  const handleRunDemo = (patientId: string) => {
    setSelectedPatientId(patientId);
    void executeAnalysis(patientId, 'demo');
  };

  const handleRerunCase = (entry: CaseHistoryEntry) => {
    setSelectedPatientId(entry.patient_id);
    setAnalysisSource(entry.source);
    navigateTo('home');
    void executeAnalysis(entry.patient_id, entry.source);
  };

  // Handle manual report regeneration
  const handleRegenerateReport = async () => {
    setIsReportLoading(true);
    try {
      const reportForm = new FormData();
      reportForm.append('patient_id', selectedPatientId);
      if (inferenceResult?.risk_score) {
        reportForm.append('risk_score', String(inferenceResult.risk_score));
      }
      const resReport = await fetch('/api/generate-report', {
        method: 'POST',
        body: reportForm,
      });

      if (resReport.ok) {
        const rep = await resReport.json();
        setReport(rep);
      }
    } catch (err) {
      console.error('[Onco_Bot] Report regeneration error:', err);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleUploadAndRun = async (upload: PatientUploadData) => {
    setHasCompletedAnalysis(false);
    setIsUploadingPatient(true);
    setStatusNotification('Uploading patient cohort data and preparing multimodal analysis...');

    const formData = new FormData();
    formData.append('patient_id', upload.patientId);
    if (upload.rnaFile) formData.append('rna_file', upload.rnaFile);
    if (upload.wsiFile) formData.append('wsi_file', upload.wsiFile);
    if (upload.rnaDriveLink.trim()) formData.append('rna_drive_link', upload.rnaDriveLink.trim());
    if (upload.wsiDriveLink.trim()) formData.append('wsi_drive_link', upload.wsiDriveLink.trim());

    try {
      const response = await fetch('/api/upload-patient', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Patient upload failed with status ${response.status}`);
      }

      const uploaded = await response.json();
      const patientId = uploaded.patient_id ?? upload.patientId;
      const label = uploaded.label ?? `${patientId} (Uploaded Patient Case)`;

      setPatients((current) => {
        const nextPatient = { patient_id: patientId, label };
        const existingIndex = current.findIndex((patient) => patient.patient_id === patientId);
        if (existingIndex === -1) return [...current, nextPatient];
        return current.map((patient, index) => (index === existingIndex ? nextPatient : patient));
      });
      setSelectedPatientId(patientId);
      await executeAnalysis(patientId, 'uploaded');
    } catch (error) {
      console.error('[Onco_Bot] Patient upload error:', error);
      setStatusNotification('Patient upload failed. Check the selected files or Drive links and try again.');
    } finally {
      setIsUploadingPatient(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-charcoal-navy font-sans antialiased px-4 sm:px-6 lg:px-8 py-4">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Top Floating Navbar Pill */}
        <Navbar
          status={status}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          caseHistoryCount={caseHistory.length}
          isCaseHistoryPage={currentPage === 'case-history'}
          isResultsPage={currentPage === 'results'}
          isProfilePage={currentPage === 'profile'}
          user={currentUser}
          onOpenCaseHistory={() => navigateTo('case-history')}
          onNavigateHome={() => navigateTo('home')}
          onOpenResults={() => navigateTo('results')}
          onOpenProfile={() => navigateTo('profile')}
        />

        {currentPage === 'case-history' ? (
          <CaseHistoryPanel
            entries={caseHistory}
            onBack={() => navigateTo('home')}
            onRerun={handleRerunCase}
          />
        ) : currentPage === 'profile' ? (
          <ProfilePage
            user={currentUser}
            caseHistoryCount={caseHistory.length}
            onResetSession={() => {
              window.localStorage.removeItem('oncobot-case-history');
              window.localStorage.removeItem('oncobot-user');
              setCaseHistory([]);
              setCurrentUser(ANONYMOUS_GUEST_USER);
              navigateTo('home');
            }}
            onBackToConsole={() => navigateTo('home')}
            onOpenCaseHistory={() => navigateTo('case-history')}
          />
        ) : currentPage === 'results' ? (
          hasCompletedAnalysis && inferenceResult ? (
            <AnalysisResultsPage
              activeTab={activeTab}
              onTabChange={setActiveTab}
              patientProfile={patientProfile}
              patientId={selectedPatientId}
              heatmap={heatmapData}
              kmData={kmData}
              pathways={pathways}
              report={report}
              isAnalyzing={isAnalyzing}
              isReportLoading={isReportLoading}
              onRegenerateReport={handleRegenerateReport}
              onBack={() => navigateTo('home')}
            />
          ) : (
            <main className="mx-auto mb-8 flex min-h-[520px] w-full max-w-[1400px] items-center justify-center rounded-3xl border border-deep-teal/20 bg-card-mint p-6 text-center">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-deep-teal">No result loaded</span>
                <h1 className="mt-1 font-serif text-[28px] font-normal text-charcoal-navy">Run an analysis to view results</h1>
                <p className="mx-auto mt-2 max-w-[520px] font-sans text-[13px] text-[#4a5e5d]">
                  Results are generated only after a demo subject or uploaded patient analysis completes.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="mt-5 rounded-full border-none bg-deep-teal px-5 py-2.5 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-forest-floor cursor-pointer"
                >
                  Go to Analysis Setup
                </button>
              </div>
            </main>
          )
        ) : (
          <>

        {/* Hero Section Flanked by Hand-Drawn Illustrations */}
        <HeroSection
          onRunAnalysis={() => executeAnalysis(selectedPatientId, analysisSource)}
          isAnalyzing={isAnalyzing}
        >
          <section id="patient-cohort-upload" className="w-full" aria-label="Patient cohort selection">
            <PatientUploadCard
              patients={patients.filter((patient) => !patient.label.includes('(Uploaded Patient Case)'))}
              selectedPatientId={selectedPatientId}
              analysisSource={analysisSource}
              hasCompletedAnalysis={hasCompletedAnalysis}
              onSelectDemo={handleSelectDemo}
              onRunDemo={handleRunDemo}
              onUploadAndRun={handleUploadAndRun}
              isProcessing={isUploadingPatient}
              isAnalyzing={isAnalyzing}
            />
          </section>

          <StatBannerStrip inference={inferenceResult} />
        </HeroSection>

        {/* Live Status Notification Strip */}
        {statusNotification && (
          <div className="w-full max-w-[1400px] mx-auto mb-6 bg-sea-foam/90 border border-deep-teal/20 text-deep-teal font-mono text-[12px] font-semibold px-4 py-2 rounded-full flex items-center justify-center gap-2 animate-pulse shadow-sm">
            <span className="w-2 h-2 rounded-full bg-deep-teal animate-ping" />
            {statusNotification}
          </div>
        )}

          </>
        )}

        {/* Global Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default App;
