"use client";

import { Wifi, WifiOff } from "lucide-react";

interface NetworkBadgeProps {
  name: string;
  isTestnet: boolean;
  isConnected?: boolean;
  gasPrice?: string;
  compact?: boolean;
}

export function NetworkBadge({
  name,
  isTestnet,
  isConnected = true,
  gasPrice,
  compact = false,
}: NetworkBadgeProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-xs ${
        isConnected
          ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
          : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
      }`}
    >
      <div className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            isConnected ? "bg-green-400" : "bg-red-400"
          }`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </div>
      {isConnected ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>{name}</span>
      {isTestnet && (
        <span className="rounded-sm bg-yellow-100 px-1 py-0.5 text-[10px] font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          TESTNET
        </span>
      )}
      {!compact && gasPrice && (
        <span className="border-l border-current/20 pl-2 text-[10px] opacity-70">
          ⛽ {gasPrice}
        </span>
      )}
    </div>
  );
}
