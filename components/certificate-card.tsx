"use client";

import { Certificate } from "@/lib/types";
import { truncateAddress, truncateHash } from "@/lib/mock-data";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

interface CertificateCardProps {
  certificate: Certificate;
  compact?: boolean;
}

export function CertificateCard({ certificate, compact = false }: CertificateCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusConfig = {
    verified: {
      icon: CheckCircle,
      label: "Verified on Chain",
      color:
        "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800",
      dot: "bg-green-500",
    },
    pending: {
      icon: Clock,
      label: "Pending Confirmation",
      color:
        "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-800",
      dot: "bg-yellow-500",
    },
    invalid: {
      icon: AlertTriangle,
      label: "Invalid / Revoked",
      color:
        "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800",
      dot: "bg-red-500",
    },
  };

  const status = statusConfig[certificate.status];
  const StatusIcon = status.icon;

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-none border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${status.dot}`} />
          <code className="font-mono text-xs text-gray-900 dark:text-white">
            {certificate.certId}
          </code>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {certificate.studentName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
            #{certificate.blockNumber.toLocaleString()}
          </code>
          <span className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs ${status.color}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="hexagon flex h-8 w-8 items-center justify-center bg-blue-600 text-[10px] font-bold text-white dark:bg-blue-500">
            EDU
          </div>
          <div>
            <code className="font-mono text-sm font-bold text-gray-900 dark:text-white">
              {certificate.certId}
            </code>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Block #{certificate.blockNumber.toLocaleString()}
            </p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium ${status.color}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Student
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {certificate.studentName}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Degree
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {certificate.degree}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Institution
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {certificate.institution}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Issue Date
            </p>
            <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {certificate.issueDate}
            </p>
          </div>
          {certificate.gasUsed && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Gas Used
              </p>
              <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
                {certificate.gasUsed.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Hashes */}
        <div className="space-y-2 rounded-sm border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tx Hash
            </span>
            <div className="flex items-center gap-1">
              <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
                {truncateHash(certificate.txHash)}
              </code>
              <button
                onClick={() => handleCopy(certificate.txHash, "tx")}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {copied === "tx" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              <a
                href={`https://sepolia.etherscan.io/tx/${certificate.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Wallet
            </span>
            <div className="flex items-center gap-1">
              <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
                {truncateAddress(certificate.studentWallet)}
              </code>
              <button
                onClick={() =>
                  handleCopy(certificate.studentWallet, "wallet")
                }
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {copied === "wallet" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              IPFS
            </span>
            <div className="flex items-center gap-1">
              <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
                {certificate.ipfsHash.slice(0, 12)}...
              </code>
              <a
                href={`https://ipfs.io/ipfs/${certificate.ipfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
