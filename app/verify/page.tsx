"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getCertificateById, getCertificateByTxHash, getCertificatesByWallet } from "@/lib/contract";
import { verifyCertificateViaBackend, getCertificatePdfUrl, getQRCodeDataUrl } from "@/lib/api-client";
import { truncateHash, truncateAddress } from "@/lib/mock-data";
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
  Blocks,
  Wallet,
  Download,
} from "lucide-react";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"cert" | "tx" | "wallet">("cert");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<Certificate | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const doSearch = useCallback(async (query: string, type: "cert" | "tx" | "wallet") => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResult(null);
    setNotFound(false);
    setPdfUrl(null);

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
          setResult(certs[0]);
        } else {
          setNotFound(true);
        }
      }
    } catch {
      setNotFound(true);
    }

    setIsSearching(false);
  }, []);

  // Auto-verify from URL: /verify?certId=CERT-2026-001
  useEffect(() => {
    const certId = searchParams.get("certId");
    if (certId) {
      setSearchQuery(certId);
      setSearchType("cert");
      doSearch(certId, "cert");
    }
  }, [searchParams, doSearch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSearch(searchQuery, searchType);
  };

  const searchTabs = [
    { id: "cert" as const, label: "Certificate ID", icon: FileText, placeholder: "CERT-2026-001" },
    { id: "tx" as const, label: "Tx Hash", icon: Hash, placeholder: "0x8a3f7b2c..." },
    { id: "wallet" as const, label: "Wallet Address", icon: Wallet, placeholder: "0x742d35Cc..." },
  ];

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Verify Certificate
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Search by certificate ID to verify on-chain
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
                    setResult(null);
                    setNotFound(false);
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
            <span className="text-xs text-gray-400">Try issuing a certificate first, then search by its ID here</span>
          </div>
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="mx-auto mt-12 max-w-2xl text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-3 font-mono text-sm text-gray-500 dark:text-gray-400">
              Querying blockchain...
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
              No certificate matching &quot;{searchQuery}&quot; was found on the
              blockchain. Please check the ID and try again.
            </p>
          </div>
        )}

        {/* Result */}
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
                  {result.status === "verified" ? "✓ Verified on Chain" : result.status === "pending" ? "⏳ Pending Confirmation" : "✗ Invalid / Revoked"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Certificate {result.certId} — Block #{result.blockNumber.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-gray-900 dark:text-white">
                    <Blocks className="h-4 w-4 text-blue-500" />
                    CERTIFICATE DETAILS
                  </h3>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: "Certificate ID", value: result.certId, mono: true },
                    { label: "Student Name", value: result.studentName },
                    { label: "Degree", value: result.degree },
                    { label: "Institution", value: result.institution },
                    { label: "Issue Date", value: result.issueDate, mono: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{row.label}</span>
                      <span className={`text-right text-sm text-gray-900 dark:text-white ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Issuer</span>
                    <div className="flex items-center gap-2">
                      <HashDisplay hash={result.studentWallet} />
                      <InstitutionBadge address={result.studentWallet} compact />
                    </div>
                  </div>

                  {result.txHash && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Tx Hash</span>
                      <HashDisplay hash={result.txHash} />
                    </div>
                  )}

                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Block Number</span>
                    <span className="font-mono text-sm text-blue-600 dark:text-cyan-400">#{result.blockNumber.toLocaleString()}</span>
                  </div>

                  {result.gasUsed ? (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Gas Used</span>
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{result.gasUsed.toLocaleString()}</span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">IPFS Document</span>
                    <a href={`https://ipfs.io/ipfs/${result.ipfsHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline dark:text-blue-400">
                      {result.ipfsHash.slice(0, 16)}...<ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
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
                      Scan to verify on any device
                    </p>
                    <code className="mt-1 text-center font-mono text-[10px] text-blue-600 dark:text-cyan-400">
                      {result.certId}
                    </code>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1.5 rounded-none border-2 border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <Download className="h-3 w-3" />
                        Download PDF
                      </a>
                    )}
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
