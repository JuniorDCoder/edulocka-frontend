"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { truncateHash, truncateAddress } from "@/lib/mock-data";
import { NetworkBadge } from "@/components/network-badge";
import { Certificate } from "@/lib/types";
import {
  getAllCertificates,
  getNetworkInfo,
  getRecentActivity,
  getTotalCertificates,
  getTotalInstitutions,
  getTotalRevocations,
} from "@/lib/contract";
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
} from "lucide-react";

export default function DashboardPage() {
  const { wallet, connect } = useWallet();
  const [filter, setFilter] = useState<"all" | "verified" | "pending" | "invalid">("all");
  const [sortBy, setSortBy] = useState<"date" | "block">("date");
  const [copied, setCopied] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, institutions: 0, revocations: 0 });
  const [networkInfo, setNetworkInfo] = useState({
    name: "Hardhat Local", chainId: 31337, gasPrice: "1.0 Gwei", blockNumber: 0, isTestnet: true,
  });
  const [recentActivity, setRecentActivity] = useState<
    { type: "issued" | "revoked"; certId: string; institution: string; timestamp: string; blockNumber: number }[]
  >([]);

  // Load data from blockchain
  useEffect(() => {
    if (!wallet.connected) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [certs, total, institutions, revocations, info, activity] = await Promise.all([
          getAllCertificates(),
          getTotalCertificates(),
          getTotalInstitutions(),
          getTotalRevocations(),
          getNetworkInfo(),
          getRecentActivity(5),
        ]);
        setCertificates(certs);
        setStats({ total, institutions, revocations });
        setNetworkInfo(info);
        setRecentActivity(activity);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [wallet.connected]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
              Connect your wallet to view your certificate dashboard and transaction history.
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

  const filteredCerts =
    filter === "all" ? certificates : certificates.filter((c) => c.status === filter);

  const sortedCerts = [...filteredCerts].sort((a, b) => {
    if (sortBy === "block") return b.blockNumber - a.blockNumber;
    return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
  });

  const statusCounts = {
    all: certificates.length,
    verified: certificates.filter((c) => c.status === "verified").length,
    pending: certificates.filter((c) => c.status === "pending").length,
    invalid: certificates.filter((c) => c.status === "invalid").length,
  };

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Wallet:</span>
              <code className="font-mono text-blue-600 dark:text-cyan-400">{truncateAddress(wallet.address)}</code>
              <NetworkBadge name={networkInfo.name} isTestnet={networkInfo.isTestnet} compact />
            </div>
          </div>
          <Link
            href="/issue"
            className="flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
          >
            <Plus className="h-4 w-4" />
            Issue Certificate
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Certs", count: stats.total, icon: FileCheck, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-800" },
            { label: "Verified", count: statusCounts.verified, icon: CheckCircle, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-200 dark:border-green-800" },
            { label: "Institutions", count: stats.institutions, icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30", borderColor: "border-yellow-200 dark:border-yellow-800" },
            { label: "Revoked", count: stats.revocations, icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-800" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-none border-2 ${stat.borderColor} ${stat.bgColor} p-4`}>
              <div className="flex items-center justify-between">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.count}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading from blockchain...</span>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Main Content - Certificate Table */}
            <div className="lg:col-span-3">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1">
                  {(["all", "verified", "pending", "invalid"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`rounded-sm px-3 py-1.5 text-xs font-medium capitalize ${
                        filter === status
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {status} ({statusCounts[status]})
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

              <div className="overflow-hidden rounded-none border-2 border-gray-200 dark:border-gray-700">
                <div className="hidden grid-cols-7 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 md:grid">
                  <span>Cert ID</span><span>Student</span><span>Degree</span><span>Date</span><span>Tx Hash</span><span>Block #</span><span>Status</span>
                </div>

                {sortedCerts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {certificates.length === 0
                      ? "No certificates issued yet. Go to Issue page to create your first certificate!"
                      : "No certificates found matching filter."}
                  </div>
                ) : (
                  sortedCerts.map((cert) => (
                    <div key={cert.certId} className="grid grid-cols-1 gap-2 border-b border-gray-100 bg-white px-4 py-3 last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50 md:grid-cols-7 md:items-center">
                      <code className="font-mono text-xs font-bold text-gray-900 dark:text-white">{cert.certId}</code>
                      <span className="truncate text-xs text-gray-600 dark:text-gray-300">{cert.studentName}</span>
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">{cert.degree.split(" ").slice(0, 3).join(" ")}...</span>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{cert.issueDate}</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">{truncateHash(cert.txHash)}</code>
                        <button onClick={() => handleCopy(cert.txHash, cert.certId)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          {copied === cert.certId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <code className="font-mono text-xs text-gray-600 dark:text-gray-300">#{cert.blockNumber.toLocaleString()}</code>
                      <span className={`inline-flex w-fit items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${
                        cert.status === "verified"
                          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                          : cert.status === "pending"
                          ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                      }`}>
                        {cert.status === "verified" && <CheckCircle className="h-2.5 w-2.5" />}
                        {cert.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                        {cert.status === "invalid" && <AlertTriangle className="h-2.5 w-2.5" />}
                        {cert.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                    <Activity className="h-3.5 w-3.5 text-green-500" />
                    NETWORK ACTIVITY
                  </h3>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentActivity.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-400">
                      No recent activity. Issue your first certificate!
                    </div>
                  ) : (
                    recentActivity.map((item, index) => (
                      <div key={index} className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {item.type === "issued" ? (
                            <FileCheck className="h-3 w-3 text-green-500" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-blue-500" />
                          )}
                          <span className="font-mono text-xs text-gray-900 dark:text-white">{item.certId}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.institution}</span>
                          <span className="text-[10px] text-gray-400">{item.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                  <Link href="/verify" className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    View explorer <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-none border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <h4 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Network Info</h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Chain</span>
                    <span className="text-gray-900 dark:text-white">{networkInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Gas Price</span>
                    <span className="text-orange-600 dark:text-orange-400">{networkInfo.gasPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Block</span>
                    <span className="text-blue-600 dark:text-cyan-400">#{networkInfo.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Balance</span>
                    <span className="text-gray-900 dark:text-white">{wallet.balance} ETH</span>
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
