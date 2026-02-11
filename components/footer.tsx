"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Github, ExternalLink, GraduationCap, Link as LinkIcon, Mail, Phone } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/lib/contract-config";
import { truncateAddress } from "@/lib/mock-data";
import { getNetworkInfo } from "@/lib/contract";
import { useWallet } from "@/lib/wallet-context";

export function Footer() {
  const contractAddress = CONTRACT_ADDRESS;
  const { wallet } = useWallet();
  const [networkInfo, setNetworkInfo] = useState({
    name: "Connecting...",
    chainId: 0,
    gasPrice: "— Gwei",
    blockNumber: 0,
    isTestnet: true,
  });

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const info = await getNetworkInfo();
        setNetworkInfo(info);
      } catch {
        // keep defaults
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeNetworkName = useMemo(() => {
    if (wallet.connected && wallet.chainName) return wallet.chainName;
    return networkInfo.name;
  }, [wallet.connected, wallet.chainName, networkInfo.name]);

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-5">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <div className="hexagon absolute inset-0 bg-blue-600 dark:bg-blue-500" />
                <div className="relative flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5 text-white" />
                  <LinkIcon className="absolute -bottom-0.5 -right-1 h-2 w-2 text-white" />
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                EDULOCKA
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Decentralized academic credential verification. Immutable,
              transparent, and trustless.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Platform
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/issue", label: "Issue Certificate" },
                { href: "/verify", label: "Verify Certificate" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/blogs", label: "Blog" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Resources
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/about", label: "About Edulocka" },
                { href: "/faq", label: "FAQ" },
                { href: "/templates", label: "Template Library" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contract Info */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Contract
            </h4>
            <div className="space-y-3">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Contract Address
                </p>
                <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
                  {truncateAddress(contractAddress)}
                </code>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://sepolia.etherscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <ExternalLink className="h-3 w-3" />
                  Etherscan
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <Github className="h-3 w-3" />
                  GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:dcodertechie@gmail.com"
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  dcodertechie@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+237677802114"
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  +237 677 802 114
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row">
          <p className="font-mono text-xs text-gray-400">
            © 2026 Edulocka. Built on Ethereum.
          </p>
          <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span>Network: {activeNetworkName}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>
              {networkInfo.blockNumber > 0
                ? `Block #${networkInfo.blockNumber.toLocaleString()}`
                : "Block #—"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
