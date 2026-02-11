"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";
import { NetworkBadge } from "./network-badge";
import { GasTracker } from "./gas-tracker";
import { getNetworkInfo } from "@/lib/contract";
import { Menu, X, GraduationCap, Link as LinkIcon, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

const homeLink = { href: "/", label: "Home" };

const navGroups = [
  {
    id: "certificates",
    label: "Certificates",
    description: "Issue and verify credentials",
    links: [
      { href: "/issue", label: "Issue Certificate" },
      { href: "/bulk", label: "Bulk Issuance" },
      { href: "/verify", label: "Verify Certificate" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Institution and template management",
    links: [
      { href: "/templates", label: "Templates" },
      { href: "/apply-institution", label: "Apply as Institution" },
      { href: "/admin", label: "Admin Panel" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    description: "Product details and support",
    links: [
      { href: "/blogs", label: "Blog" },
      { href: "/about", label: "About Edulocka" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
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

  const isActiveLink = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

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
        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href={homeLink.href}
            onClick={() => setOpenGroup(null)}
            className={`relative rounded-none px-3 py-2 text-sm font-semibold transition-colors ${
              isActiveLink(homeLink.href)
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {homeLink.label}
            {isActiveLink(homeLink.href) && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
          </Link>

          {navGroups.map((group) => {
            const isGroupActive = group.links.some((link) => isActiveLink(link.href));
            const isOpen = openGroup === group.id;

            return (
              <div
                key={group.id}
                className="relative"
                onMouseEnter={() => setOpenGroup(group.id)}
                onMouseLeave={() => setOpenGroup((current) => (current === group.id ? null : current))}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup((current) => (current === group.id ? null : group.id))}
                  className={`relative flex items-center gap-1 rounded-none px-3 py-2 text-sm font-semibold transition-colors ${
                    isGroupActive || isOpen
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {group.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  {isGroupActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  )}
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 rounded-none border-2 border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <p className="border-b border-gray-100 px-2 pb-2 font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      {group.description}
                    </p>
                    <div className="mt-2 space-y-1">
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpenGroup(null)}
                          className={`block rounded-none px-2 py-2 text-sm transition-colors ${
                            isActiveLink(link.href)
                              ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
          <nav className="flex flex-col gap-3">
            <Link
              href={homeLink.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-sm px-3 py-2 text-sm font-semibold ${
                isActiveLink(homeLink.href)
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {homeLink.label}
            </Link>

            {navGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-none border border-gray-200 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-900/60"
              >
                <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-sm px-3 py-2 text-sm ${
                        isActiveLink(link.href)
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                          : "text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
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
