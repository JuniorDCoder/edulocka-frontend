"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import { isAuthorizedInstitution } from "@/lib/contract";
import {
  bulkUploadCSV,
  processBatch,
  getJobStatus,
  downloadBatch,
  downloadReport,
  listTemplates,
  type BulkUploadResult,
  type JobStatus,
  type TemplateInfo,
} from "@/lib/api-client";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Play,
  Download,
  FileText,
  Mail,
  QrCode,
  Wallet,
  ArrowRight,
  RotateCcw,
  Eye,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Blocks,
  Clock,
  Zap,
  FileDown,
  ShieldAlert,
  FileCheck,
  X,
  Trophy,
} from "lucide-react";

// ── Phase labels for display ────────────────────────────────────────────────
const PHASE_LABELS: Record<string, string> = {
  starting: "Starting...",
  generating_ids: "Generating Certificate IDs",
  generating_pdfs: "Generating PDF Certificates",
  uploading_ipfs: "Uploading to IPFS",
  blockchain_issuance: "Recording on Blockchain",
  generating_qrcodes: "Generating QR Codes",
  sending_emails: "Sending Emails",
  completed: "Completed!",
};

type Step = "upload" | "preview" | "processing" | "complete";

export default function BulkPage() {
  const { wallet, connect } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload result
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);

  // Processing
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Options
  const [sendEmails, setSendEmails] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("default-certificate");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);

  // UI toggles
  const [showErrors, setShowErrors] = useState(false);
  const [showAllPreview, setShowAllPreview] = useState(false);

  // Authorization
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Load templates (institution-scoped) — just pass address, no signing needed
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await listTemplates(wallet.address || undefined);
        setTemplates(data.templates);
      } catch {
        // Templates unavailable
      }
    };
    loadTemplates();
  }, [wallet.address]);

  // Check authorization status
  useEffect(() => {
    if (!wallet.connected) return;
    const check = async () => {
      try {
        const auth = await isAuthorizedInstitution(wallet.address);
        setIsAuthorized(auth);
      } catch {
        // Network not available
      }
    };
    check();
  }, [wallet.connected, wallet.address]);

  // ── File Upload Handler ─────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      setError("Please upload a CSV or Excel (.xlsx) file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum 10MB.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await bulkUploadCSV(file);
      setUploadResult(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setIsUploading(false);
  }, []);

  // ── Process Batch ───────────────────────────────────────────────────────

  const handleProcess = useCallback(async () => {
    if (!uploadResult?.jobId) return;

    setIsProcessing(true);
    setError(null);
    setStep("processing");

    try {
      await processBatch(uploadResult.jobId, {
        templateName: selectedTemplate,
        sendEmails,
      });

      // Poll for status
      const poll = setInterval(async () => {
        try {
          const status = await getJobStatus(uploadResult.jobId);
          setJobStatus(status);

          if (status.status === "completed" || status.status === "failed") {
            clearInterval(poll);
            setIsProcessing(false);
            if (status.status === "completed") setStep("complete");
          }
        } catch {
          // Keep polling
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setIsProcessing(false);
      setStep("preview");
    }
  }, [uploadResult, selectedTemplate, sendEmails]);

  // ── Download handlers ─────────────────────────────────────────────────

  const handleDownloadZip = useCallback(async () => {
    if (!jobStatus?.jobId) return;
    try {
      const blob = await downloadBatch(jobStatus.jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edulocka-certificates-${jobStatus.jobId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }, [jobStatus]);

  const handleDownloadReport = useCallback(async () => {
    if (!jobStatus?.jobId) return;
    try {
      const blob = await downloadReport(jobStatus.jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edulocka-report-${jobStatus.jobId.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }, [jobStatus]);

  // ── Reset ─────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep("upload");
    setUploadResult(null);
    setJobStatus(null);
    setError(null);
    setIsProcessing(false);
    setSendEmails(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Not connected ─────────────────────────────────────────────────────
  if (!wallet.connected) {
    return (
      <div className="grid-pattern min-h-screen">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-32 sm:px-6 lg:px-8">
          <div className="neon-border w-full max-w-md rounded-none bg-white p-8 text-center dark:bg-gray-900">
            <div className="hexagon mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-blue-600 dark:bg-blue-500">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Wallet</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Connect your wallet to access bulk certificate issuance.
            </p>
            <button
              onClick={connect}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600"
            >
              <Wallet className="h-4 w-4" /> Connect MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">Bulk Issuance</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a CSV to issue hundreds of certificates at once
            </p>
          </div>
          <Link
            href="/issue"
            className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Issue Single →
          </Link>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-between gap-1 sm:justify-start sm:gap-2">
          {(["upload", "preview", "processing", "complete"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 sm:gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 ${
                  step === s
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : (["upload", "preview", "processing", "complete"].indexOf(step) > i)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {(["upload", "preview", "processing", "complete"].indexOf(step) > i) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  step === s ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {s === "upload" ? "Upload" : s === "preview" ? "Preview" : s === "processing" ? "Processing" : "Complete"}
              </span>
              {i < 3 && <div className="mx-1 h-px w-4 bg-gray-300 sm:mx-2 sm:w-8 dark:bg-gray-700" />}
            </div>
          ))}
        </div>

        {/* Authorization warning */}
        {isAuthorized === false && (
          <div className="mb-6 flex flex-col gap-3 rounded-none border-2 border-red-300 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-800 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  Wallet Not Authorized
                </p>
                <p className="text-xs text-red-600 dark:text-red-400/70">
                  Your wallet is not registered as an authorized institution. Bulk issuance requires authorization.
                </p>
              </div>
            </div>
            <Link
              href="/apply-institution"
              className="flex w-full items-center justify-center gap-1 rounded-sm bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 sm:w-auto"
            >
              Apply Now <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-none border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: UPLOAD */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === "upload" && (
          <div className="mx-auto max-w-2xl">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed px-8 py-16 transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-300 bg-white hover:border-blue-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-500"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Validating your file...
                  </p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Drop your CSV or Excel file here
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    or click to browse
                  </p>
                  <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                    Supports .csv, .xlsx, .xls — Max 10MB
                  </p>
                </>
              )}
            </div>

            {/* CSV format hint */}
            <div className="mt-6 rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                EXPECTED CSV FORMAT
              </h3>
              <pre className="mt-3 overflow-x-auto rounded-sm bg-gray-50 p-3 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
{`studentName,studentId,degree,institution,issueDate,email
Alice Johnson,STU-2026-001,B.S. Computer Science,MIT,2026-06-15,alice@example.com
Bob Smith,STU-2026-002,MBA,Harvard,2026-06-15,bob@example.com`}
              </pre>
              <p className="mt-2 text-xs text-gray-400">
                Column names are flexible — &quot;Student Name&quot;, &quot;student_name&quot;, &quot;name&quot;, &quot;fullName&quot; all work. Email column is optional.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: PREVIEW & VALIDATE */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === "preview" && uploadResult && (
          <div className="space-y-6">
            {/* Validation summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Rows</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{uploadResult.totalRows}</p>
                <p className="text-xs text-gray-400">{uploadResult.fileName}</p>
              </div>
              <div className="rounded-none border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Valid</p>
                <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">{uploadResult.validCount}</p>
                <p className="text-xs text-green-500">Ready to process</p>
              </div>
              <div className={`rounded-none border-2 p-4 ${
                uploadResult.invalidCount > 0
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                  : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
              }`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${
                  uploadResult.invalidCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                }`}>Invalid</p>
                <p className={`mt-1 text-2xl font-bold ${
                  uploadResult.invalidCount > 0 ? "text-red-700 dark:text-red-400" : "text-gray-400"
                }`}>{uploadResult.invalidCount}</p>
                <p className={`text-xs ${uploadResult.invalidCount > 0 ? "text-red-500" : "text-gray-400"}`}>
                  {uploadResult.invalidCount > 0 ? "Will be skipped" : "No errors"}
                </p>
              </div>
            </div>

            {/* Errors/Warnings */}
            {(uploadResult.errors.length > 0 || uploadResult.warnings.length > 0) && (
              <div className="rounded-none border-2 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="flex w-full items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      {uploadResult.errors.length} errors, {uploadResult.warnings.length} warnings
                    </span>
                  </div>
                  {showErrors ? <ChevronUp className="h-4 w-4 text-yellow-600" /> : <ChevronDown className="h-4 w-4 text-yellow-600" />}
                </button>
                {showErrors && (
                  <div className="max-h-48 overflow-y-auto border-t border-yellow-200 px-4 py-3 dark:border-yellow-800">
                    {uploadResult.errors.map((e, i) => (
                      <div key={`e-${i}`} className="flex items-start gap-2 py-1">
                        <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                        <span className="text-xs text-red-700 dark:text-red-400">
                          Row {e.row}: {e.message}
                        </span>
                      </div>
                    ))}
                    {uploadResult.warnings.map((w, i) => (
                      <div key={`w-${i}`} className="flex items-start gap-2 py-1">
                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-500" />
                        <span className="text-xs text-yellow-700 dark:text-yellow-400">
                          Row {w.row}: {w.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Data preview table */}
            <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                  <Eye className="h-3.5 w-3.5 text-blue-500" />
                  DATA PREVIEW
                </h3>
                {uploadResult.preview.length > 5 && (
                  <button
                    onClick={() => setShowAllPreview(!showAllPreview)}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {showAllPreview ? "Show less" : `Show all ${uploadResult.preview.length}`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {["#", "Student Name", "Student ID", "Degree", "Institution", "Date", "Email"].map((h) => (
                        <th key={h} className="px-4 py-2 font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(showAllPreview ? uploadResult.preview : uploadResult.preview.slice(0, 5)).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 font-mono text-gray-400">{r._row || i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.studentName}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">{r.studentId}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.degree}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.institution}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">{r.issueDate}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Options */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Template selector */}
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Certificate Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.owner === "default" ? " (Default)" : " (Custom)"}</option>
                  ))}
                </select>
                <Link
                  href="/templates"
                  className="mt-2 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Manage templates →
                </Link>
              </div>

              {/* Email toggle */}
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Email Delivery
                </label>
                <button
                  onClick={() => setSendEmails(!sendEmails)}
                  className={`flex w-full items-center gap-3 rounded-none border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    sendEmails
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/20 dark:text-blue-400"
                      : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <Mail className={`h-4 w-4 ${sendEmails ? "text-blue-500" : "text-gray-400"}`} />
                  {sendEmails ? "Emails will be sent to students" : "No emails — download only"}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  {sendEmails
                    ? "Students with email addresses will receive their certificate by email."
                    : "Certificates will be generated for download only."}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                <RotateCcw className="h-4 w-4" /> Start Over
              </button>
              <button
                onClick={handleProcess}
                disabled={uploadResult.validCount === 0 || isAuthorized === false}
                className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <Play className="h-4 w-4" />
                Process {uploadResult.validCount} Certificates
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: PROCESSING */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === "processing" && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-none border-2 border-blue-200 bg-white p-8 text-center dark:border-blue-800 dark:bg-gray-900">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Processing Certificates
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This may take a few minutes for large batches. Do not close this page.
              </p>

              {jobStatus?.progress && (
                <div className="mt-8 space-y-4">
                  {/* Phase label */}
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      {PHASE_LABELS[jobStatus.progress.phase] || jobStatus.progress.phase}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${jobStatus.progress.percent}%` }}
                    />
                  </div>

                  {/* Numbers */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{jobStatus.progress.current} / {jobStatus.progress.total}</span>
                    <span>{jobStatus.progress.percent}%</span>
                  </div>

                  {/* Succeeded / Failed */}
                  {(jobStatus.progress.succeeded !== undefined || jobStatus.progress.failed !== undefined) && (
                    <div className="flex justify-center gap-6 text-xs">
                      {jobStatus.progress.succeeded !== undefined && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" /> {jobStatus.progress.succeeded} succeeded
                        </span>
                      )}
                      {jobStatus.progress.failed !== undefined && jobStatus.progress.failed > 0 && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> {jobStatus.progress.failed} failed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pipeline stages */}
            <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="font-mono text-xs font-bold text-gray-900 dark:text-white">PIPELINE STAGES</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Object.entries(PHASE_LABELS).map(([key, label]) => {
                  if (key === "starting") return null;
                  const currentPhase = jobStatus?.progress?.phase;
                  const phases = Object.keys(PHASE_LABELS);
                  const currentIdx = phases.indexOf(currentPhase || "");
                  const thisIdx = phases.indexOf(key);
                  const isDone = thisIdx < currentIdx;
                  const isCurrent = key === currentPhase;

                  return (
                    <div key={key} className="flex items-center gap-3 px-4 py-3">
                      {isDone ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      )}
                      <span className={`text-sm ${
                        isDone ? "text-green-700 dark:text-green-400" :
                        isCurrent ? "font-medium text-blue-700 dark:text-blue-400" :
                        "text-gray-400 dark:text-gray-500"
                      }`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STEP 4: COMPLETE */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {step === "complete" && jobStatus?.summary && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="rounded-none border-2 border-green-300 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-green-800 sm:text-2xl dark:text-green-300">
                      Batch Complete!
                    </h2>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      <span className="font-bold">{jobStatus.summary.blockchainSuccess}</span> of{" "}
                      <span className="font-bold">{jobStatus.summary.total}</span> certificates successfully recorded on the blockchain.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-green-600 dark:text-green-400/80">
                      <span className="flex items-center gap-1">
                        <Blocks className="h-3 w-3" />
                        {jobStatus.summary.blockchainSuccess} on-chain
                      </span>
                      <span className="text-green-300 dark:text-green-700">&bull;</span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {jobStatus.summary.pdfsGenerated} PDFs
                      </span>
                      <span className="text-green-300 dark:text-green-700">&bull;</span>
                      <span className="flex items-center gap-1">
                        <QrCode className="h-3 w-3" />
                        {jobStatus.summary.qrCodesGenerated} QR codes
                      </span>
                      {jobStatus.summary.emailsSent > 0 && (
                        <>
                          <span className="text-green-300 dark:text-green-700">&bull;</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {jobStatus.summary.emailsSent} emails sent
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        href="/verify"
                        className="inline-flex items-center gap-1.5 rounded-sm bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Verify Certificates
                      </Link>
                      <button
                        onClick={handleDownloadZip}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-green-300 bg-white px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-900/30"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download All (ZIP)
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="flex-shrink-0 text-green-400 hover:text-green-600 dark:text-green-600 dark:hover:text-green-400"
                  title="Start new batch"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <Blocks className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Blockchain</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{jobStatus.summary.blockchainSuccess}</p>
                {jobStatus.summary.blockchainFailed > 0 && (
                  <p className="text-xs text-red-500">{jobStatus.summary.blockchainFailed} failed</p>
                )}
              </div>
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">PDFs</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{jobStatus.summary.pdfsGenerated}</p>
              </div>
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">QR Codes</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{jobStatus.summary.qrCodesGenerated}</p>
              </div>
              <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Emails</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{jobStatus.summary.emailsSent}</p>
                {jobStatus.summary.emailsFailed > 0 && (
                  <p className="text-xs text-red-500">{jobStatus.summary.emailsFailed} failed</p>
                )}
              </div>
            </div>

            {/* Results table */}
            {jobStatus.results && jobStatus.results.length > 0 && (
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                    ISSUANCE RESULTS ({jobStatus.results.length})
                  </h3>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                      <tr>
                        {["Student", "Cert ID", "Chain", "PDF", "QR", "IPFS"].map((h) => (
                          <th key={h} className="px-4 py-2 font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {jobStatus.results.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900 dark:text-white">{r.studentName}</p>
                            <p className="text-gray-400">{r.studentId}</p>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-400">{r.certId}</td>
                          <td className="px-4 py-2.5">
                            {r.blockchain.status === "success" ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" /> OK
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="h-3 w-3" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {r.pdf.status === "success" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {r.qr.status === "success" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {r.ipfs.pinned ? (
                              <span className="text-green-600 dark:text-green-400">Pinned</span>
                            ) : r.ipfs.hash ? (
                              <span className="text-yellow-600 dark:text-yellow-400">Local</span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Download buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <button
                onClick={handleDownloadZip}
                className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto dark:border-blue-500 dark:bg-blue-600"
              >
                <Download className="h-4 w-4" />
                Download All (ZIP)
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:border-blue-500 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <FileDown className="h-4 w-4" />
                Excel Report
              </button>
              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:border-blue-500 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <RotateCcw className="h-4 w-4" />
                New Batch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
