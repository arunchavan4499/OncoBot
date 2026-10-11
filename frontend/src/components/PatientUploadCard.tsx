import React, { useState, useRef } from 'react';
import { UserPlus, X, Upload, Link2, Play, CheckCircle2, AlertCircle, Folder, FlaskConical } from 'lucide-react';
import type { PatientSummary } from '../types';

export type AnalysisSource = 'demo' | 'uploaded';

export interface PatientUploadData {
  patientId: string;
  rnaFile: File | null;
  wsiFile: File | null;
  rnaDriveLink: string;
  wsiDriveLink: string;
}

interface PatientUploadCardProps {
  patients: PatientSummary[];
  selectedPatientId: string;
  analysisSource: AnalysisSource;
  hasCompletedAnalysis: boolean;
  onSelectDemo: (patientId: string) => void;
  onRunDemo: (patientId: string) => void;
  onUploadAndRun: (data: PatientUploadData) => void | Promise<void>;
  isProcessing?: boolean;
  isAnalyzing?: boolean;
}

export const PatientUploadCard: React.FC<PatientUploadCardProps> = ({
  patients,
  selectedPatientId,
  analysisSource,
  hasCompletedAnalysis,
  onSelectDemo,
  onRunDemo,
  onUploadAndRun,
  isProcessing = false,
  isAnalyzing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<AnalysisSource>('demo');
  const [demoPatientId, setDemoPatientId] = useState(selectedPatientId);
  const [rnaFile, setRnaFile] = useState<File | null>(null);
  const [wsiFile, setWsiFile] = useState<File | null>(null);
  const [rnaDriveLink, setRnaDriveLink] = useState('');
  const [wsiDriveLink, setWsiDriveLink] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const rnaInputRef = useRef<HTMLInputElement | null>(null);
  const wsiInputRef = useRef<HTMLInputElement | null>(null);

  const handleRnaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRnaFile(e.target.files[0]);
      setValidationError(null);
    }
  };

  const handleWsiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setWsiFile(e.target.files[0]);
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if at least one input source is provided
    const hasRna = rnaFile !== null || rnaDriveLink.trim().length > 0;
    const hasWsi = wsiFile !== null || wsiDriveLink.trim().length > 0;

    if (!hasRna && !hasWsi) {
      setValidationError('Please provide at least one RNA-Seq file, pathology image, or public Drive link.');
      return;
    }

    // Auto-detect patient ID from filename or link, or generate clean clinical ID
    let detectedId = 'TCGA-CUSTOM-CASE';
    if (wsiFile) {
      const name = wsiFile.name.replace(/\.[^/.]+$/, '');
      const tcgaMatch = name.match(/TCGA-[A-Z0-9]{2}-[A-Z0-9]{4}/i);
      detectedId = tcgaMatch ? tcgaMatch[0].toUpperCase() : name.slice(0, 16).toUpperCase();
    } else if (rnaFile) {
      const name = rnaFile.name.replace(/\.[^/.]+$/, '');
      detectedId = name.slice(0, 16).toUpperCase();
    } else {
      detectedId = `CUSTOM-PATIENT-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    onUploadAndRun({
      patientId: detectedId,
      rnaFile,
      wsiFile,
      rnaDriveLink,
      wsiDriveLink,
    });
  };

  return (
    <div className="w-full bg-card-mint border border-deep-teal/20 rounded-[24px] p-5 lg:px-6 lg:py-6 shadow-sm transition-all box-border text-left relative">
      {/* Top Header Row with Cancel Button */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isExpanded ? 'mb-5 pb-5 border-b border-charcoal-navy/10' : 'mb-0'}`}>
        <div className="flex-1">
          <span className="font-mono text-[10px] font-semibold text-deep-teal tracking-wider uppercase block mb-1">
            PATIENT COHORT SELECTION
          </span>
          <h2 className="font-serif text-[22px] md:text-[26px] font-normal text-charcoal-navy tracking-tight leading-tight">
            Select a Cohort or Add a Patient
          </h2>
          <p className="font-sans text-[12px] text-[#4a5e5d] leading-relaxed max-w-[800px] mt-2 mb-0">
            Execution maps RNA-seq pathways, extracts 1,024 WSI patch tokens with DINO ViT-S/16, and computes cross-attention matrices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className={`${isExpanded ? '' : 'premium-teal-pulse'} bg-[#1c5d5f] hover:bg-[#156152] text-white border border-[#1c5d5f] rounded-full min-w-[150px] sm:min-w-[175px] px-4 py-3 flex items-center justify-center gap-2.5 transition-all cursor-pointer shrink-0 self-center sm:self-auto`}
          aria-expanded={isExpanded}
          aria-controls="patient-cohort-card-content"
          aria-label={isExpanded ? 'Close patient form' : 'Add new patient'}
          title={isExpanded ? 'Close patient form' : 'Add new patient'}
        >
          {isExpanded ? (
            <>
              <X className="w-4 h-4" aria-hidden="true" />
              <span className="font-sans text-[13px] font-semibold leading-tight">Close Form</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span className="font-sans text-[13px] font-semibold leading-tight text-center">
                Add Patient
              </span>
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div id="patient-cohort-card-content">
      {/* Demo and uploaded-patient paths are intentionally separate. */}
      <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-deep-teal/20 bg-paper-white p-1">
        <button
          type="button"
          onClick={() => setMode('demo')}
          className={`rounded-full px-4 py-2 font-mono text-[11px] font-semibold tracking-wider transition-colors cursor-pointer border-none flex items-center gap-2 ${
            mode === 'demo' ? 'bg-deep-teal text-white' : 'bg-transparent text-deep-teal hover:bg-sea-foam'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          DEMO TEST
        </button>
        <button
          type="button"
          onClick={() => setMode('uploaded')}
          className={`rounded-full px-4 py-2 font-mono text-[11px] font-semibold tracking-wider transition-colors cursor-pointer border-none flex items-center gap-2 ${
            mode === 'uploaded' ? 'bg-deep-teal text-white' : 'bg-transparent text-deep-teal hover:bg-sea-foam'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          UPLOAD PATIENT
        </button>
      </div>

      {mode === 'demo' ? (
        <div className="rounded-2xl border border-deep-teal/15 bg-paper-white p-4 mb-1">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] font-semibold text-deep-teal tracking-wider uppercase block mb-1">
                Bundled validation cases
              </span>
              <p className="font-sans text-[12px] text-[#4a5e5d] m-0">
                Choose a bundled subject, then run its preconfigured demo analysis.
              </p>
            </div>
            <div className="w-full lg:w-auto bg-card-mint border border-deep-teal/25 rounded-full px-4 py-2 flex items-center gap-2.5 transition-all shadow-none">
          <span className="font-mono text-[12px] font-semibold text-deep-teal tracking-wider whitespace-nowrap">
            SUBJECT :
          </span>
          <select
            id="patient-select"
            value={demoPatientId}
            onChange={(event) => {
              setDemoPatientId(event.target.value);
              onSelectDemo(event.target.value);
            }}
            className="min-w-0 flex-1 bg-transparent border-none text-charcoal-navy font-sans text-[14px] font-medium outline-none cursor-pointer pr-1"
          >
            {patients.map((patient) => (
              <option key={patient.patient_id} value={patient.patient_id}>
                {patient.label}
              </option>
            ))}
          </select>
          <Folder className="w-4 h-4 text-deep-teal shrink-0" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-deep-teal/10 pt-3">
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${hasCompletedAnalysis ? 'text-deep-teal' : 'text-charcoal-navy/50'}`}>
              {isAnalyzing
                ? 'Analysis in progress'
                : hasCompletedAnalysis
                  ? analysisSource === 'demo' ? 'Current results: Demo subject' : 'Current results: Uploaded patient'
                  : 'No results yet — run analysis'}
            </span>
            <button
              type="button"
              onClick={() => onRunDemo(demoPatientId)}
              disabled={isAnalyzing}
              className="bg-deep-teal hover:bg-forest-floor disabled:opacity-70 text-white font-sans text-[13px] font-semibold px-5 py-2 rounded-full flex items-center gap-2 transition-colors cursor-pointer border-none"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isAnalyzing && analysisSource === 'demo' ? 'Running Demo...' : 'Run Demo Analysis'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-deep-teal/15 bg-paper-white px-4 py-3">
            <div>
              <span className="font-mono text-[11px] font-semibold text-deep-teal tracking-wider uppercase block">Uploaded patient analysis</span>
              <span className="font-sans text-[12px] text-[#4a5e5d]">Files or Drive links are submitted as a new patient case and do not use a demo subject.</span>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase ${analysisSource === 'uploaded' ? 'bg-deep-teal text-white' : 'bg-sea-foam text-deep-teal'}`}>
              {analysisSource === 'uploaded' ? 'Active source' : 'New source'}
            </span>
          </div>

          {/* Validation Alert */}
          {validationError && (
        <div className="mb-4 bg-[#fde8e8] border border-[#f8b4b4] text-[#9b1c1c] text-[12px] font-medium px-4 py-2 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
          )}

      {/* Two-Column Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Column 1: RNA-SEQ COUNTS */}
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-semibold text-charcoal-navy/70 tracking-wider uppercase mb-2">
              RNA-SEQ GENE COUNTS (.tsv, .csv)
            </span>

            {/* File Upload Box */}
            <div
              onClick={() => rnaInputRef.current?.click()}
              className="bg-white border border-charcoal-navy/20 hover:border-deep-teal rounded-xl px-4 py-4 flex items-center gap-2.5 cursor-pointer transition-colors shadow-none"
            >
              <Upload className="w-4 h-4 text-deep-teal shrink-0" />
              <span className="font-sans text-[13px] text-charcoal-navy truncate">
                {rnaFile ? (
                  <span className="font-semibold text-deep-teal flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-deep-teal inline" />
                    {rnaFile.name} ({(rnaFile.size / 1024).toFixed(0)} KB)
                  </span>
                ) : (
                  'Choose TSV or CSV gene count file'
                )}
              </span>
              <input
                ref={rnaInputRef}
                type="file"
                accept=".tsv,.csv,.txt"
                onChange={handleRnaChange}
                className="hidden"
              />
            </div>

            {/* Divider */}
            <div className="flex items-center my-3 gap-3">
              <div className="flex-1 h-[1px] bg-charcoal-navy/10" />
              <span className="font-mono text-[10px] font-semibold text-charcoal-navy/40 uppercase tracking-widest">
                OR GOOGLE DRIVE
              </span>
              <div className="flex-1 h-[1px] bg-charcoal-navy/10" />
            </div>

            {/* Google Drive Link Input */}
            <div className="bg-white border border-charcoal-navy/20 focus-within:border-deep-teal rounded-xl px-4 py-3.5 flex items-center gap-2.5 transition-colors shadow-none">
              <Link2 className="w-4 h-4 text-deep-teal shrink-0" />
              <input
                type="text"
                value={rnaDriveLink}
                onChange={(e) => {
                  setRnaDriveLink(e.target.value);
                  setValidationError(null);
                }}
                placeholder="RNA-seq CSV/TSV Drive link"
                className="bg-transparent border-none outline-none font-sans text-[13px] text-charcoal-navy placeholder:text-charcoal-navy/40 w-full"
              />
            </div>
          </div>

          {/* Column 2: WHOLE-SLIDE IMAGE (SVS) */}
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-semibold text-charcoal-navy/70 tracking-wider uppercase mb-2">
              WHOLE-SLIDE HISTOLOGY (.svs)
            </span>

            {/* File Upload Box */}
            <div
              onClick={() => wsiInputRef.current?.click()}
              className="bg-white border border-charcoal-navy/20 hover:border-deep-teal rounded-xl px-4 py-4 flex items-center gap-2.5 cursor-pointer transition-colors shadow-none"
            >
              <Upload className="w-4 h-4 text-deep-teal shrink-0" />
              <span className="font-sans text-[13px] text-charcoal-navy truncate">
                {wsiFile ? (
                  <span className="font-semibold text-deep-teal flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-deep-teal inline" />
                    {wsiFile.name} ({(wsiFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                ) : (
                  'Choose SVS digital slide (.svs)'
                )}
              </span>
              <input
                ref={wsiInputRef}
                type="file"
                accept=".svs,.tif,.tiff,.ndpi,.mrxs,.png,.jpg,.jpeg"
                onChange={handleWsiChange}
                className="hidden"
              />
            </div>

            {/* Divider */}
            <div className="flex items-center my-3 gap-3">
              <div className="flex-1 h-[1px] bg-charcoal-navy/10" />
              <span className="font-mono text-[10px] font-semibold text-charcoal-navy/40 uppercase tracking-widest">
                OR GOOGLE DRIVE
              </span>
              <div className="flex-1 h-[1px] bg-charcoal-navy/10" />
            </div>

            {/* Google Drive Link Input */}
            <div className="bg-white border border-charcoal-navy/20 focus-within:border-deep-teal rounded-xl px-4 py-3.5 flex items-center gap-2.5 transition-colors shadow-none">
              <Link2 className="w-4 h-4 text-deep-teal shrink-0" />
              <input
                type="text"
                value={wsiDriveLink}
                onChange={(e) => {
                  setWsiDriveLink(e.target.value);
                  setValidationError(null);
                }}
                placeholder="Paste SVS Google Drive link here"
                className="bg-transparent border-none outline-none font-sans text-[13px] text-charcoal-navy placeholder:text-charcoal-navy/40 w-full"
              />
            </div>
          </div>
        </div>

        {/* Footer Note & Upload CTA Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-charcoal-navy/10">
          <p className="font-sans text-[11px] text-[#4a5e5d] max-w-[620px] leading-relaxed">
            Patient ID is detected automatically from the .svs slide filename and mapped to paired RNA-seq gene counts. OncoBot extracts 1,024 DINO ViT-S/16 tissue tokens and projects transcriptomic counts through 320 KEGG biological pathways for Cross-Attention fusion.
          </p>

          <button
            type="submit"
            disabled={isProcessing}
            className="bg-deep-teal hover:bg-forest-floor disabled:opacity-70 text-white font-sans text-[14px] font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 transition-colors cursor-pointer border-none shadow-none shrink-0 self-start sm:self-auto active:scale-[0.99]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isProcessing ? 'Processing Case...' : 'Upload & Run Analysis'}</span>
          </button>
        </div>
        </form>
      )}
        </div>
      )}
    </div>
  );
};
