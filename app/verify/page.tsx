"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getCertificateById, getCertificateByTxHash, getCertificatesByWallet } from "@/lib/contract";
import {
  ApiError,
  getCertificatePdfUrl,
  verifyCertificateDocumentFile,
  type DocumentVerificationResult,
} from "@/lib/api-client";
import { Certificate } from "@/lib/types";
import { HashDisplay } from "@/components/hash-display";
import { InstitutionBadge } from "@/components/institution-badge";
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  QrCode,
  FileText,
  Hash,
  Wallet,
  Download,
  Upload,
  AlertTriangle,
  ChevronDown,
  FileUp,
  ArrowRight,
} from "lucide-react";

type DocumentVerifyError = {
  kind: "input" | "not_found" | "no_ipfs_hash" | "ipfs_unreachable" | "generic";
  title: string;
  message: string;
  nextStep: string;
  certId?: string;
  uploadedSha256?: string;
};

type VerifyFileErrorPayload = {
  certId?: string;
  lookup?: "certId" | "documentHash";
  message?: string;
  error?: string;
  uploaded?: { sha256?: string };
};

function getIpfsUrl(ipfsHash?: string | null) {
  return ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : null;
}

function getVerifyPageUrl(certId: string, fallbackUrl?: string) {
  if (fallbackUrl) return fallbackUrl;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/verify?certId=${encodeURIComponent(certId)}`;
}

function formatDate(value: string | number) {
  if (typeof value === "number") {
    return new Date(value * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ── Drag-and-drop PDF zone ──────────────────────────────────────────────────

function PdfDropZone({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") onChange(dropped);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-none border-2 border-dashed px-6 py-10 transition-colors ${
        dragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          : file
          ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
          : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-blue-500"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        disabled={disabled}
      />
      {file ? (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-green-100 dark:bg-green-950/40">
            <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">{file.name}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {(file.size / 1024).toFixed(1)} KB · Click to change
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-none bg-blue-100 dark:bg-blue-950/40">
            <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Drop your certificate PDF here
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              or click to browse your files
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main verify content ─────────────────────────────────────────────────────

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const initialCertId = searchParams.get("certId")?.trim() || "";

  const [activeTab, setActiveTab] = useState<"pdf" | "id">("pdf");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchType, setSearchType] = useState<"cert" | "tx" | "wallet">("cert");

  // PDF upload state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentCertId, setDocumentCertId] = useState(initialCertId);
  const [isVerifyingDocument, setIsVerifyingDocument] = useState(false);
  const [documentVerifyResult, setDocumentVerifyResult] = useState<DocumentVerificationResult | null>(null);
  const [documentVerifyError, setDocumentVerifyError] = useState<DocumentVerifyError | null>(null);

  // ID / hash search state
  const [searchQuery, setSearchQuery] = useState(initialCertId);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<Certificate | null>(null);
  const [results, setResults] = useState<Certificate[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const lastAutoSearchRef = useRef<string | null>(null);

  const clearSearchOutcome = useCallback(() => {
    setResult(null); setResults([]); setNotFound(false);
    setErrorMsg(null); setPdfUrl(null);
  }, []);

  const clearDocumentOutcome = useCallback(() => {
    setDocumentVerifyError(null); setDocumentVerifyResult(null);
  }, []);

  const doSearch = useCallback(async (query: string, type: "cert" | "tx" | "wallet") => {
    if (!query.trim()) return;
    clearDocumentOutcome();
    setIsSearching(true);
    clearSearchOutcome();
    try {
      if (type === "cert") {
        const cert = await getCertificateById(query.trim());
        if (cert) { setResult(cert); try { setPdfUrl(getCertificatePdfUrl(cert.certId)); } catch { /* optional */ } }
        else setNotFound(true);
      } else if (type === "tx") {
        const cert = await getCertificateByTxHash(query.trim());
        if (cert) setResult(cert);
        else setNotFound(true);
      } else {
        const certs = await getCertificatesByWallet(query.trim());
        if (certs.length > 0) { setResults(certs); setResult(certs[0]); }
        else setNotFound(true);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      setNotFound(true);
    }
    setIsSearching(false);
  }, [clearDocumentOutcome, clearSearchOutcome]);

  // Auto-verify from URL
  useEffect(() => {
    const certId = searchParams.get("certId")?.trim();
    if (!certId || lastAutoSearchRef.current === certId) return;
    lastAutoSearchRef.current = certId;
    setActiveTab("id");
    const timer = setTimeout(() => {
      setSearchQuery(certId);
      void doSearch(certId, "cert");
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, doSearch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSearch(searchQuery, searchType);
  };

  const handleDocumentVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearSearchOutcome();
    clearDocumentOutcome();
    if (!documentFile) {
      setDocumentVerifyError({ kind: "input", title: "Please select a PDF first", message: "Drop or choose a certificate PDF to check.", nextStep: "Select a PDF file and try again." });
      return;
    }
    const certId = (documentCertId.trim() || result?.certId || "").trim();
    setIsVerifyingDocument(true);
    try {
      const verification = await verifyCertificateDocumentFile(certId || null, documentFile);
      setDocumentVerifyResult(verification);
      setDocumentCertId(verification.certId);
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = (typeof err.data === "object" && err.data !== null ? err.data : {}) as VerifyFileErrorPayload;
        const resolvedCertId = payload.certId || certId;
        const lookup = payload.lookup || (certId ? "certId" : "documentHash");
        const uploadedSha256 = payload.uploaded?.sha256;
        const baseMessage = payload.message || payload.error || err.message || "Verification could not be completed.";

        if (err.status === 404) {
          setDocumentVerifyError({
            kind: "not_found",
            title: lookup === "documentHash"
              ? "This PDF doesn't match any certificate in our records"
              : "Certificate not found",
            message: lookup === "documentHash"
              ? "We searched all our records but couldn't find a certificate matching this PDF. This document may be a fake, or was not issued through Edulocka."
              : `We couldn't find certificate "${resolvedCertId}". Double-check the ID or ask the issuer to confirm.`,
            nextStep: "Ask the issuer for the original certificate, QR code, or certificate ID.",
            certId: resolvedCertId, uploadedSha256,
          });
        } else if (err.status === 409) {
          setDocumentVerifyError({
            kind: "no_ipfs_hash",
            title: "Certificate found, but file comparison not available",
            message: `We found certificate "${resolvedCertId}" in our records, but it was issued without a stored file reference, so we cannot compare your PDF to the original.`,
            nextStep: "Contact the issuing institution to confirm this certificate.",
            certId: resolvedCertId,
          });
        } else if (err.status === 502) {
          setDocumentVerifyError({
            kind: "ipfs_unreachable",
            title: "Couldn't reach the original file right now",
            message: "We found this certificate, but our connection to the stored original file is temporarily unavailable.",
            nextStep: "Please try again in a few minutes.",
            certId: resolvedCertId, uploadedSha256,
          });
        } else {
          setDocumentVerifyError({ kind: "generic", title: "Verification failed", message: baseMessage, nextStep: "Try again. If this keeps happening, contact support.", certId: resolvedCertId, uploadedSha256 });
        }
      } else {
        setDocumentVerifyError({ kind: "generic", title: "Verification failed", message: err instanceof Error ? err.message : "File verification failed", nextStep: "Try again.", certId: certId || undefined });
      }
    } finally {
      setIsVerifyingDocument(false);
    }
  };

  const documentVerdict = documentVerifyResult
    ? documentVerifyResult.verified
      ? { tone: "success" as const, title: "Authentic certificate confirmed", message: "The PDF you uploaded matches the original certificate on file.", nextStep: "You can trust and accept this certificate." }
      : documentVerifyResult.match.sha256
      ? { tone: "warning" as const, title: "File matches, but certificate is no longer active", message: "The PDF is the original file, but this certificate has been marked as inactive.", nextStep: "Contact the issuing institution before accepting it." }
      : { tone: "danger" as const, title: "This PDF doesn't match the official certificate", message: "A certificate with this ID exists, but the file you uploaded is different from the official version.", nextStep: "Treat this document with caution and request the original from the institution." }
    : null;

  const resultStatusCopy = result
    ? result.status === "verified"
      ? { title: "Certificate is valid", message: "This credential was found in our records and is currently active.", nextStep: "Review the details below to confirm the recipient and institution." }
      : result.status === "pending"
      ? { title: "Certificate is pending", message: "This credential was found but hasn't been fully confirmed yet.", nextStep: "Check back later or contact the issuing institution." }
      : { title: "Certificate is no longer valid", message: "This credential exists in our records but has been revoked.", nextStep: "Do not accept this certificate — contact the institution to understand why." }
    : null;

  const verdictColors = (tone: "success" | "warning" | "danger" | null) =>
    tone === "success"
      ? { container: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20", title: "text-green-700 dark:text-green-400", icon: CheckCircle, iconClass: "text-green-500" }
      : tone === "warning"
      ? { container: "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20", title: "text-yellow-800 dark:text-yellow-300", icon: AlertTriangle, iconClass: "text-yellow-500" }
      : { container: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20", title: "text-red-700 dark:text-red-400", icon: XCircle, iconClass: "text-red-500" };

  const docVerdictColors = documentVerdict ? verdictColors(documentVerdict.tone) : null;
  const docErrorColors = documentVerifyError
    ? verdictColors(documentVerifyError.kind === "ipfs_unreachable" || documentVerifyError.kind === "no_ipfs_hash" ? "warning" : "danger")
    : null;

  const advancedSearchLabels = {
    cert: { label: "Certificate ID", icon: FileText, placeholder: "e.g. CERT-2026-001" },
    tx: { label: "Transaction Hash", icon: Hash, placeholder: "e.g. 0x8a3f7b2c…" },
    wallet: { label: "Issuer Wallet Address", icon: Wallet, placeholder: "e.g. 0x742d35Cc…" },
  };

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">

        {/* Page header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-none bg-blue-600 dark:bg-blue-500">
            <CheckCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Verify a Certificate
          </h1>
          <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
            Check whether a certificate is real and was officially issued by an authorized institution.
          </p>
        </div>

        {/* Main verification card */}
        <div className="overflow-hidden rounded-none border-2 border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">

          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setActiveTab("pdf"); clearSearchOutcome(); clearDocumentOutcome(); }}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-colors ${
                activeTab === "pdf"
                  ? "border-b-2 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <FileUp className="h-4 w-4" />
              Upload PDF
            </button>
            <button
              onClick={() => { setActiveTab("id"); clearSearchOutcome(); clearDocumentOutcome(); }}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-colors ${
                activeTab === "id"
                  ? "border-b-2 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <Search className="h-4 w-4" />
              Enter Certificate ID
            </button>
          </div>

          {/* PDF tab */}
          {activeTab === "pdf" && (
            <form onSubmit={handleDocumentVerify} className="p-6">
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Upload the certificate PDF you received. We'll compare it against the official copy to confirm it's genuine.
              </p>

              <PdfDropZone file={documentFile} onChange={setDocumentFile} disabled={isVerifyingDocument} />

              {/* Optional cert ID */}
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Certificate ID <span className="font-normal text-gray-400">(optional — helps if you know it)</span>
                </label>
                <input
                  type="text"
                  value={documentCertId}
                  onChange={(e) => setDocumentCertId(e.target.value)}
                  placeholder="e.g. CERT-2026-001"
                  className="w-full rounded-none border border-gray-300 bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  disabled={isVerifyingDocument}
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingDocument || !documentFile}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isVerifyingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isVerifyingDocument ? "Checking…" : "Verify This Certificate"}
              </button>
            </form>
          )}

          {/* ID search tab */}
          {activeTab === "id" && (
            <form onSubmit={handleSearch} className="p-6">
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Enter the Certificate ID from your certificate document or the QR code you received.
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={advancedSearchLabels[searchType].placeholder}
                    autoFocus={!initialCertId}
                    className="w-full rounded-none border-2 border-gray-200 bg-gray-50 py-3 pl-10 pr-4 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="flex items-center gap-2 rounded-none bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Check
                </button>
              </div>

              {/* Advanced search */}
              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  Advanced search options
                </button>
                {showAdvanced && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["cert", "tx", "wallet"] as const).map((type) => {
                      const t = advancedSearchLabels[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setSearchType(type); setSearchQuery(""); clearSearchOutcome(); }}
                          className={`flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition-colors ${
                            searchType === type
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                              : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          }`}
                        >
                          <t.icon className="h-3 w-3" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ── Results ── */}

        {/* Loading */}
        {(isSearching || isVerifyingDocument) && (
          <div className="mt-8 flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isVerifyingDocument ? "Comparing your file to the official record…" : "Checking certificate records…"}
            </p>
          </div>
        )}

        {/* PDF verify error */}
        {documentVerifyError && docErrorColors && !isVerifyingDocument && (
          <div className={`mt-6 rounded-none border-2 p-5 ${docErrorColors.container}`}>
            <div className="flex items-start gap-3">
              <docErrorColors.icon className={`mt-0.5 h-5 w-5 shrink-0 ${docErrorColors.iconClass}`} />
              <div className="min-w-0">
                <h4 className={`font-bold ${docErrorColors.title}`}>{documentVerifyError.title}</h4>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{documentVerifyError.message}</p>
                <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  What to do: {documentVerifyError.nextStep}
                </p>
                {(documentVerifyError.certId || documentVerifyError.uploadedSha256) && (
                  <details className="mt-3 rounded-none border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400">Technical details</summary>
                    <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {documentVerifyError.certId && <p>Certificate ID: <span className="font-mono">{documentVerifyError.certId}</span></p>}
                      {documentVerifyError.uploadedSha256 && <HashDisplay hash={documentVerifyError.uploadedSha256} label="Uploaded file SHA-256" truncate={false} className="text-[11px]" />}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PDF verify success/fail */}
        {documentVerifyResult && documentVerdict && docVerdictColors && !isVerifyingDocument && (
          <div className={`mt-6 rounded-none border-2 p-5 ${docVerdictColors.container}`}>
            <div className="flex items-start gap-3">
              <docVerdictColors.icon className={`mt-0.5 h-5 w-5 shrink-0 ${docVerdictColors.iconClass}`} />
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${docVerdictColors.title}`}>{documentVerdict.title}</h4>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{documentVerdict.message}</p>
                <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  What to do: {documentVerdict.nextStep}
                </p>

                <div className="mt-4 grid gap-4 rounded-none border border-gray-200 bg-white/70 p-4 dark:border-gray-700 dark:bg-gray-900/40 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5 text-sm">
                    <p className="font-bold text-gray-900 dark:text-white">{documentVerifyResult.certificate.studentName}</p>
                    <p className="text-gray-600 dark:text-gray-300">{documentVerifyResult.certificate.degree}</p>
                    <p className="text-gray-500 dark:text-gray-400">Issued by <span className="font-medium text-gray-700 dark:text-gray-300">{documentVerifyResult.certificate.institution}</span></p>
                    <p className="text-gray-500 dark:text-gray-400">Issued on <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(documentVerifyResult.certificate.issueDate)}</span></p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-gray-200 bg-white p-1 dark:border-gray-600">
                      <QRCodeSVG value={getVerifyPageUrl(documentVerifyResult.certId, documentVerifyResult.verifyUrl)} size={68} level="M" bgColor="#ffffff" fgColor="#111827" />
                    </div>
                    <span className="text-center text-[10px] text-gray-400">Scan to share</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {getIpfsUrl(documentVerifyResult.ipfs.hash) && (
                    <a href={getIpfsUrl(documentVerifyResult.ipfs.hash) || undefined} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-none bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                      <ExternalLink className="h-3.5 w-3.5" />View Original File
                    </a>
                  )}
                  <a href={getVerifyPageUrl(documentVerifyResult.certId, documentVerifyResult.verifyUrl)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <QrCode className="h-3.5 w-3.5" />Open Verification Link
                  </a>
                </div>

                <details className="mt-3 rounded-none border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400">Technical details</summary>
                  <div className="mt-2 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <p>File match: {documentVerifyResult.match.sha256 ? "✓ Files are identical" : "✗ Files differ"}</p>
                    <HashDisplay hash={documentVerifyResult.uploaded.sha256} label="Your file (SHA-256)" truncate={false} className="text-[11px]" />
                    <HashDisplay hash={documentVerifyResult.ipfs.sha256} label="Official file (SHA-256)" truncate={false} className="text-[11px]" />
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Not found */}
        {notFound && !isSearching && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-none border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/20">
            <XCircle className="h-10 w-10 text-red-400" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Certificate Not Found</h3>
            <p className="max-w-sm text-sm text-red-600/80 dark:text-red-400/70">
              {errorMsg || `We couldn't find a certificate matching "${searchQuery}". Please double-check the ID or ask the issuer to share the QR code or verification link.`}
            </p>
          </div>
        )}

        {/* Multiple results picker */}
        {results.length > 1 && !isSearching && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
              {results.length} certificates found — select one to view:
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((cert) => (
                <button key={cert.certId} onClick={() => { setResult(cert); try { setPdfUrl(getCertificatePdfUrl(cert.certId)); } catch { /* */ } }}
                  className={`flex flex-col gap-1 rounded-none border-2 p-3 text-left transition-colors ${result?.certId === cert.certId ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20" : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"}`}>
                  <code className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{cert.certId}</code>
                  <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{cert.studentName}</p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{cert.degree}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single result */}
        {result && !isSearching && (
          <div className="mt-6">
            {/* Status banner */}
            <div className={`flex items-start gap-3 rounded-none border-2 p-4 ${
              result.status === "verified" ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
              : result.status === "pending" ? "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
              : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"}`}>
              {result.status === "verified" ? <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-green-500" />
                : result.status === "pending" ? <Clock className="mt-0.5 h-6 w-6 shrink-0 text-yellow-500" />
                : <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />}
              <div>
                <h3 className={`text-lg font-bold ${result.status === "verified" ? "text-green-700 dark:text-green-400" : result.status === "pending" ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"}`}>
                  {resultStatusCopy?.title}
                </h3>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{resultStatusCopy?.message}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{resultStatusCopy?.nextStep}</p>
              </div>
            </div>

            {/* Details card */}
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Certificate Details
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: "Recipient", value: result.studentName },
                    { label: "Credential", value: result.degree },
                    { label: "Issued by", value: result.institution },
                    { label: "Issue date", value: formatDate(result.issueDate) },
                    { label: "Certificate ID", value: result.certId, mono: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{row.label}</span>
                      <span className={`text-right text-sm text-gray-900 dark:text-white ${(row as { mono?: boolean }).mono ? "font-mono" : ""}`}>{row.value}</span>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {getIpfsUrl(result.ipfsHash) && (
                      <a href={getIpfsUrl(result.ipfsHash) || undefined} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-none bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 dark:bg-blue-500">
                        <ExternalLink className="h-3.5 w-3.5" />View Original File
                      </a>
                    )}
                    {pdfUrl && (
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        <Download className="h-3.5 w-3.5" />Download PDF
                      </a>
                    )}
                  </div>

                  <details className="px-4 py-3">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                      Technical details (blockchain)
                    </summary>
                    <div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-between gap-3">
                        <span>Issuer address</span>
                        <div className="flex items-center gap-2">
                          <HashDisplay hash={result.studentWallet} />
                          <InstitutionBadge address={result.studentWallet} compact />
                        </div>
                      </div>
                      {result.txHash && (
                        <div className="flex items-center justify-between gap-3">
                          <span>Transaction</span>
                          <HashDisplay hash={result.txHash} etherscanLink />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span>Block number</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">#{result.blockNumber.toLocaleString()}</span>
                      </div>
                      {result.ipfsHash && (
                        <div className="flex items-center justify-between gap-3">
                          <span>File reference (IPFS)</span>
                          <HashDisplay hash={result.ipfsHash} />
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center gap-3 rounded-none border-2 border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex h-40 w-40 items-center justify-center rounded-sm border-2 border-gray-200 bg-white p-2 dark:border-gray-600">
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?certId=${encodeURIComponent(result.certId)}`}
                    size={128} level="M" bgColor="#ffffff" fgColor="#111827"
                  />
                </div>
                <p className="max-w-[10rem] text-center text-xs text-gray-500 dark:text-gray-400">Scan to share this verification</p>
                <a href={getVerifyPageUrl(result.certId)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-none border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <QrCode className="h-3 w-3" />Copy link
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 rounded-none border-2 border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading…</span>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyPageFallback />}>
      <VerifyPageContent />
    </Suspense>
  );
}
