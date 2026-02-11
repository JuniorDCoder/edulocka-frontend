"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Eye,
  ArrowRight,
  Blocks,
  FileCheck,
  Search,
  Activity,
  ChevronRight,
  Hash,
  CheckCircle,
  Clock,
  Loader2,
  Building2,
  FileText,
  QrCode,
  Mail,
  LayoutTemplate,
  Globe,
  Zap,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { truncateHash } from "@/lib/mock-data";
import {
  getTotalCertificates,
  getTotalInstitutions,
  getRecentActivity,
  getAllCertificates,
  getNetworkInfo,
} from "@/lib/contract";
import { Certificate } from "@/lib/types";

// ── Types ───────────────────────────────────────────────────────────────────

interface ActivityItem {
  certId: string;
  institution: string;
  blockNumber: number;
  timestamp: string;
  type: "issued" | "verified" | "revoked";
}

// ── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({
  target,
  label,
}: {
  target: number;
  label: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="text-center">
      <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white">
        {count.toLocaleString()}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

// ── Live Feed ───────────────────────────────────────────────────────────────

function LiveFeed({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="mb-2 h-5 w-5 animate-spin text-gray-400" />
        <p className="font-mono text-xs text-gray-400">
          Waiting for activity...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {activity.map((item, index) => (
        <div
          key={`${item.certId}-${index}`}
          className="flex items-center justify-between border border-gray-100 bg-white px-3 py-2.5 font-mono text-xs dark:border-gray-800 dark:bg-gray-900"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center gap-2">
            {item.type === "issued" ? (
              <FileCheck className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
            )}
            <span className="text-gray-900 dark:text-white">{item.certId}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 dark:text-gray-400">
              {item.institution}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-cyan-400">
              #{item.blockNumber.toLocaleString()}
            </span>
            <span className="text-gray-400">{item.timestamp}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [totalCerts, setTotalCerts] = useState(0);
  const [totalInstitutions, setTotalInstitutions] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [blockNumber, setBlockNumber] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [certs, total, inst, activity, info] = await Promise.allSettled([
          getAllCertificates(),
          getTotalCertificates(),
          getTotalInstitutions(),
          getRecentActivity(5),
          getNetworkInfo(),
        ]);

        if (
          certs.status === "rejected" ||
          total.status === "rejected" ||
          inst.status === "rejected" ||
          activity.status === "rejected" ||
          info.status === "rejected"
        ) {
          console.warn("Landing page fetch partially failed due to RPC throttling.");
        }

        setCertificates(certs.status === "fulfilled" ? certs.value : []);
        setTotalCerts(total.status === "fulfilled" ? total.value : 0);
        setTotalInstitutions(inst.status === "fulfilled" ? inst.value : 0);
        setRecentActivity(activity.status === "fulfilled" ? activity.value : []);
        setBlockNumber(info.status === "fulfilled" ? info.value.blockNumber : 0);
      } catch (err) {
        console.error("Failed to fetch landing page data:", err);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid-pattern min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 bg-blue-500/5 dark:bg-blue-500/10" />
        <div className="absolute bottom-0 left-0 -z-10 h-64 w-64 bg-green-500/5 dark:bg-green-500/10" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left - Text */}
            <div className="flex flex-col justify-center">
              {/* Network status bar */}
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-sm border border-green-200 bg-green-50 px-3 py-1.5 font-mono text-xs dark:border-green-900 dark:bg-green-950/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <span className="text-green-700 dark:text-green-400">
                  Live on Sepolia Testnet
                </span>
                <span className="text-green-500/50">|</span>
                <span className="text-green-600 dark:text-green-500">
                  Block #{blockNumber.toLocaleString()}
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                Blockchain-Verified{" "}
                <span className="text-glow">Academic</span>{" "}
                <span className="text-glow">Credentials</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg text-gray-600 dark:text-gray-400">
                Issue tamper-proof certificates on Ethereum. Authorize institutions on-chain, manage custom templates, issue single or bulk certificates, and verify academic achievements instantly with cryptographic proof.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/apply-institution"
                  className="flex items-center justify-center gap-2 rounded-sm border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                >
                  <Building2 className="h-4 w-4" />
                  Apply as Institution
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/verify"
                  className="flex items-center justify-center gap-2 rounded-sm border-2 border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-900 hover:border-blue-500 hover:shadow-md dark:border-gray-600 dark:bg-transparent dark:text-white dark:hover:border-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  <Search className="h-4 w-4" />
                  Verify Certificate
                </Link>
              </div>

              {/* Mini stats */}
              <div className="mt-10 flex gap-8">
                <div>
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white">
                    {totalCerts}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Certificates
                  </p>
                </div>
                <div className="border-l border-gray-200 pl-8 dark:border-gray-700">
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white">
                    {totalInstitutions}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Institutions
                  </p>
                </div>
                <div className="border-l border-gray-200 pl-8 dark:border-gray-700">
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white">
                    100%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uptime
                  </p>
                </div>
              </div>
            </div>

            {/* Right - Live Feed */}
            <div className="flex flex-col">
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                {/* Feed header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                      LIVE CERTIFICATE FEED
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    <span className="font-mono text-[10px] text-green-600 dark:text-green-400">
                      STREAMING
                    </span>
                  </div>
                </div>

                {/* Feed content */}
                <div className="p-3">
                  <LiveFeed activity={recentActivity} />
                </div>

                {/* Feed footer */}
                <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all transactions <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Recent cert preview */}
              <div className="mt-3 rounded-none border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Latest Verified Certificate
                  </span>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
                {certificates.length > 0 ? (
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">ID</span>
                      <span className="text-gray-900 dark:text-white">{certificates[0].certId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Tx</span>
                      <span className="text-blue-600 dark:text-cyan-400">
                        {truncateHash(certificates[0].txHash)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Block</span>
                      <span className="text-gray-900 dark:text-white">
                        #{certificates[0].blockNumber.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-xs text-gray-400">No certificates yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLATFORM FEATURES SECTION ===== */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              A Complete <span className="text-glow">Credential Platform</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500 dark:text-gray-400">
              From institution onboarding to certificate verification — Edulocka provides every tool needed for tamper-proof academic credentials.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Building2,
                title: "Institution Authorization",
                description:
                  "Institutions apply on-chain and get verified by the admin. Only authorized institutions can issue certificates — no impersonation possible.",
                color: "blue",
                borderClass: "neon-border",
              },
              {
                icon: FileCheck,
                title: "Single & Bulk Issuance",
                description:
                  "Issue certificates one-at-a-time or upload a CSV/Excel to bulk-process hundreds. Each gets a PDF, QR code, IPFS pin, and blockchain record.",
                color: "green",
                borderClass: "neon-border-green",
              },
              {
                icon: LayoutTemplate,
                title: "Custom Templates",
                description:
                  "Each institution can upload private HTML templates with their branding. Default templates are available to all. No institution sees another's designs.",
                color: "orange",
                borderClass: "neon-border-orange",
              },
              {
                icon: Search,
                title: "Instant Verification",
                description:
                  "Verify any certificate by ID, transaction hash, or wallet address. Cryptographic proof ensures authenticity — no intermediaries needed.",
                color: "blue",
                borderClass: "neon-border",
              },
              {
                icon: QrCode,
                title: "QR Codes & PDF Export",
                description:
                  "Every certificate gets an embedded QR code linking to its on-chain verification page. Download PDFs or bulk-export as ZIP archives.",
                color: "green",
                borderClass: "neon-border-green",
              },
              {
                icon: Mail,
                title: "Email Delivery",
                description:
                  "Automatically email certificates and QR codes to students upon issuance. Works for both single and bulk pipelines.",
                color: "orange",
                borderClass: "neon-border-orange",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`rounded-none p-6 ${feature.borderClass} bg-white dark:bg-gray-900`}
              >
                <div
                  className={`hexagon mb-4 flex h-12 w-12 items-center justify-center ${
                    feature.color === "blue"
                      ? "bg-blue-100 dark:bg-blue-950/50"
                      : feature.color === "green"
                      ? "bg-green-100 dark:bg-green-950/50"
                      : "bg-orange-100 dark:bg-orange-950/50"
                  }`}
                >
                  <feature.icon
                    className={`h-5 w-5 ${
                      feature.color === "blue"
                        ? "text-blue-600 dark:text-blue-400"
                        : feature.color === "green"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY BLOCKCHAIN SECTION ===== */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Why <span className="text-glow">Blockchain</span> Credentials?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
              Traditional certificates can be forged, lost, or disputed. Edulocka makes academic records immutable and universally verifiable.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Decentralized",
                description:
                  "No single point of failure. Certificates are stored across thousands of nodes worldwide.",
                color: "blue",
                borderClass: "neon-border",
              },
              {
                icon: Lock,
                title: "Immutable",
                description:
                  "Once issued, certificates cannot be altered or deleted. Every change creates a permanent record.",
                color: "green",
                borderClass: "neon-border-green",
              },
              {
                icon: Eye,
                title: "Transparent",
                description:
                  "Anyone can verify a certificate's authenticity using only a transaction hash or certificate ID.",
                color: "orange",
                borderClass: "neon-border-orange",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`rounded-none p-6 ${feature.borderClass} bg-white dark:bg-gray-900`}
              >
                <div
                  className={`hexagon mb-4 flex h-12 w-12 items-center justify-center ${
                    feature.color === "blue"
                      ? "bg-blue-100 dark:bg-blue-950/50"
                      : feature.color === "green"
                      ? "bg-green-100 dark:bg-green-950/50"
                      : "bg-orange-100 dark:bg-orange-950/50"
                  }`}
                >
                  <feature.icon
                    className={`h-5 w-5 ${
                      feature.color === "blue"
                        ? "text-blue-600 dark:text-blue-400"
                        : feature.color === "green"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111111]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <AnimatedCounter target={totalCerts} label="Certificates Issued" />
            <AnimatedCounter target={totalInstitutions} label="Authorized Institutions" />
            <AnimatedCounter
              target={certificates.filter((c) => c.status === "verified").length}
              label="Verifications"
            />
            <AnimatedCounter target={1} label="Network Nodes" />
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS - TERMINAL STYLE ===== */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              How It <span className="text-glow">Works</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
              From authorization to verification in four steps.
            </p>
          </div>

          {/* Terminal Window */}
          <div className="mx-auto max-w-3xl rounded-none border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900">
            {/* Terminal header */}
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                edulocka-cli — how-it-works
              </span>
            </div>

            {/* Terminal body */}
            <div className="space-y-4 p-6 font-mono text-sm">
              {/* Step 1 — Apply */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">$</span>
                  <span className="text-gray-900 dark:text-white">
                    edulocka apply --institution &quot;MIT&quot; --wallet 0x742d...35Bd
                  </span>
                </div>
                <div className="mt-1 pl-4 text-gray-500 dark:text-gray-400">
                  <p><span className="text-blue-600 dark:text-cyan-400">✓</span> Application submitted with documents</p>
                  <p><span className="text-blue-600 dark:text-cyan-400">✓</span> Admin notified for review</p>
                  <p><span className="text-green-600 dark:text-green-400">✓</span> <span className="font-bold text-green-600 dark:text-green-400">AUTHORIZED ON-CHAIN</span></p>
                </div>
              </div>

              {/* Step 2 — Upload Template */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">$</span>
                  <span className="text-gray-900 dark:text-white">
                    edulocka template upload --file mit-certificate.html
                  </span>
                </div>
                <div className="mt-1 pl-4 text-gray-500 dark:text-gray-400">
                  <p><span className="text-blue-600 dark:text-cyan-400">✓</span> Template saved to institution&apos;s private store</p>
                  <p><span className="text-blue-600 dark:text-cyan-400">✓</span> Available for single &amp; bulk issuance</p>
                </div>
              </div>

              {/* Step 3 — Issue */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">$</span>
                  <span className="text-gray-900 dark:text-white">
                    edulocka issue --student &quot;Alice Johnson&quot; --degree &quot;B.S. Computer Science&quot;
                  </span>
                </div>
                <div className="mt-1 pl-4 text-gray-500 dark:text-gray-400">
                  <p><span className="text-yellow-600 dark:text-yellow-400">⏳</span> Generating PDF from institution template...</p>
                  <p><span className="text-blue-600 dark:text-cyan-400">✓</span> IPFS Hash: <span className="text-blue-600 dark:text-cyan-400">QmXoyp...6uco</span></p>
                  <p><span className="text-green-600 dark:text-green-400">✓</span> Transaction confirmed in block <span className="text-blue-600 dark:text-cyan-400">#18,742,156</span></p>
                  <p><span className="text-green-600 dark:text-green-400">✓</span> Certificate ID: <span className="font-bold text-green-600 dark:text-green-400">CERT-2026-001</span></p>
                  <p><span className="text-blue-600 dark:text-cyan-400">✓</span> QR code generated &amp; email sent to student</p>
                </div>
              </div>

              {/* Step 4 — Verify */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">$</span>
                  <span className="text-gray-900 dark:text-white">
                    edulocka verify --cert CERT-2026-001
                  </span>
                </div>
                <div className="mt-1 pl-4 text-gray-500 dark:text-gray-400">
                  <p><span className="text-green-600 dark:text-green-400">✓</span> <span className="font-bold text-green-600 dark:text-green-400">VERIFIED ON CHAIN</span></p>
                  <p>Student: Alice Johnson | Degree: B.S. Computer Science</p>
                  <p>Issued by: MIT | Authorized: <span className="text-green-600 dark:text-green-400">Yes</span></p>
                </div>
              </div>

              {/* Blinking cursor */}
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">$</span>
                <span className="animate-blink text-gray-900 dark:text-white">▊</span>
              </div>
            </div>
          </div>

          {/* Steps below terminal */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-4">
            {[
              {
                step: "01",
                icon: Building2,
                title: "Apply & Get Authorized",
                description: "Institution applies on-chain and admin verifies credentials and documents.",
              },
              {
                step: "02",
                icon: LayoutTemplate,
                title: "Upload Templates",
                description: "Upload custom HTML certificate templates private to your institution.",
              },
              {
                step: "03",
                icon: FileCheck,
                title: "Issue Certificates",
                description: "Issue single or bulk certificates with PDF, QR, IPFS, and blockchain proof.",
              },
              {
                step: "04",
                icon: Search,
                title: "Instant Verify",
                description: "Anyone can verify authenticity using cert ID, tx hash, or wallet address.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-none border-2 border-gray-300 bg-gray-50 font-mono text-sm font-bold text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  {item.step}
                </div>
                <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR INSTITUTIONS SECTION ===== */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111111]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                <Building2 className="h-3.5 w-3.5" /> FOR INSTITUTIONS
              </span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Everything You Need to Issue <span className="text-glow">Trusted Credentials</span>
              </h2>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                From onboarding to issuance, Edulocka provides a seamless workflow for authorized institutions to manage their academic certificates on the blockchain.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: ShieldCheck, text: "On-chain authorization — only verified institutions can issue" },
                  { icon: LayoutTemplate, text: "Private custom templates — your branding, your design" },
                  { icon: Layers, text: "Bulk issuance via CSV/Excel — process hundreds at once" },
                  { icon: Mail, text: "Automated email delivery to students with PDF & QR" },
                  { icon: Globe, text: "IPFS storage — decentralized, permanent document hosting" },
                  { icon: Zap, text: "Real-time dashboard — track all your issued certificates" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-none bg-blue-100 dark:bg-blue-950/50">
                      <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href="/apply-institution"
                  className="inline-flex items-center gap-2 rounded-sm border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Building2 className="h-4 w-4" />
                  Apply for Authorization
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right — Pipeline visualization */}
            <div className="flex flex-col justify-center">
              <div className="space-y-3">
                {[
                  { step: "Application", desc: "Submit institution details & documents", icon: FileText, status: "completed" },
                  { step: "Admin Review", desc: "Admin verifies credentials & approves", icon: ShieldCheck, status: "completed" },
                  { step: "On-Chain Authorization", desc: "Institution wallet added to smart contract", icon: Blocks, status: "completed" },
                  { step: "Template Setup", desc: "Upload custom certificate templates", icon: LayoutTemplate, status: "completed" },
                  { step: "Issue Certificates", desc: "Single or bulk — PDF, QR, IPFS, email", icon: FileCheck, status: "active" },
                  { step: "Verification", desc: "Anyone can verify instantly", icon: Search, status: "waiting" },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-none border-2 ${
                        item.status === "completed"
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                          : item.status === "active"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.status === "completed"
                            ? "text-green-600 dark:text-green-400"
                            : item.status === "active"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-400"
                        }`} />
                      </div>
                      {i < 5 && (
                        <div className={`h-3 w-0.5 ${
                          item.status === "completed" ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600"
                        }`} />
                      )}
                    </div>
                    <div className="pt-1.5">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.step}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RECENT CERTIFICATES ===== */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Recent Certificates
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Latest issuances on the network
              </p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Table-style display */}
          <div className="overflow-hidden rounded-none border-2 border-gray-200 dark:border-gray-700">
            {/* Table header */}
            <div className="grid grid-cols-6 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <span>Cert ID</span>
              <span>Student</span>
              <span>Degree</span>
              <span>Tx Hash</span>
              <span>Block</span>
              <span>Status</span>
            </div>

            {/* Table rows */}
            {certificates.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-xs text-gray-400 dark:text-gray-500">
                No certificates on chain yet. <Link href="/issue" className="text-blue-600 hover:underline dark:text-blue-400">Issue your first!</Link>
              </div>
            ) : (
            certificates.slice(0, 5).map((cert) => (
              <div
                key={cert.certId}
                className="grid grid-cols-6 gap-4 border-b border-gray-100 bg-white px-4 py-3 text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
              >
                <code className="font-mono text-xs font-medium text-gray-900 dark:text-white">
                  {cert.certId}
                </code>
                <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                  {cert.studentName}
                </span>
                <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {cert.degree}
                </span>
                <code className="font-mono text-xs text-blue-600 dark:text-cyan-400">
                  {truncateHash(cert.txHash)}
                </code>
                <code className="font-mono text-xs text-gray-600 dark:text-gray-300">
                  #{cert.blockNumber.toLocaleString()}
                </code>
                <span
                  className={`inline-flex w-fit items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${
                    cert.status === "verified"
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                      : cert.status === "pending"
                      ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                  }`}
                >
                  {cert.status === "verified" && (
                    <CheckCircle className="h-2.5 w-2.5" />
                  )}
                  {cert.status === "pending" && (
                    <Clock className="h-2.5 w-2.5" />
                  )}
                  {cert.status}
                </span>
              </div>
            ))
            )}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="neon-border rounded-none bg-white p-8 text-center dark:bg-gray-900 sm:p-12">
            <div className="hexagon mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-blue-600 dark:bg-blue-500">
              <Hash className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Degrees That Can&apos;t Be Faked
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-gray-500 dark:text-gray-400">
              Join institutions already using Edulocka to issue tamper-proof academic credentials. Apply for authorization, upload your templates, and start issuing on the blockchain.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/apply-institution"
                className="flex items-center gap-2 rounded-sm border-2 border-blue-600 bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <Building2 className="h-4 w-4" />
                Apply as Institution
              </Link>
              <Link
                href="/issue"
                className="flex items-center gap-2 rounded-sm border-2 border-gray-300 px-8 py-3 text-sm font-bold text-gray-900 hover:border-green-500 hover:shadow-md dark:border-gray-600 dark:text-white dark:hover:border-green-500 dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <FileCheck className="h-4 w-4" />
                Issue Certificates
              </Link>
              <Link
                href="/verify"
                className="flex items-center gap-2 rounded-sm border-2 border-gray-300 px-8 py-3 text-sm font-bold text-gray-900 hover:border-blue-500 hover:shadow-md dark:border-gray-600 dark:text-white dark:hover:border-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <Search className="h-4 w-4" />
                Verify a Certificate
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
