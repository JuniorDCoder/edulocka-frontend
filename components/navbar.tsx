"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";
import { NetworkBadge } from "./network-badge";
import { GasTracker } from "./gas-tracker";
import { getNetworkInfo } from "@/lib/contract";
import { Menu, X, GraduationCap, Link as LinkIcon } from "lucide-react";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/issue", label: "Issue" },
  { href: "/bulk", label: "Bulk" },
  { href: "/verify", label: "Verify" },
  { href: "/templates", label: "Templates" },
  { href: "/dashboard", label: "Dashboard" },
  // { href: "/apply-institution", label: "Apply" },
  // { href: "/admin", label: "Admin" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-[#0a0a0a]/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="hexagon absolute inset-0 bg-blue-600 dark:bg-blue-500" />
            <div className="relative flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
              <LinkIcon className="absolute -bottom-0.5 -right-1 h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-lg font-bold leading-none tracking-tight text-gray-900 dark:text-white">
              EDULOCKA
            </span>
            <span className="hidden text-[9px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 sm:block">
              Credentials on Chain
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <GasTracker gasPrice={networkInfo.gasPrice} />
            <NetworkBadge
              name={networkInfo.name}
              isTestnet={networkInfo.isTestnet}
              compact
            />
          </div>
          <ThemeToggle />
          <div className="hidden sm:block">
            <WalletButton />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-gray-200 bg-white md:hidden dark:border-gray-700 dark:bg-gray-800"
          >
            {mobileOpen ? (
              <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-[#0a0a0a] md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-sm px-3 py-2 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <NetworkBadge
              name={networkInfo.name}
              isTestnet={networkInfo.isTestnet}
              gasPrice={networkInfo.gasPrice}
            />
            <div className="sm:hidden">
              <WalletButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
