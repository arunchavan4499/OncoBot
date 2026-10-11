import React, { useState } from 'react';
import { Microscope, Dna, TrendingUp, FileText, LayoutGrid } from 'lucide-react';
import { WsiViewerCard } from './WsiViewerCard';
import { SurvivalCurveCard } from './SurvivalCurveCard';
import { PathwayAttentionCard } from './PathwayAttentionCard';
import { ClinicalReportCard } from './ClinicalReportCard';
import type { HeatmapData, KmCurveData, PathwayItem, ClinicalReport } from '../types';

export type DashboardTab = 'all' | 'wsi' | 'pathways' | 'survival' | 'report';

interface UnifiedDashboardProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  heatmap: HeatmapData | null;
  kmData: KmCurveData | null;
  pathways: PathwayItem[];
  report: ClinicalReport | null;
  patientId: string;
  isAnalyzing: boolean;
  isReportLoading: boolean;
  onRegenerateReport: () => void;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  activeTab,
  onTabChange,
  heatmap,
  kmData,
  pathways,
  report,
  patientId,
  isAnalyzing,
  isReportLoading,
  onRegenerateReport,
}) => {
  // Sub-pane toggles for the 'all' side-by-side view
  const [leftPaneMode, setLeftPaneMode] = useState<'wsi' | 'survival'>('wsi');
  const [rightPaneMode, setRightPaneMode] = useState<'pathways' | 'report'>('pathways');

  return (
    <>
      {/* Master Navigation Tab Pills — intentionally outside the dashboard card */}
      <nav
        className="w-full max-w-[1400px] mx-auto mb-4 flex justify-center md:justify-end"
        aria-label="Clinical intelligence workspace views"
      >
        <div className="workspace-tab-scroll flex h-[46px] w-full max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto bg-paper-white p-1.5 rounded-full border border-charcoal-navy/15 shadow-sm md:w-auto">
          <button
            onClick={() => onTabChange('all')}
            className={`h-8 shrink-0 whitespace-nowrap px-3.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-deep-teal text-white shadow-none'
                : 'text-charcoal-navy/80 hover:text-deep-teal hover:bg-sea-foam/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All-in-One Console
          </button>

          <button
            onClick={() => onTabChange('wsi')}
            className={`h-8 shrink-0 whitespace-nowrap px-3.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wsi'
                ? 'bg-deep-teal text-white shadow-none'
                : 'text-charcoal-navy/80 hover:text-deep-teal hover:bg-sea-foam/50'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            Pathology (WSI)
          </button>

          <button
            onClick={() => onTabChange('pathways')}
            className={`h-8 shrink-0 whitespace-nowrap px-3.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pathways'
                ? 'bg-deep-teal text-white shadow-none'
                : 'text-charcoal-navy/80 hover:text-deep-teal hover:bg-sea-foam/50'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            Pathways (320)
          </button>

          <button
            onClick={() => onTabChange('survival')}
            className={`h-8 shrink-0 whitespace-nowrap px-3.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'survival'
                ? 'bg-deep-teal text-white shadow-none'
                : 'text-charcoal-navy/80 hover:text-deep-teal hover:bg-sea-foam/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Survival Risk
          </button>

          <button
            onClick={() => onTabChange('report')}
            className={`h-8 shrink-0 whitespace-nowrap px-3.5 rounded-full font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-deep-teal text-white shadow-none'
                : 'text-charcoal-navy/80 hover:text-deep-teal hover:bg-sea-foam/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Clinical Report
          </button>
        </div>
      </nav>

      <section className="w-full max-w-[1400px] mx-auto bg-card-mint border border-charcoal-navy/15 rounded-3xl p-6 lg:p-8 shadow-none transition-all">
      {/* Unified Master Control Header */}
      <div className="mb-6 pb-5 border-b border-charcoal-navy/10">
        <span className="font-mono text-[11px] font-semibold text-deep-teal tracking-wider uppercase block mb-1">
          MULTIMODAL CLINICAL INTELLIGENCE WORKSPACE
        </span>
        <h2 className="font-serif text-[24px] lg:text-[28px] font-normal text-charcoal-navy tracking-tight">
          Integrated Diagnostic &amp; Prognostic Console
        </h2>
      </div>

      {/* VIEWPORT CONTENT */}
      {/* 1. ALL-IN-ONE CONSOLE (STACKED FULL-WIDTH SECTIONS WITH SUB-PANE TOGGLES) */}
      {activeTab === 'all' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* First section: Pathology OR Survival Curves */}
          <div className="w-full flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-[11px] font-bold text-deep-teal uppercase tracking-wider">
                MORPHOLOGY &amp; PROGNOSIS
              </span>
              <div className="flex items-center gap-1 bg-paper-white p-1 rounded-full border border-charcoal-navy/15 text-[11px]">
                <button
                  onClick={() => setLeftPaneMode('wsi')}
                  className={`px-3 py-0.5 rounded-full font-mono font-semibold transition-colors cursor-pointer ${
                    leftPaneMode === 'wsi'
                      ? 'bg-deep-teal text-white'
                      : 'text-charcoal-navy/70 hover:text-deep-teal'
                  }`}
                >
                  WSI Attention
                </button>
                <button
                  onClick={() => setLeftPaneMode('survival')}
                  className={`px-3 py-0.5 rounded-full font-mono font-semibold transition-colors cursor-pointer ${
                    leftPaneMode === 'survival'
                      ? 'bg-deep-teal text-white'
                      : 'text-charcoal-navy/70 hover:text-deep-teal'
                  }`}
                >
                  Survival Curves
                </button>
              </div>
            </div>

            {leftPaneMode === 'wsi' ? (
              <WsiViewerCard heatmap={heatmap} isLoading={isAnalyzing} />
            ) : (
              <SurvivalCurveCard kmData={kmData} patientId={patientId} />
            )}
          </div>

          {/* Next section: Genomic Pathways OR Clinical Report */}
          <div className="w-full flex flex-col border-t border-charcoal-navy/10 pt-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono text-[11px] font-bold text-deep-teal uppercase tracking-wider">
                GENOMICS &amp; SYNTHESIS
              </span>
              <div className="flex items-center gap-1 bg-paper-white p-1 rounded-full border border-charcoal-navy/15 text-[11px]">
                <button
                  onClick={() => setRightPaneMode('pathways')}
                  className={`px-3 py-0.5 rounded-full font-mono font-semibold transition-colors cursor-pointer ${
                    rightPaneMode === 'pathways'
                      ? 'bg-deep-teal text-white'
                      : 'text-charcoal-navy/70 hover:text-deep-teal'
                  }`}
                >
                  KEGG Pathways
                </button>
                <button
                  onClick={() => setRightPaneMode('report')}
                  className={`px-3 py-0.5 rounded-full font-mono font-semibold transition-colors cursor-pointer ${
                    rightPaneMode === 'report'
                      ? 'bg-deep-teal text-white'
                      : 'text-charcoal-navy/70 hover:text-deep-teal'
                  }`}
                >
                  LLM Report
                </button>
              </div>
            </div>

            {rightPaneMode === 'pathways' ? (
              <PathwayAttentionCard pathways={pathways} />
            ) : (
              <ClinicalReportCard
                report={report}
                patientId={patientId}
                onRegenerate={onRegenerateReport}
                isLoading={isReportLoading}
                heatmap={heatmap}
              />
            )}
          </div>
        </div>
      )}

      {/* 2. FULL-WIDTH VIEW: PATHOLOGY (WSI) */}
      {activeTab === 'wsi' && (
        <div className="w-full mx-auto animate-in fade-in duration-300">
          <WsiViewerCard heatmap={heatmap} isLoading={isAnalyzing} />
        </div>
      )}

      {/* 3. FULL-WIDTH VIEW: GENOMIC PATHWAYS (320 KEGG) */}
      {activeTab === 'pathways' && (
        <div className="w-full mx-auto animate-in fade-in duration-300">
          <PathwayAttentionCard pathways={pathways} />
        </div>
      )}

      {/* 4. FULL-WIDTH VIEW: SURVIVAL RISK & KM CURVES */}
      {activeTab === 'survival' && (
        <div className="w-full mx-auto animate-in fade-in duration-300">
          <SurvivalCurveCard kmData={kmData} patientId={patientId} />
        </div>
      )}

      {/* 5. FULL-WIDTH VIEW: CLINICAL DECISION REPORT */}
      {activeTab === 'report' && (
        <div className="w-full mx-auto animate-in fade-in duration-300">
          <ClinicalReportCard
            report={report}
            patientId={patientId}
            onRegenerate={onRegenerateReport}
            isLoading={isReportLoading}
            heatmap={heatmap}
          />
        </div>
      )}
      </section>
    </>
  );
};
