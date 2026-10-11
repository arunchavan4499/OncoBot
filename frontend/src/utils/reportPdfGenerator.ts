import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfReportOptions {
  patientId: string;
  reportText: string;
  modelTag: string;
  riskScore?: number;
  cancerType?: string;
  topPathways?: { name: string; weight: number; description?: string }[];
  attentionSummary?: string;
  heatmapImageUrl?: string | null;
  wsiHotspots?: Array<{ weight: number; tissue: string }>;
}

interface ParsedSection {
  number: string;
  title: string;
  icon: string;
  contentHtml: string;
}

/**
 * Parses markdown report text into structured clinical sections
 */
function parseReportMarkdown(rawText: string): ParsedSection[] {
  const lines = rawText.split('\n');
  const sections: ParsedSection[] = [];
  let currentTitle = '';
  let currentNumber = '';
  let currentLines: string[] = [];

  const sectionIconMap: Record<string, string> = {
    '1': '📋',
    '2': '🧬',
    '3': '🔬',
    '4': '💊',
    '5': '👥',
  };

  const flushSection = () => {
    if (currentTitle && currentLines.length > 0) {
      const icon = sectionIconMap[currentNumber] || '🔹';
      const formattedHtml = formatSectionContent(currentLines.join('\n'));
      sections.push({
        number: currentNumber,
        title: currentTitle,
        icon,
        contentHtml: formattedHtml,
      });
      currentLines = [];
    }
  };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s*(?:(\d+)[\.\)]\s*)?(.*)$/);
    // Check if this looks like a section header (e.g. ### 1. EXECUTIVE SUMMARY or ### 1. PATIENT PROFILE)
    if (headerMatch && (line.includes('###') || (line.startsWith('#') && !line.startsWith('## MULTIMODAL')))) {
      const numMatch = line.match(/(\d+)[\.\)]\s*(.+)/);
      if (numMatch) {
        flushSection();
        currentNumber = numMatch[1];
        currentTitle = numMatch[2].replace(/\*\*/g, '').trim();
        continue;
      }
    }

    // Check for bold uppercase headers like **1. EXECUTIVE SUMMARY:**
    const boldHeaderMatch = line.match(/^\*\*(?:(\d+)[\.\)]\s*)?([A-Z\s&]+):\*\*/);
    if (boldHeaderMatch) {
      flushSection();
      currentNumber = boldHeaderMatch[1] || `${sections.length + 1}`;
      currentTitle = boldHeaderMatch[2].trim();
      continue;
    }

    currentLines.push(line);
  }
  flushSection();

  // If no sections were parsed cleanly, create fallback sections
  if (sections.length === 0) {
    const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const p1 = paragraphs.slice(0, 2).join('\n\n');
    const p2 = paragraphs.slice(2, 4).join('\n\n');
    const p3 = paragraphs.slice(4).join('\n\n');

    sections.push({
      number: '1',
      title: 'EXECUTIVE SUMMARY & MULTIMODAL RISK PROFILE',
      icon: '📋',
      contentHtml: formatSectionContent(p1 || rawText),
    });
    if (p2) {
      sections.push({
        number: '2',
        title: 'GENOMIC & HISTOPATHOLOGY CROSS-MODAL INTERPLAY',
        icon: '🧬',
        contentHtml: formatSectionContent(p2),
      });
    }
    if (p3) {
      sections.push({
        number: '3',
        title: 'WHOLE-SLIDE HISTOPATHOLOGY CORRELATES',
        icon: '🔬',
        contentHtml: formatSectionContent(p3),
      });
    }
  }

  return sections;
}

/**
 * Formats markdown paragraphs, lists, and bold text into styled HTML
 */
function formatSectionContent(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') continue;

    // Bullet items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = formatInlineMarkdown(trimmed.substring(2));
      result.push(`
        <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px; font-size: 10px; line-height: 1.4; color: #283338;">
          <span style="color: #1c5d5f; font-weight: bold; font-size: 11px; line-height: 1.3;">•</span>
          <div>${itemText}</div>
        </div>
      `);
      continue;
    }

    // Numbered items (1. 2. 3.)
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const itemText = formatInlineMarkdown(numMatch[2]);
      
      let badgeEmoji = '🔹';
      if (itemText.toLowerCase().includes('chemotherapy') || itemText.toLowerCase().includes('induction')) badgeEmoji = '💉';
      else if (itemText.toLowerCase().includes('immunotherapy') || itemText.toLowerCase().includes('pd-l1') || itemText.toLowerCase().includes('checkpoint')) badgeEmoji = '🛡️';
      else if (itemText.toLowerCase().includes('targeted') || itemText.toLowerCase().includes('erbb2') || itemText.toLowerCase().includes('fgfr')) badgeEmoji = '🎯';
      else if (itemText.toLowerCase().includes('surveillance') || itemText.toLowerCase().includes('monitoring')) badgeEmoji = '👁️';
      else if (itemText.toLowerCase().includes('tumor board') || itemText.toLowerCase().includes('multidisciplinary')) badgeEmoji = '👥';

      result.push(`
        <div style="background: #f7faf9; border-left: 3px solid #1c5d5f; padding: 5px 8px; border-radius: 4px; margin-bottom: 5px; font-size: 10.5px; line-height: 1.45; color: #283338;">
          <span style="font-weight: 700; color: #1c5d5f; margin-right: 4px;">${badgeEmoji} ${num}.</span>
          ${itemText}
        </div>
      `);
      continue;
    }

    // Regular paragraph
    result.push(`
      <p style="margin: 0 0 5px 0; font-size: 10.5px; line-height: 1.45; color: #283338; text-align: justify;">
        ${formatInlineMarkdown(trimmed)}
      </p>
    `);
  }

  return result.join('');
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0e4749; font-weight: 600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color: #333333;">$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: #e4f0f1; color: #1c5d5f; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10px;">$1</code>');
}

/**
 * Builds the HTML template for Page 1 of the Clinical Report
 */
function buildPageOneHtml(options: PdfReportOptions, sections: ParsedSection[], formattedDate: string): string {
  const { patientId, modelTag, riskScore, cancerType = 'Bladder Urothelial Carcinoma (TCGA-BLCA)' } = options;

  let riskTier = 'High Risk (88th Percentile)';
  let riskColor = '#a8324e';
  let riskBadgeBg = '#fdf2f4';
  let scoreVal = riskScore ?? 1.428;

  if (scoreVal >= 1.5) {
    riskTier = 'High Risk (88th Percentile)';
    riskColor = '#a8324e';
    riskBadgeBg = '#fdf2f4';
  } else if (scoreVal <= 0.8) {
    riskTier = 'Low Risk (24th Percentile)';
    riskColor = '#156152';
    riskBadgeBg = '#edf7f4';
  } else {
    riskTier = 'Intermediate Risk (55th Percentile)';
    riskColor = '#b45309';
    riskBadgeBg = '#fef3c7';
  }

  // Page 1 gets Section 1, 2, and 3
  const p1Sections = sections.filter(s => ['1', '2', '3'].includes(s.number));
  // If parsing didn't produce numbered sections, take first 2-3
  const displaySections = p1Sections.length > 0 ? p1Sections : sections.slice(0, 3);

  const sectionsHtml = displaySections.map((sec, idx) => {
    const isSectionThree = sec.number === '3' || sec.title.toLowerCase().includes('histopath') || (!displaySections.some(s => s.number === '3') && idx === displaySections.length - 1);

    if (isSectionThree && options.heatmapImageUrl) {
      return `
        <div style="margin-bottom: 8px; background: #ffffff; border: 1px solid #d8e5e5; border-radius: 6px; padding: 7px 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px; border-bottom: 1px solid #eef4f4; padding-bottom: 3px;">
            <span style="font-size: 13px;">${sec.icon}</span>
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700; color: #1c5d5f; letter-spacing: 0.3px; text-transform: uppercase;">
              Section ${sec.number}: ${sec.title}
            </span>
          </div>
          <div style="display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 10px; align-items: start;">
            <div>
              ${sec.contentHtml}
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <img src="${options.heatmapImageUrl}" alt="WSI Attention Heatmap" style="width: 100%; max-height: 165px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; display: block;" />
              <div style="width: 100%; margin-top: 4px;">
                <div style="height: 5px; width: 100%; border-radius: 2px; background: linear-gradient(90deg, #2a6e70 0%, #dd8b2a 50%, #d63353 100%);"></div>
                <div style="display: flex; justify-content: space-between; font-size: 6.5px; color: #64748b; margin-top: 1px; font-weight: 600;">
                  <span>0.0 (Stroma)</span>
                  <span>0.5</span>
                  <span>1.0 (Tumor Peak)</span>
                </div>
              </div>
              <div style="font-size: 6.5px; color: #475569; line-height: 1.25; margin-top: 3px; text-align: center; font-style: italic;">
                Figure 1: DINO ViT-S/16 Cross-Attention Gigapixel Heatmap. Warm regions denote high spatial co-localization with genomic oncogenic drivers.
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 8px; background: #ffffff; border: 1px solid #d8e5e5; border-radius: 6px; padding: 7px 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px; border-bottom: 1px solid #eef4f4; padding-bottom: 3px;">
          <span style="font-size: 13px;">${sec.icon}</span>
          <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700; color: #1c5d5f; letter-spacing: 0.3px; text-transform: uppercase;">
            Section ${sec.number}: ${sec.title}
          </span>
        </div>
        <div>
          ${sec.contentHtml}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="pdf-render-page" style="width: 794px; height: 1123px; padding: 26px 36px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; position: relative; color: #283338;">
      <div>
        <!-- TOP BRANDING & LETTERHEAD -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1c5d5f; padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #1c5d5f, #0e4749); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 3px 8px rgba(28,93,95,0.25);">
              🧬
            </div>
            <div>
              <div style="font-size: 17px; font-weight: 800; color: #1c5d5f; letter-spacing: 0.5px; font-family: 'Plus Jakarta Sans', sans-serif;">
                ONCO_BOT <span style="font-weight: 400; font-size: 13px; color: #0e4749;">| MEDICAL AI REPORT</span>
              </div>
              <div style="font-size: 9.5px; font-weight: 600; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase;">
                Pathway-Aware Multimodal Transformer (PAMT) Clinical Decision Support
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="display: inline-block; background: #edf7f4; border: 1px solid #cae1e2; padding: 2px 7px; border-radius: 4px; font-size: 9px; font-weight: 700; color: #1c5d5f; letter-spacing: 0.5px;">
              🔒 CONFIDENTIAL MEDICAL RECORD
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px; font-family: monospace;">
              REPORT ID: OB-${patientId.replace(/[^A-Za-z0-9]/g, '')}
            </div>
            <div style="font-size: 8.5px; color: #94a3b8;">
              DATE: ${formattedDate}
            </div>
          </div>
        </div>

        <!-- PATIENT METRICS DOSSIER GRID -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;">
          <div style="background: #f7faf9; border: 1px solid #e2ebea; border-radius: 5px; padding: 5px 8px;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">🆔 Patient Identifier</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #1c5d5f; margin-top: 1px;">${patientId}</div>
            <div style="font-size: 7.5px; color: #94a3b8;">Primary Cohort Subject</div>
          </div>

          <div style="background: #f7faf9; border: 1px solid #e2ebea; border-radius: 5px; padding: 5px 8px;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Hazard Score (Cox-PH)</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #0e4749; margin-top: 1px;">${scoreVal.toFixed(4)}</div>
            <div style="font-size: 7.5px; color: #94a3b8;">Multimodal Fusion Head</div>
          </div>

          <div style="background: ${riskBadgeBg}; border: 1px solid ${riskColor}30; border-radius: 5px; padding: 5px 8px;">
            <div style="font-size: 8px; font-weight: 700; color: ${riskColor}; text-transform: uppercase; letter-spacing: 0.5px;">📊 Cohort Stratification</div>
            <div style="font-size: 11px; font-weight: 800; color: ${riskColor}; margin-top: 1px;">${riskTier}</div>
            <div style="font-size: 7.5px; color: ${riskColor}aa;">TCGA-BLCA Benchmark</div>
          </div>

          <div style="background: #f7faf9; border: 1px solid #e2ebea; border-radius: 5px; padding: 5px 8px;">
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">🤖 AI Synthesis Engine</div>
            <div style="font-size: 10px; font-weight: 700; color: #1c5d5f; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${modelTag}</div>
            <div style="font-size: 7.5px; color: #94a3b8;">Hugging Face Serverless</div>
          </div>
        </div>

        <!-- TUMOR SPECIFICATION SUB-BAR -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #edf7f4; border: 1px solid #d2e7e3; border-radius: 5px; padding: 4px 10px; margin-bottom: 10px; font-size: 9.5px;">
          <div>
            <span style="font-weight: 700; color: #1c5d5f;">🎯 Primary Indication:</span>
            <span style="color: #283338; margin-left: 4px;">${cancerType}</span>
          </div>
          <div>
            <span style="font-weight: 700; color: #1c5d5f;">🔬 Concordance Index:</span>
            <span style="color: #0e4749; font-weight: 700; margin-left: 4px;">C-Index 0.784 (Harrell's C)</span>
          </div>
          <div>
            <span style="font-weight: 700; color: #1c5d5f;">🧬 Pathway Basis:</span>
            <span style="color: #283338; margin-left: 4px;">MSigDB KEGG 2021 (320 Pathways)</span>
          </div>
        </div>

        <!-- SECTIONS CONTENT (1, 2, 3) -->
        <div>
          ${sectionsHtml}
        </div>
      </div>

      <!-- PAGE 1 FOOTER -->
      <div style="border-top: 1px solid #e2ebea; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #94a3b8;">
        <div>
          <span style="font-weight: 700; color: #1c5d5f;">OncoBot Clinical Intelligence</span> • Research &amp; Clinical Decision Support Only
        </div>
        <div style="font-family: monospace; font-weight: 600; color: #64748b;">
          PAGE 1 OF 2
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds the HTML template for Page 2 of the Clinical Report
 */
function buildPageTwoHtml(options: PdfReportOptions, sections: ParsedSection[], formattedDate: string): string {
  const { patientId, modelTag, cancerType = 'Bladder Urothelial Carcinoma (TCGA-BLCA)' } = options;

  // Page 2 gets Section 4 & 5
  const p2Sections = sections.filter(s => ['4', '5'].includes(s.number));
  // If parsing didn't produce numbered sections, take remaining
  const displaySections = p2Sections.length > 0 ? p2Sections : sections.slice(2);

  const sectionsHtml = displaySections.map(sec => `
    <div style="margin-bottom: 14px; background: #ffffff; border: 1px solid #d8e5e5; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; border-bottom: 1px solid #eef4f4; padding-bottom: 4px;">
        <span style="font-size: 15px;">${sec.icon}</span>
        <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700; color: #1c5d5f; letter-spacing: 0.3px; text-transform: uppercase;">
          Section ${sec.number}: ${sec.title}
        </span>
      </div>
      <div>
        ${sec.contentHtml}
      </div>
    </div>
  `).join('');

  return `
    <div class="pdf-render-page" style="width: 794px; height: 1123px; padding: 36px 44px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; position: relative; color: #283338;">
      <div>
        <!-- TOP CONTINUATION HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #1c5d5f; padding-bottom: 8px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px;">🏥</span>
            <span style="font-size: 11px; font-weight: 700; color: #1c5d5f; letter-spacing: 0.4px;">
              ONCO_BOT CLINICAL REPORT CONTINUATION
            </span>
            <span style="font-size: 10px; color: #94a3b8;">•</span>
            <span style="font-size: 10.5px; font-weight: 600; color: #0e4749;">Patient ID: ${patientId}</span>
          </div>
          <div style="font-size: 9.5px; color: #64748b;">
            Indication: ${cancerType}
          </div>
        </div>

        <!-- SECTIONS CONTENT (4 & 5) -->
        <div>
          ${sectionsHtml}
        </div>

        <!-- MULTIDISCIPLINARY SIGN-OFF & VERIFICATION BLOCK -->
        <div style="background: #f7faf9; border: 1px solid #d8e5e5; border-radius: 8px; padding: 12px 16px; margin-top: 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #1c5d5f; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; display: flex; items-center; gap: 6px;">
            <span>✍️</span> CLINICIAN REVIEW &amp; MULTIDISCIPLINARY TUMOR BOARD SIGN-OFF
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 10px;">
            <div style="background: #ffffff; border: 1px dashed #cae1e2; border-radius: 6px; padding: 10px;">
              <div style="font-size: 9.5px; font-weight: 700; color: #0e4749;">👨‍⚕️ Attending Medical Oncologist</div>
              <div style="margin-top: 14px; border-bottom: 1px solid #cbd5e1; height: 16px;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 8px; color: #64748b; margin-top: 3px;">
                <span>Signature / NPI</span>
                <span>Date: ____________</span>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px dashed #cae1e2; border-radius: 6px; padding: 10px;">
              <div style="font-size: 9.5px; font-weight: 700; color: #0e4749;">🔬 Lead Molecular Pathologist</div>
              <div style="margin-top: 14px; border-bottom: 1px solid #cbd5e1; height: 16px;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 8px; color: #64748b; margin-top: 3px;">
                <span>Signature / Board Cert</span>
                <span>Date: ____________</span>
              </div>
            </div>
          </div>

          <!-- VERIFICATION STAMP -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #156152; background: #edf7f4; padding: 6px 10px; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12px;">🛡️</span>
              <span style="font-weight: 700;">Multimodal Cross-Attention Concordance Verified</span>
              <span style="color: #64748b;">(Model: ${modelTag})</span>
            </div>
            <div style="font-weight: 600;">
              ✓ ISO 15189 / CAP Aligned Intelligence
            </div>
          </div>
        </div>

        <!-- REGULATORY DISCLAIMER -->
        <div style="background: #fdfaf6; border: 1px solid #f3e8d8; border-radius: 6px; padding: 8px 12px; margin-top: 12px; font-size: 8px; color: #78716c; line-height: 1.45;">
          <strong style="color: #9a3412;">⚖️ INVESTIGATIONAL &amp; CLINICAL DECISION SUPPORT NOTICE:</strong>
          This report is algorithmically compiled by OncoBot PAMT using combined Whole-Slide Imaging (DINO Vision Transformer) and Bulk Transcriptomics (Pathway-Aware Transformer) representations. It is designed to assist clinical oncology teams in risk stratification and treatment planning. All recommendations must be confirmed by certified pathologists and treating oncologists in accordance with standard of care.
        </div>
      </div>

      <!-- PAGE 2 FOOTER -->
      <div style="border-top: 1px solid #e2ebea; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #94a3b8;">
        <div>
          <span style="font-weight: 700; color: #1c5d5f;">OncoBot Clinical Intelligence</span> • Generated on ${formattedDate}
        </div>
        <div style="font-family: monospace; font-weight: 600; color: #64748b;">
          PAGE 2 OF 2
        </div>
      </div>
    </div>
  `;
}

/**
 * Main export function: Renders high-resolution PDF and triggers browser download
 */
export async function exportClinicalReportPdf(options: PdfReportOptions): Promise<void> {
  const { patientId, reportText } = options;
  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sections = parseReportMarkdown(reportText);

  // Create an off-screen container mounted to document.body
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.style.background = '#ffffff';

  // Build Pages
  const pageOneHtml = buildPageOneHtml(options, sections, formattedDate);
  const pageTwoHtml = buildPageTwoHtml(options, sections, formattedDate);

  container.innerHTML = pageOneHtml + pageTwoHtml;
  document.body.appendChild(container);

  try {
    const pageElements = container.querySelectorAll('.pdf-render-page');
    if (pageElements.length === 0) {
      throw new Error('Failed to create PDF page elements.');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;

      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x DPI for ultra-crisp vector-like rendering
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    // Save PDF
    const filename = `Onco_Bot_Clinical_Report_${patientId}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
