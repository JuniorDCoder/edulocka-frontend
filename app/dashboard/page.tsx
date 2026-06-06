"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import { truncateHash, truncateAddress } from "@/lib/mock-data";
import { NetworkBadge } from "@/components/network-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import { ApplicationStatusBadge } from "@/components/application-status-badge";
import {
  getNetworkInfo,
  getTotalCertificates,
  getTotalInstitutions,
  getTotalRevocations,
} from "@/lib/contract";
import {
  getMyInstitutionInfo,
  getWalletAuth,
  listCertificatesFromBackend,
  revokeCertificate,
  bulkRevokeCertificates,
  type BackendCertificateRecord,
  type InstitutionApplication,
  type InstitutionOnChainInfo,
} from "@/lib/api-client";
import Link from "next/link";
import {
  Wallet,
  FileCheck,
  ArrowUpDown,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Plus,
  Copy,
  Check,
  Loader2,
  Building2,
  Globe,
  Hash,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";

export default function DashboardPage() {
  const { wallet, connect } = useWallet();

  // Filter / sort / copy state
  const [filter, setFilter] = useState<"all" | "issued" | "revoked">("all");
  const [sortBy, setSortBy] = useState<"date" | "block">("date");
  const [copied, setCopied] = useState<string | null>(null);

  // Data
  const [myCertificates, setMyCertificates] = useState<BackendCertificateRecord[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [institutionApp, setInstitutionApp] = useState<InstitutionApplication | null>(null);
  const [onChainInfo, setOnChainInfo] = useState<InstitutionOnChainInfo | null>(null);
  const [stats, setStats] = useState({ total: 0, institutions: 0, revocations: 0 });
  const [networkInfo, setNetworkInfo] = useState({
    name: "Connecting...",
    chainId: 0,
    gasPrice: "— Gwei",
    blockNumber: 0,
    isTestnet: true,
  });

  // Bulk select
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());

  // Single revoke modal
  const [revokeTarget, setRevokeTarget] = useState<BackendCertificateRecord | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Bulk revoke modal
  const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false);
  const [bulkRevoking, setBulkRevoking] = useState(false);

  // Error banner
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    if (!wallet.address) return;
    setLoadingCerts(true);
    try {
      const certs = await listCertificatesFromBackend({ wallet: wallet.address });
      setMyCertificates(certs);
    } catch (err) {
      console.warn("Failed to fetch certificates from backend:", err);
    }
    setLoadingCerts(false);
  }, [wallet.address]);

  useEffect(() => {
    if (!wallet.connected) return;

    const fetchAll = async () => {
      // Institution info
      if (wallet.address) {
        const auth = getWalletAuth(wallet);
        if (auth) {
          try {
            const timestamp = Math.floor(Date.now() / 1000);
            const message = `Edulocka Auth: ${timestamp}`;
            const signature = await auth.signMessage(message);
            const info = await getMyInstitutionInfo(wallet.address, signature, message);
            setInstitutionApp(info.application);
            setOnChainInfo(info.blockchain);
          } catch (err) {
            console.warn("Failed to fetch institution info:", err);
          }
        }
      }

      // Global blockchain stats
      const [total, institutions, revocations, info] = await Promise.allSettled([
        getTotalCertificates(),
        getTotalInstitutions(),
        getTotalRevocations(),
        getNetworkInfo(),
      ]);
      setStats({
        total: total.status === "fulfilled" ? total.value : 0,
        institutions: institutions.status === "fulfilled" ? institutions.value : 0,
        revocations: revocations.status === "fulfilled" ? revocations.value : 0,
      });
      if (info.status === "fulfilled") setNetworkInfo(info.value);

      // My certificates from backend
      await fetchCertificates();
    };

    fetchAll();
    const interval = setInterval(fetchAll, 180000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, fetchCertificates]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isAuthorized =
    onChainInfo?.isAuthorized || institutionApp?.authorizedOnChain || false;

  // Revoke single
  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    const auth = getWalletAuth(wallet);
    if (!auth) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await revokeCertificate(revokeTarget.certId, auth);
      setMyCertificates((prev) =>
        prev.map((c) =>
          c.certId === revokeTarget.certId ? { ...c, status: "revoked" } : c
        )
      );
      setRevokeTarget(null);
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : "Revocation failed");
    }
    setRevoking(false);
  };

  // Bulk revoke
  const confirmBulkRevoke = async () => {
    const auth = getWalletAuth(wallet);
    if (!auth) return;
    const ids = Array.from(selectedCerts);
    setBulkRevoking(true);
    setRevokeError(null);
    try {
      const result = await bulkRevokeCertificates(ids, auth);
      const revokedSet = new Set(
        result.results.filter((r) => r.success).map((r) => r.certId)
      );
      setMyCertificates((prev) =>
        prev.map((c) => (revokedSet.has(c.certId) ? { ...c, status: "revoked" } : c))
      );
      setSelectedCerts(new Set());
      setBulkRevokeOpen(false);
      if (result.failed > 0) {
        setRevokeError(`${result.succeeded} revoked, ${result.failed} failed.`);
      }
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : "Bulk revocation failed");
    }
    setBulkRevoking(false);
  };

  // Selection helpers
  const filteredCerts =
    filter === "all" ? myCertificates : myCertificates.filter((c) => c.status === filter);

  const sortedCerts = [...filteredCerts].sort((a, b) => {
    if (sortBy === "block")
      return (b.blockchain?.blockNumber ?? 0) - (a.blockchain?.blockNumber ?? 0);
    return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
  });

  const revocableCerts = filteredCerts.filter((c) => c.status !== "revoked");

  const allRevocableSelected =
    revocableCerts.length > 0 &&
    revocableCerts.every((c) => selectedCerts.has(c.certId));

  const toggleSelectAll = () => {
    if (allRevocableSelected) {
      setSelectedCerts(new Set());
    } else {
      setSelectedCerts(new Set(revocableCerts.map((c) => c.certId)));
    }
  };

  const toggleSelect = (certId: string) => {
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      if (next.has(certId)) next.delete(certId);
      else next.add(certId);
      return next;
    });
  };

  const statusCounts = {
    all: myCertificates.length,
    issued: myCertificates.filter((c) => c.status === "issued").length,
    revoked: myCertificates.filter((c) => c.status === "revoked").length,
  };

  // Not connected
  if (!wallet.connected) {
    return (
      <div className="grid-pattern min-h-screen">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-32 sm:px-6 lg:px-8">
          <div className="neon-border w-full max-w-md rounded-none bg-white p-8 text-center dark:bg-gray-900">
            <div className="hexagon mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-blue-600 dark:bg-blue-500">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet Required</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Connect your wallet to view your institution dashboard and manage certificates.
            </p>
            <button
              onClick={connect}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
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
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Wallet:</span>
              <code className="font-mono text-blue-600 dark:text-cyan-400">
                {truncateAddress(wallet.address)}
              </code>
              <NetworkBadge name={networkInfo.name} isTestnet={networkInfo.isTestnet} compact />
            </div>
          </div>
          <Link
            href="/issue"
            className="flex w-fit items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
          >
            <Plus className="h-4 w-4" />
            Issue Certificate
          </Link>
        </div>

        {/* Institution Info Card */}
        {institutionApp && (
          <div className="mb-6 rounded-none border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-blue-200 px-5 py-4 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-blue-600 dark:bg-blue-500">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {institutionApp.institutionName}
                  </h2>
                  <div className="flex items-center gap-2">
                    <ApplicationStatusBadge status={institutionApp.status} size="sm" />
                    {isAuthorized ? (
                      <span className="flex items-center gap-1 rounded-sm border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                        <ShieldCheck className="h-3 w-3" />
                        On-chain authorized
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-sm border border-yellow-200 bg-yellow-50 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
                        <ShieldOff className="h-3 w-3" />
                        Not on-chain
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-4 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Reg. Number</span>
                <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                  {institutionApp.registrationNumber}
                </p>
              </div>
              <div className="flex items-start gap-1">
                <Globe className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Country</span>
                  <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                    {institutionApp.country}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-1">
                <Hash className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Applied</span>
                  <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                    {new Date(institutionApp.appliedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {onChainInfo && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Issued on-chain</span>
                  <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                    {onChainInfo.totalIssued}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total Certs",
              count: stats.total,
              icon: FileCheck,
              color: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
              borderColor: "border-blue-200 dark:border-blue-800",
            },
            {
              label: "My Issued",
              count: statusCounts.issued,
              icon: CheckCircle,
              color: "text-green-600 dark:text-green-400",
              bgColor: "bg-green-50 dark:bg-green-950/30",
              borderColor: "border-green-200 dark:border-green-800",
            },
            {
              label: "Institutions",
              count: stats.institutions,
              icon: Clock,
              color: "text-yellow-600 dark:text-yellow-400",
              bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
              borderColor: "border-yellow-200 dark:border-yellow-800",
            },
            {
              label: "Revoked",
              count: stats.revocations,
              icon: AlertTriangle,
              color: "text-red-600 dark:text-red-400",
              bgColor: "bg-red-50 dark:bg-red-950/30",
              borderColor: "border-red-200 dark:border-red-800",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-none border-2 ${stat.borderColor} ${stat.bgColor} p-4`}
            >
              <div className="flex items-center justify-between">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className={`font-mono text-2xl font-bold ${stat.color}`}>
                  {stat.count}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Revoke error banner */}
        {revokeError && (
          <div className="mb-4 flex items-center justify-between rounded-none border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <span>{revokeError}</span>
            <button onClick={() => setRevokeError(null)} className="ml-4 font-bold hover:opacity-70">
              ×
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Table toolbar */}
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1">
                {(["all", "issued", "revoked"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setFilter(s); setSelectedCerts(new Set()); }}
                    className={`rounded-sm px-3 py-1.5 text-xs font-medium capitalize ${
                      filter === s
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {s} ({statusCounts[s]})
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSortBy(sortBy === "date" ? "block" : "date")}
                className="flex items-center gap-1 rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <ArrowUpDown className="h-3 w-3" />
                Sort by: {sortBy === "date" ? "Date" : "Block #"}
              </button>
            </div>

            {/* Bulk action bar */}
            {selectedCerts.size > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-none border border-orange-300 bg-orange-50 px-4 py-2 dark:border-orange-700 dark:bg-orange-950/20">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                  {selectedCerts.size} certificate{selectedCerts.size > 1 ? "s" : ""} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCerts(new Set())}
                    className="rounded-sm border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Clear
                  </button>
                  {isAuthorized && (
                    <button
                      onClick={() => setBulkRevokeOpen(true)}
                      className="flex items-center gap-1 rounded-sm border border-red-500 bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Revoke Selected
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Certificates table */}
            <div className="overflow-hidden rounded-none border-2 border-gray-200 dark:border-gray-700">
              {/* Header row */}
              <div className="hidden grid-cols-[24px_1fr_1fr_1fr_1fr_1fr_90px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 md:grid">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={allRevocableSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                  />
                </label>
                <span>Cert ID</span>
                <span>Student</span>
                <span>Degree</span>
                <span>Date</span>
                <span>Tx Hash</span>
                <span>Status</span>
              </div>

              {loadingCerts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading certificates…</span>
                </div>
              ) : sortedCerts.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {myCertificates.length === 0
                    ? "No certificates issued yet. Go to the Issue page to create your first certificate!"
                    : "No certificates match the selected filter."}
                </div>
              ) : (
                sortedCerts.map((cert) => {
                  const isRevoked = cert.status === "revoked";
                  const isSelected = selectedCerts.has(cert.certId);
                  const txHash = cert.blockchain?.txHash ?? "";
                  const blockNumber = cert.blockchain?.blockNumber ?? 0;

                  return (
                    <div
                      key={cert.certId}
                      className={`grid grid-cols-1 gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-800 md:grid-cols-[24px_1fr_1fr_1fr_1fr_1fr_90px] md:items-center ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/20"
                          : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      {/* Checkbox */}
                      <label className="flex items-center md:justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isRevoked}
                          onChange={() => !isRevoked && toggleSelect(cert.certId)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600 disabled:opacity-30"
                        />
                      </label>

                      <code className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        {cert.certId}
                      </code>
                      <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                        {cert.studentName}
                      </span>
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {cert.degree.split(" ").slice(0, 3).join(" ")}…
                      </span>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </span>

                      {/* Tx hash */}
                      <div className="flex items-center gap-1">
                        {txHash ? (
                          <>
                            <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
                              {truncateHash(txHash)}
                            </code>
                            <button
                              onClick={() => handleCopy(txHash, cert.certId)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              {copied === cert.certId ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>

                      {/* Status + revoke action */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${
                            isRevoked
                              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                              : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                          }`}
                        >
                          {isRevoked ? (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          ) : (
                            <CheckCircle className="h-2.5 w-2.5" />
                          )}
                          {isRevoked ? "Revoked" : "Issued"}
                        </span>
                        {!isRevoked && isAuthorized && (
                          <button
                            onClick={() => { setRevokeError(null); setRevokeTarget(cert); }}
                            title="Revoke certificate"
                            className="rounded-sm p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Recent activity */}
            <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                  <Activity className="h-3.5 w-3.5 text-green-500" />
                  RECENT CERTS
                </h3>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {myCertificates.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-400">
                    No certificates yet.
                  </div>
                ) : (
                  [...myCertificates]
                    .sort(
                      (a, b) =>
                        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
                    )
                    .slice(0, 5)
                    .map((cert) => (
                      <div key={cert.certId} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {cert.status === "revoked" ? (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          ) : (
                            <FileCheck className="h-3 w-3 text-green-500" />
                          )}
                          <span className="font-mono text-xs text-gray-900 dark:text-white">
                            {cert.certId}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {cert.studentName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(cert.issueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
              <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                <Link
                  href="/verify"
                  className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View explorer <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Network Info */}
            <div className="rounded-none border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Network Info
              </h4>
              <div className="space-y-2 font-mono text-xs">
                {[
                  { label: "Chain", value: networkInfo.name, cls: "text-gray-900 dark:text-white" },
                  { label: "Gas Price", value: networkInfo.gasPrice, cls: "text-orange-600 dark:text-orange-400" },
                  { label: "Block", value: `#${networkInfo.blockNumber.toLocaleString()}`, cls: "text-blue-600 dark:text-cyan-400" },
                  { label: "Balance", value: `${wallet.balance} ETH`, cls: "text-gray-900 dark:text-white" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={cls}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single revoke confirmation */}
      <ConfirmModal
        open={revokeTarget !== null}
        title="Revoke Certificate"
        description={
          revokeTarget
            ? `Revoke certificate ${revokeTarget.certId} issued to ${revokeTarget.studentName}? This will call the smart contract and cannot be undone.`
            : ""
        }
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        danger
        loading={revoking}
        onConfirm={confirmRevoke}
        onCancel={() => !revoking && setRevokeTarget(null)}
      />

      {/* Bulk revoke confirmation */}
      <ConfirmModal
        open={bulkRevokeOpen}
        title="Bulk Revoke Certificates"
        description={`Revoke ${selectedCerts.size} selected certificate${selectedCerts.size > 1 ? "s" : ""}? Each will be submitted to the smart contract individually. This cannot be undone.`}
        confirmLabel={`Revoke ${selectedCerts.size}`}
        cancelLabel="Cancel"
        danger
        loading={bulkRevoking}
        onConfirm={confirmBulkRevoke}
        onCancel={() => !bulkRevoking && setBulkRevokeOpen(false)}
      />
    </div>
  );
}
