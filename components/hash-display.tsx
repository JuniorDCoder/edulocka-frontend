"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface HashDisplayProps {
  hash: string;
  truncate?: boolean;
  label?: string;
  etherscanLink?: boolean;
  className?: string;
}

export function HashDisplay({
  hash,
  truncate = true,
  label,
  etherscanLink = false,
  className = "",
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayHash = truncate
    ? `${hash.slice(0, 10)}...${hash.slice(-8)}`
    : hash;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}:
        </span>
      )}
      <code className="font-mono text-sm text-blue-600 dark:text-cyan-400">
        {etherscanLink ? (
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {displayHash}
          </a>
        ) : (
          displayHash
        )}
      </code>
      <button
        onClick={handleCopy}
        className="flex h-6 w-6 items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
