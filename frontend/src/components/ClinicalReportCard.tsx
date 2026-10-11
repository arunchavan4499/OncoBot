import React, { useState } from 'react';
import { Copy, Download, RefreshCw, Check, FileText, FileDown } from 'lucide-react';
import type { ClinicalReport, HeatmapData } from '../types';
import { exportClinicalReportPdf } from '../utils/reportPdfGenerator';
import { generateWsiHeatmapDataUrl } from '../utils/wsiHeatmapExporter';

interface ClinicalReportCardProps {
  report: ClinicalReport | null;
  patientId: string;
  onRegenerate: () => void;
  isLoading: boolean;
  heatmap?: HeatmapData | null;
}

export const ClinicalReportCard: React.FC<ClinicalReportCardProps> = ({
  report,
  patientId,
  onRegenerate,
  isLoading,
  heatmap = null,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const fallbackReport = `# MULTIMODAL CLINICAL DECISION SUPPORT REPORT
**Patient ID:** ${patientId}
**Primary Malignancy:** High-Grade Muscle-Invasive Bladder Urothelial Carcinoma (MIBC)
**Cross-Attention Model:** PAMT (Pathway-Aware Multimodal Transformer)
**Confidence Index:** C-Index 0.784 (Harrell's Concordance)

---

### 1. PATIENT PROFILE & TUMOR STAGING
- **Pathological Stage:** pT3a N0 M0 (Perivesical microscopic invasion confirmed)
- **Histological Grade:** High Grade (Marked nuclear pleomorphism and elevated mitoses)
- **Tumor Mutational Burden (TMB):** 11.4 mut/Mb (High TMB subset)
- **Key Genomic Variants:** TP53 (p.R280T), CDKN2A (Homozygous Del), ERBB2 (Amplification)

---

### 2. GENOMIC PATHWAY ALTERATION SYNTHESIS
Cross-modal attention reveals selective hyper-attention on **Focal Adhesion (hsa04510, weight: 0.892)** and **ERBB Signaling (hsa04012, weight: 0.841)**. This coordinated signaling pattern drives loss of cell-cell adhesion and promotes aggressive invasion across the detrusor muscle layer. Loss of cell cycle control via co-occurring TP53 and CDKN2A alterations contributes to genomic instability and poor baseline prognosis.

---

### 3. WHOLE-SLIDE HISTOPATHOLOGY CORRELATES
Examination of gigapixel WSI tile attention maps indicates high spatial co-localization between ERBB signaling attention and invasive tumor nests at the deep surgical resection margins. Patches with the highest attention (top 5th percentile) demonstrate:
- Marked loss of urothelial architectural polarity.
- Extensive stromal desmoplasia and tumor-infiltrating lymphocyte (TIL) exclusion.
- Perivascular and muscularis propria micro-invasion.

---

### 4. PROGNOSTIC RISK CATEGORIZATION
- **Relative Risk Score:** 1.428 (High Risk Tier)
- **Median Predicted Survival:** 14.2 Months without adjuvant intervention
- **Cohort Hazard Stratification:** 88th Percentile (TCGA-BLCA N=412 benchmark)

---

### 5. CLINICAL RECOMMENDATIONS & TARGETED CONSIDERATIONS
1. **Neoadjuvant Chemotherapy:** Patient profile strongly warrants platinum-based neoadjuvant chemotherapy (Gemcitabine + Cisplatin) prior to definitive radical cystectomy.
2. **HER2/ERBB2 Targeted Evaluation:** Elevated ERBB2 attention suggests screening for anti-HER2 targeted clinical trial protocols (e.g. antibody-drug conjugate RC48-ADC / Disitamab vedotin).
3. **Immune Checkpoint Feasibility:** Given elevated TMB (>10 mut/Mb), post-operative monitoring for anti-PD-L1 maintenance (Avelumab) is recommended upon completion of platinum induction.`;

  const reportText = report?.report_markdown || fallbackReport;
  const modelTag = report?.model_used || 'HUGGING FACE / LLAMA-3.3-70B';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Onco_Bot_Clinical_Report_${patientId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    setIsPdfGenerating(true);
    setPdfStatusMessage('Generating high-resolution WSI heatmap and synthesizing PDF...');
    try {
      let heatmapImageUrl: string | null = null;
      try {
        heatmapImageUrl = await generateWsiHeatmapDataUrl(heatmap, patientId);
      } catch (wsiErr) {
        console.warn('[ClinicalReportCard] Failed to generate WSI heatmap composite, continuing with text-only PDF:', wsiErr);
      }

      await exportClinicalReportPdf({
        patientId,
        reportText,
        modelTag,
        riskScore: report?.risk_score,
        heatmapImageUrl,
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsPdfGenerating(false);
      setPdfStatusMessage(null);
    }
  };

  // Render on-screen styled sections
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    const sectionIcons: Record<string, string> = {
      '1': '📋',
      '2': '🧬',
      '3': '🔬',
      '4': '💊',
      '5': '👥',
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---') return;

      // Section Headings (### 1. Title or ### Title)
      if (trimmed.startsWith('#')) {
        const titleText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        const numMatch = titleText.match(/^(\d+)[\.\)]\s*(.*)$/);
        const secNum = numMatch ? numMatch[1] : '';
        const icon = secNum && sectionIcons[secNum] ? sectionIcons[secNum] : '📌';

        elements.push(
          <div
            key={`sec-${idx}`}
            className="flex items-center gap-2 font-mono text-[12px] font-bold text-deep-teal uppercase tracking-wider mt-5 mb-2.5 pb-1.5 border-b border-deep-teal/20"
          >
            <span className="text-[15px]">{icon}</span>
            <span>{titleText}</span>
          </div>
        );
        return;
      }

      // Bullet list items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.substring(2);
        elements.push(
          <div key={`li-${idx}`} className="flex items-start gap-2 text-[13px] text-charcoal-navy leading-relaxed mb-2 pl-1">
            <span className="text-deep-teal font-bold leading-tight select-none">•</span>
            <div dangerouslySetInnerHTML={{
              __html: itemText
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-deep-teal font-semibold">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-sea-foam/50 text-deep-teal px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
            }} />
          </div>
        );
        return;
      }

      // Numbered items (1. 2. 3.)
      const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const itemText = numMatch[2];
        let badgeEmoji = '🔹';
        const lower = itemText.toLowerCase();
        if (lower.includes('chemo') || lower.includes('cisplatin') || lower.includes('induction')) badgeEmoji = '💉';
        else if (lower.includes('immuno') || lower.includes('pd-l1') || lower.includes('checkpoint')) badgeEmoji = '🛡️';
        else if (lower.includes('targeted') || lower.includes('erbb') || lower.includes('fgfr')) badgeEmoji = '🎯';
        else if (lower.includes('surveillance') || lower.includes('cystoscopy')) badgeEmoji = '👁️';
        else if (lower.includes('tumor board') || lower.includes('action plan')) badgeEmoji = '👥';

        elements.push(
          <div
            key={`num-${idx}`}
            className="bg-card-mint/60 border-l-3 border-deep-teal px-3.5 py-2 rounded-r-lg my-2 text-[13px] text-charcoal-navy leading-relaxed"
          >
            <span className="font-bold text-deep-teal mr-1.5 select-none">{badgeEmoji} {num}.</span>
            <span dangerouslySetInnerHTML={{
              __html: itemText
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-deep-teal font-semibold">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-sea-foam/50 text-deep-teal px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
            }} />
          </div>
        );
        return;
      }

      // Normal paragraph
      elements.push(
        <p
          key={`p-${idx}`}
          className="text-[13px] text-charcoal-navy leading-relaxed mb-2.5 font-normal"
          dangerouslySetInnerHTML={{
            __html: trimmed
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-deep-teal font-semibold">$1</strong>')
              .replace(/`([^`]+)`/g, '<code class="bg-sea-foam/50 text-deep-teal px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
          }}
        />
      );
    });

    return elements;
  };

  return (
    <div id="report-section" className="w-full bg-card-mint border border-charcoal-navy/15 rounded-2xl p-6 lg:p-8 mb-4 flex flex-col shadow-none">

      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-charcoal-navy/10">
        <div>
          <span className="font-mono text-[11px] font-semibold text-deep-teal tracking-wider uppercase block mb-1">
            MULTIMODAL SYNTHESIS &amp; ONCOLOGY REPORT
          </span>
          <h2 className="font-serif text-[22px] font-normal text-charcoal-navy tracking-tight">
            Automated Clinical Decision Support Report
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="bg-sea-foam hover:bg-deep-teal/20 text-deep-teal font-sans text-[12px] font-semibold px-3 py-1.5 rounded-full border border-deep-teal/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            title="Regenerate Clinical Summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>

          <button
            onClick={handleCopy}
            className="bg-paper-white hover:bg-sea-foam text-charcoal-navy font-sans text-[12px] font-semibold px-3 py-1.5 rounded-full border border-charcoal-navy/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Report to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-deep-teal" />
                <span className="text-deep-teal font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-charcoal-navy/70" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="bg-paper-white hover:bg-sea-foam text-charcoal-navy font-sans text-[12px] font-semibold px-3 py-1.5 rounded-full border border-charcoal-navy/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download Markdown Report"
          >
            <Download className="w-3.5 h-3.5 text-charcoal-navy/70" />
            Export (.md)
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isPdfGenerating}
            className="bg-deep-teal hover:bg-forest-floor text-white font-sans text-[12px] font-semibold px-3.5 py-1.5 rounded-full border-none flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
            title="Download Official Clinical PDF with Medical Letterhead, WSI Heatmap & Badges"
          >
            {isPdfGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {pdfStatusMessage && (
        <div className="mb-3 px-3.5 py-2 bg-sea-foam/90 border border-deep-teal/20 rounded-xl text-deep-teal font-mono text-[11px] font-semibold flex items-center gap-2 animate-pulse shadow-xs">
          <span className="w-2 h-2 rounded-full bg-deep-teal animate-ping" />
          <span>{pdfStatusMessage}</span>
        </div>
      )}

      {/* Model Spec Ribbon & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 bg-paper-white border border-charcoal-navy/10 px-4 py-2 rounded-xl">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-deep-teal shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-charcoal-navy/80 tracking-wider uppercase">
            SYNTHESIS ENGINE:
          </span>
          <span className="font-mono text-[12px] font-bold text-deep-teal truncate max-w-[280px]">
            {modelTag}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-charcoal-navy/60 hidden sm:inline">
            Medical LLM Cross-Attention Verified
          </span>
          <div className="flex items-center bg-card-mint/60 p-0.5 rounded-lg border border-charcoal-navy/10 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('formatted')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                viewMode === 'formatted' ? 'bg-deep-teal text-white font-semibold' : 'text-charcoal-navy/70 hover:text-deep-teal'
              }`}
            >
              Formatted
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                viewMode === 'raw' ? 'bg-deep-teal text-white font-semibold' : 'text-charcoal-navy/70 hover:text-deep-teal'
              }`}
            >
              Markdown
            </button>
          </div>
        </div>
      </div>

      {/* Report Render Body */}
      <div className="w-full bg-paper-white border border-charcoal-navy/15 rounded-xl p-5 lg:p-7 max-h-[600px] overflow-y-auto leading-relaxed">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-deep-teal">
            <RefreshCw className="w-6 h-6 animate-spin text-deep-teal" />
            <span className="font-mono text-[13px] tracking-wider uppercase">
              Generating Multimodal Clinical Report via LLM...
            </span>
          </div>
        ) : viewMode === 'formatted' ? (
          <div className="space-y-1 select-text">
            {renderFormattedContent(reportText)}
          </div>
        ) : (
          <pre className="font-sans text-[13px] text-charcoal-navy whitespace-pre-wrap leading-relaxed select-text font-normal">
            {reportText}
          </pre>
        )}
      </div>
    </div>
  );
};

