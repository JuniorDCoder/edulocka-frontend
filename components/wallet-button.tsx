"use client";

import { useWallet } from "@/lib/wallet-context";
import { truncateAddress } from "@/lib/mock-data";
import { Wallet, LogOut, ChevronDown, Copy, Check } from "lucide-react";
import { useState } from "react";

export function WalletButton() {
  const { wallet, connect, disconnect } = useWallet();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!wallet.connected) {
    return (
      <button
        onClick={connect}
        className="flex items-center gap-2 rounded-sm border-2 border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm font-mono dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-green-500">
          <Wallet className="h-3 w-3 text-white" />
        </div>
        <span className="text-gray-900 dark:text-white">
          {truncateAddress(wallet.address)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {wallet.balance} ETH
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-sm border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="mb-3 border-b border-gray-100 pb-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connected Wallet
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-xs font-mono text-gray-900 dark:text-white">
                  {truncateAddress(wallet.address)}
                </code>
                <button
                  onClick={handleCopy}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="mb-3 flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Balance</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {wallet.balance} ETH
              </span>
            </div>
            <div className="mb-3 flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Network</span>
              <span className="font-mono text-green-600 dark:text-green-400">
                {wallet.chainName}
              </span>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowMenu(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <LogOut className="h-3 w-3" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
