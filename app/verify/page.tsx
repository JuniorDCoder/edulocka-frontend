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
  uploaded?: {
    sha256?: string;
  };
};

function getIpfsUrl(ipfsHash?: string | null) {
  return ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : null;
}

function getVerifyPageUrl(certId: string, fallbackUrl?: string) {
  if (fallbackUrl) return fallbackUrl;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/verify?certId=${encodeURIComponent(certId)}`;
}

function formatCertificateDate(value: string | number) {
  if (typeof value === "number") {
    return new Date(value * 1000).toLocaleDateString();
  }

  return value;
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const initialCertId = searchParams.get("certId")?.trim() || "";
  const [searchQuery, setSearchQuery] = useState(initialCertId);
  const [searchType, setSearchType] = useState<"cert" | "tx" | "wallet">("cert");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<Certificate | null>(null);
  const [results, setResults] = useState<Certificate[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentCertId, setDocumentCertId] = useState(initialCertId);
  const [isVerifyingDocument, setIsVerifyingDocument] = useState(false);
  const [documentVerifyResult, setDocumentVerifyResult] = useState<DocumentVerificationResult | null>(null);
  const [documentVerifyError, setDocumentVerifyError] = useState<DocumentVerifyError | null>(null);
  const lastAutoSearchRef = useRef<string | null>(null);
  const clearSearchOutcome = useCallback(() => {
    setResult(null);
    setResults([]);
    setNotFound(false);
    setErrorMsg(null);
    setPdfUrl(null);
  }, []);
  const clearDocumentOutcome = useCallback(() => {
    setDocumentVerifyError(null);
    setDocumentVerifyResult(null);
  }, []);

  const doSearch = useCallback(async (query: string, type: "cert" | "tx" | "wallet") => {
    if (!query.trim()) return;

    clearDocumentOutcome();
    setIsSearching(true);
    clearSearchOutcome();

    try {
      if (type === "cert") {
        const cert = await getCertificateById(query.trim());
        if (cert) {
          setResult(cert);
          // Try to check if backend has a PDF available
          try {
            setPdfUrl(getCertificatePdfUrl(cert.certId));
          } catch { /* optional */ }
        } else {
          setNotFound(true);
        }
      } else if (type === "tx") {
        const cert = await getCertificateByTxHash(query.trim());
        if (cert) {
          setResult(cert);
        } else {
          setNotFound(true);
        }
      } else if (type === "wallet") {
        const certs = await getCertificatesByWallet(query.trim());
        if (certs.length > 0) {
          setResults(certs);
          setResult(certs[0]);
        } else {
          setNotFound(true);
        }
      }
    } catch (err: unknown) {
      console.error("Search error:", err);
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during search.");
      setNotFound(true);
    }

    setIsSearching(false);
  }, [clearDocumentOutcome, clearSearchOutcome]);

  // Auto-verify from URL: /verify?certId=CERT-2026-001
  useEffect(() => {
    const certId = searchParams.get("certId")?.trim();
    if (!certId || lastAutoSearchRef.current === certId) return;

    lastAutoSearchRef.current = certId;
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
      setDocumentVerifyError({
        kind: "input",
        title: "Upload Needed",
        message: "Please upload a PDF certificate document first.",
        nextStep: "Select a PDF file and run verification again.",
      });
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
        const payload = (typeof err.data === "object" && err.data !== null
          ? err.data
          : {}) as VerifyFileErrorPayload;
        const resolvedCertId = payload.certId || certId;
        const lookup = payload.lookup || (certId ? "certId" : "documentHash");
        const uploadedSha256 =
          payload.uploaded && typeof payload.uploaded.sha256 === "string"
            ? payload.uploaded.sha256
            : undefined;
        const baseMessage =
          payload.message ||
          payload.error ||
          err.message ||
          "The backend could not complete this verification.";

        if (err.status === 404) {
          setDocumentVerifyError({
            kind: "not_found",
            title:
              lookup === "documentHash"
                ? "Potential Fake: Uploaded PDF Not Found In Edulocka Records"
                : "Potential Fake: Certificate ID Not Found On-Chain",
            message:
              lookup === "documentHash"
                ? "No issued Edulocka certificate has a stored SHA-256 document hash matching this uploaded PDF."
                : `Certificate "${resolvedCertId}" does not exist in Edulocka blockchain records. This uploaded document is likely fake, unregistered, or linked to a different ID.`,
            nextStep:
              lookup === "documentHash"
                ? "Ask the issuer for the original certificate, certificate ID, or QR verification link."
                : "Ask the issuer for the exact certificate ID or verify using the QR code on the original document.",
            certId: resolvedCertId,
            uploadedSha256,
          });
        } else if (err.status === 409) {
          setDocumentVerifyError({
            kind: "no_ipfs_hash",
            title: "Verification Incomplete: No On-Chain File Reference",
            message: `Certificate "${resolvedCertId}" exists, but it has no IPFS document hash on-chain, so this file cannot be cryptographically compared.`,
            nextStep: "Contact the issuing institution to re-issue this certificate with file anchoring enabled.",
            certId: resolvedCertId,
          });
        } else if (err.status === 502) {
          setDocumentVerifyError({
            kind: "ipfs_unreachable",
            title: "Verification Inconclusive: Could Not Reach IPFS Source",
            message: "We found the certificate on-chain, but could not download its reference file from IPFS right now.",
            nextStep: "Retry in a few minutes or verify again from a stable network.",
            certId: resolvedCertId,
            uploadedSha256,
          });
        } else {
          setDocumentVerifyError({
            kind: "generic",
            title: "Document Verification Failed",
            message: baseMessage,
            nextStep: "Retry the upload. If this keeps failing, check backend logs and gateway connectivity.",
            certId: resolvedCertId,
            uploadedSha256,
          });
        }
      } else {
        setDocumentVerifyError({
          kind: "generic",
          title: "Document Verification Failed",
          message: err instanceof Error ? err.message : "File verification failed",
          nextStep: "Retry the upload. If this keeps failing, check backend logs and gateway connectivity.",
          certId: certId || undefined,
        });
      }
    } finally {
      setIsVerifyingDocument(false);
    }
  };

  const searchTabs = [
    { id: "cert" as const, label: "Certificate ID", icon: FileText, placeholder: "CERT-2026-001" },
    { id: "tx" as const, label: "Tx Hash", icon: Hash, placeholder: "0x8a3f7b2c..." },
    { id: "wallet" as const, label: "Wallet Address", icon: Wallet, placeholder: "0x742d35Cc..." },
  ];

  const documentVerdict = documentVerifyResult
    ? documentVerifyResult.verified
      ? {
          tone: "success" as const,
          title: "This Certificate Is Authentic",
          message:
            "The uploaded PDF matches the official certificate file recorded for this certificate.",
          nextStep: "You can accept this certificate as verified.",
        }
      : documentVerifyResult.match.sha256
      ? {
          tone: "warning" as const,
          title: "This File Is Original, But The Certificate Is Not Active",
          message:
            "The PDF matches the official file, but the certificate is currently not marked as valid.",
          nextStep: "Contact the issuing institution before accepting it.",
        }
      : {
          tone: "danger" as const,
          title: "This PDF Does Not Match The Official Certificate",
          message:
            "A certificate record was found, but the uploaded PDF is different from the official file.",
          nextStep: "Treat this document as suspicious and request the original file from the issuing institution.",
        }
    : null;

  const resultStatusCopy = result
    ? result.status === "verified"
      ? {
          title: "Certificate Verified",
          message: "This certificate was found in Edulocka records and is currently valid.",
          nextStep: "You can review the recipient, program, institution, and original file below.",
        }
      : result.status === "pending"
      ? {
          title: "Certificate Pending",
          message: "This certificate was found, but it is still waiting for final confirmation.",
          nextStep: "Check again later or contact the issuing institution.",
        }
      : {
          title: "Certificate Not Valid",
          message: "This certificate was found, but it is not currently valid.",
          nextStep: "Do not accept it until the issuing institution explains its status.",
        }
    : null;

  const documentVerdictTone = documentVerdict
    ? documentVerdict.tone === "success"
      ? {
          container: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
          title: "text-green-700 dark:text-green-400",
          icon: CheckCircle,
          iconClass: "text-green-500",
        }
      : documentVerdict.tone === "warning"
      ? {
          container: "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20",
          title: "text-yellow-800 dark:text-yellow-300",
          icon: AlertTriangle,
          iconClass: "text-yellow-500",
        }
      : {
          container: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
          title: "text-red-700 dark:text-red-400",
          icon: XCircle,
          iconClass: "text-red-500",
        }
    : null;

  const documentErrorTone = documentVerifyError
    ? documentVerifyError.kind === "not_found" || documentVerifyError.kind === "generic"
      ? {
          container: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
          title: "text-red-700 dark:text-red-400",
          icon: XCircle,
          iconClass: "text-red-500",
        }
      : {
          container: "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20",
          title: "text-yellow-800 dark:text-yellow-300",
          icon: AlertTriangle,
          iconClass: "text-yellow-500",
        }
    : null;

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Verify Certificate
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Search with certificate details or upload the PDF to confirm it is the official document.
          </p>
        </div>

        {/* Search Box */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            {/* Search type tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {searchTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSearchType(tab.id);
                    setSearchQuery("");
                    clearSearchOutcome();
                    clearDocumentOutcome();
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 px-3 py-3 text-xs font-medium transition-colors ${
                    searchType === tab.id
                      ? "border-b-2 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Search input */}
            <form onSubmit={handleSearch} className="flex p-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchTabs.find((t) => t.id === searchType)?.placeholder}
                  className="w-full rounded-none border-2 border-gray-200 bg-gray-50 py-3 pl-10 pr-4 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="ml-2 flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Verify
              </button>
            </form>
          </div>

          {/* Quick search hint */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">Use the details shared by the issuer, or upload the PDF if you do not know them.</span>
          </div>
        </div>

        {/* Document Hash Verification */}
        <div className="mx-auto mt-6 max-w-2xl rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
            Verify by Uploaded PDF
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Upload a certificate PDF and we will check whether it matches an official Edulocka certificate.
          </p>

          <form onSubmit={handleDocumentVerify} className="mt-3 space-y-3">
            <input
              type="text"
              value={documentCertId}
              onChange={(e) => setDocumentCertId(e.target.value)}
              placeholder={result?.certId ? `Optional: leave blank to use loaded cert ${result.certId}` : "Certificate ID optional"}
              className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500"
            />
            <div className="rounded-none border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-none file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700 dark:text-gray-300 dark:file:bg-blue-500 dark:hover:file:bg-blue-400"
              />
              {documentFile && (
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Selected: <span className="font-mono">{documentFile.name}</span> ({(documentFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isVerifyingDocument}
              className="flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isVerifyingDocument ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Verify Uploaded PDF
            </button>
          </form>
        </div>

        {documentVerifyError && documentErrorTone && (
          <div className={`mx-auto mt-4 max-w-2xl rounded-none border-2 p-4 ${documentErrorTone.container}`}>
            <div className="flex items-start gap-3">
              <documentErrorTone.icon className={`mt-0.5 h-5 w-5 ${documentErrorTone.iconClass}`} />
              <div className="min-w-0">
                <h4 className={`text-sm font-bold ${documentErrorTone.title}`}>{documentVerifyError.title}</h4>
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">{documentVerifyError.message}</p>
                <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  Next step: {documentVerifyError.nextStep}
                </p>
                {documentVerifyError.certId && (
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    Certificate ID: <span className="font-mono">{documentVerifyError.certId}</span>
                  </p>
                )}
                {documentVerifyError.uploadedSha256 && (
                  <details className="mt-2 rounded-none border border-gray-200 bg-white/70 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Advanced Details
                    </summary>
                    <div className="mt-2">
                      <HashDisplay
                        hash={documentVerifyError.uploadedSha256}
                        label="Uploaded SHA-256"
                        truncate={false}
                        className="text-[11px]"
                      />
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {documentVerifyResult && documentVerdict && documentVerdictTone && (
          <div className={`mx-auto mt-4 max-w-2xl rounded-none border-2 p-4 ${documentVerdictTone.container}`}>
            <div className="flex items-start gap-3">
              <documentVerdictTone.icon className={`mt-0.5 h-5 w-5 ${documentVerdictTone.iconClass}`} />
              <div className="min-w-0 flex-1">
                <h4 className={`text-sm font-bold ${documentVerdictTone.title}`}>{documentVerdict.title}</h4>
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">{documentVerdict.message}</p>
                <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  Next step: {documentVerdict.nextStep}
                </p>

                <div className="mt-3 grid gap-3 rounded-none border border-gray-200 bg-white/70 p-3 text-xs dark:border-gray-700 dark:bg-gray-900/40 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {documentVerifyResult.certificate.studentName}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {documentVerifyResult.certificate.degree}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Issued by {documentVerifyResult.certificate.institution}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Issued on {formatCertificateDate(documentVerifyResult.certificate.issueDate)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Certificate ID: <span className="font-mono">{documentVerifyResult.certId}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex h-24 w-24 items-center justify-center rounded-sm border border-gray-200 bg-white p-1 dark:border-gray-600">
                      <QRCodeSVG
                        value={getVerifyPageUrl(documentVerifyResult.certId, documentVerifyResult.verifyUrl)}
                        size={84}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#111827"
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Scan to verify again</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {getIpfsUrl(documentVerifyResult.ipfs.hash) && (
                    <a
                      href={getIpfsUrl(documentVerifyResult.ipfs.hash) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-none border-2 border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Original File
                    </a>
                  )}
                  <a
                    href={getVerifyPageUrl(documentVerifyResult.certId, documentVerifyResult.verifyUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Open Verification Link
                  </a>
                </div>
                <details className="mt-3 rounded-none border border-gray-200 bg-white/70 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Technical Details
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Lookup method: {documentVerifyResult.lookup === "documentHash" ? "Uploaded PDF match" : "Certificate ID"}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      File comparison: {documentVerifyResult.match.sha256 ? "The files match" : "The files do not match"}
                    </p>
                    <HashDisplay
                      hash={documentVerifyResult.uploaded.sha256}
                      label="Uploaded SHA-256"
                      truncate={false}
                      className="text-[11px]"
                    />
                    <HashDisplay
                      hash={documentVerifyResult.ipfs.sha256}
                      label="IPFS SHA-256"
                      truncate={false}
                      className="text-[11px]"
                    />
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="mx-auto mt-12 max-w-2xl text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-3 font-mono text-sm text-gray-500 dark:text-gray-400">
              Checking certificate records...
            </p>
          </div>
        )}

        {/* Not Found */}
        {notFound && (
          <div className="mx-auto mt-12 max-w-2xl rounded-none border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/20">
            <XCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-4 text-lg font-bold text-red-700 dark:text-red-400">
              Certificate Not Found
            </h3>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400/70">
              {errorMsg || `We could not find a certificate matching "${searchQuery}". Please check the details or ask the issuer for the QR code or verification link.`}
            </p>
          </div>
        )}

        {/* Result */}
        {results.length > 1 && !isSearching && (
          <div className="mx-auto mb-8 max-w-4xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Found {results.length} Certificates
              </h3>
              <span className="text-xs text-gray-500">Choose one to review</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((cert) => (
                <button
                  key={cert.certId}
                  onClick={() => {
                    setResult(cert);
                    try {
                      setPdfUrl(getCertificatePdfUrl(cert.certId));
                    } catch { /* optional */ }
                  }}
                  className={`flex flex-col text-left transition-all ${
                    result?.certId === cert.certId
                      ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                  } border-2 p-3`}
                >
                  <code className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {cert.certId}
                  </code>
                  <p className="mt-1 truncate text-xs font-bold text-gray-900 dark:text-white">
                    {cert.studentName}
                  </p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {cert.degree}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{cert.issueDate}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      cert.status === "verified" ? "bg-green-500" : "bg-red-500"
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {result && !isSearching && (
          <div className="mx-auto mt-8 max-w-4xl">
            {/* Status Banner */}
            <div
              className={`flex items-center gap-3 rounded-none border-2 p-4 ${
                result.status === "verified"
                  ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                  : result.status === "pending"
                  ? "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
                  : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
              }`}
            >
              {result.status === "verified" ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : result.status === "pending" ? (
                <Clock className="h-6 w-6 text-yellow-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <div>
                <h3 className={`text-lg font-bold ${
                  result.status === "verified"
                    ? "text-green-700 dark:text-green-400"
                    : result.status === "pending"
                    ? "text-yellow-700 dark:text-yellow-400"
                    : "text-red-700 dark:text-red-400"
                }`}>
                  {resultStatusCopy?.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {resultStatusCopy?.message}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {resultStatusCopy?.nextStep}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-gray-900 dark:text-white">
                    <FileText className="h-4 w-4 text-blue-500" />
                    CERTIFICATE SUMMARY
                  </h3>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: "Certificate ID", value: result.certId, mono: true },
                    { label: "Recipient", value: result.studentName },
                    { label: "Certificate", value: result.degree },
                    { label: "Issued By", value: result.institution },
                    { label: "Issue Date", value: formatCertificateDate(result.issueDate), mono: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{row.label}</span>
                      <span className={`text-right text-sm text-gray-900 dark:text-white ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                    </div>
                  ))}

                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {getIpfsUrl(result.ipfsHash) && (
                        <a
                          href={getIpfsUrl(result.ipfsHash) || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-none border-2 border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Original File
                        </a>
                      )}
                      {pdfUrl && (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Open Certificate PDF
                        </a>
                      )}
                    </div>
                  </div>

                  <details className="px-4 py-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Technical Details
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Issuer identity</span>
                        <div className="flex items-center gap-2">
                          <HashDisplay hash={result.studentWallet} />
                          <InstitutionBadge address={result.studentWallet} compact />
                        </div>
                      </div>
                      {result.txHash && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Blockchain transaction</span>
                          <HashDisplay hash={result.txHash} etherscanLink />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Blockchain block</span>
                        <span className="font-mono text-sm text-blue-600 dark:text-cyan-400">#{result.blockNumber.toLocaleString()}</span>
                      </div>
                      {result.gasUsed ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Network processing cost</span>
                          <span className="font-mono text-sm text-gray-900 dark:text-white">{result.gasUsed.toLocaleString()}</span>
                        </div>
                      ) : null}
                      {result.ipfsHash && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Original file reference</span>
                          <HashDisplay hash={result.ipfsHash} />
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                      <QrCode className="h-3.5 w-3.5" />
                      QUICK VERIFY
                    </h3>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="flex h-44 w-44 items-center justify-center rounded-sm border-2 border-gray-200 bg-white p-2 dark:border-gray-600">
                      <QRCodeSVG
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?certId=${encodeURIComponent(result.certId)}`}
                        size={152}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#111827"
                      />
                    </div>
                    <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                      Scan to verify this certificate on any device
                    </p>
                    <code className="mt-1 text-center font-mono text-[10px] text-blue-600 dark:text-cyan-400">
                      {result.certId}
                    </code>
                    <a
                      href={getVerifyPageUrl(result.certId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 rounded-none border-2 border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <QrCode className="h-3 w-3" />
                      Open Verification Link
                    </a>
                  </div>
                </div>
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
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-none border-2 border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading verification page...</span>
        </div>
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
