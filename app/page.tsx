"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Shield,
  Lock,
  Eye,
  ArrowRight,
  FileCheck,
  Search,
  Activity,
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
  Blocks,
  GraduationCap,
  FileUp,
  Upload,
  Users,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { truncateHash } from "@/lib/mock-data";
import {
  getTotalCertificates,
  getTotalInstitutions,
  getTotalRevocations,
  getRecentCertificates,
  getNetworkInfo,
} from "@/lib/contract";
import { verifyCertificateDocumentFile, ApiError } from "@/lib/api-client";
import { Certificate } from "@/lib/types";

// ── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div className="text-center">
      <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white">{count.toLocaleString()}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ── Recent Activity Feed ────────────────────────────────────────────────────

function ActivityFeed({ certs }: { certs: Certificate[] }) {
  if (certs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mb-2 h-5 w-5 animate-spin text-gray-400" />
        <p className="text-xs text-gray-400">Loading recent activity…</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {certs.slice(0, 5).map((cert, i) => (
        <div key={`${cert.certId}-${i}`}
          className="flex items-center justify-between rounded-none border border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
              <BadgeCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{cert.studentName}</p>
              <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">{cert.degree} · {cert.institution}</p>
            </div>
          </div>
          <span className="ml-3 shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
            Issued
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Quick PDF Verify Widget ─────────────────────────────────────────────────

function QuickVerifyWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"authentic" | "mismatch" | "notfound" | null>(null);
  const [studentName, setStudentName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") { setFile(dropped); setResult(null); }
  };

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyCertificateDocumentFile(null, file);
      setStudentName(res.certificate.studentName || "");
      setResult(res.verified ? "authentic" : "mismatch");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setResult("notfound");
      else setResult("notfound");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">Quick PDF Check</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Drop a certificate PDF to verify it instantly</p>
      </div>
      <div className="p-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : file ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-800/50"
          }`}
        >
          <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); } }} />
          {file ? (
            <>
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              <p className="text-xs font-semibold text-green-700 dark:text-green-400">{file.name}</p>
              <p className="text-[10px] text-gray-500">Click to change</p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-gray-400" />
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Drop PDF here or click to browse</p>
            </>
          )}
        </div>

        {result === "authentic" && (
          <div className="mt-3 flex items-center gap-2 rounded-none border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
            <div>
              <p className="text-xs font-bold text-green-700 dark:text-green-400">Authentic certificate</p>
              {studentName && <p className="text-[10px] text-green-600/80 dark:text-green-500/80">Belongs to {studentName}</p>}
            </div>
          </div>
        )}
        {result === "mismatch" && (
          <div className="mt-3 flex items-center gap-2 rounded-none border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-950/20">
            <Shield className="h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs font-bold text-red-700 dark:text-red-400">File doesn't match official record</p>
          </div>
        )}
        {result === "notfound" && (
          <div className="mt-3 flex items-center gap-2 rounded-none border border-orange-200 bg-orange-50 px-3 py-2.5 dark:border-orange-800 dark:bg-orange-950/20">
            <Search className="h-4 w-4 shrink-0 text-orange-500" />
            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Not found in our records</p>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={!file || loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
          {loading ? "Checking…" : "Verify Certificate"}
        </button>
        <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
          Or{" "}
          <Link href="/verify" className="text-blue-600 hover:underline dark:text-blue-400">
            use the full verify page →
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [totalCerts, setTotalCerts] = useState(0);
  const [totalInstitutions, setTotalInstitutions] = useState(0);
  const [recentCerts, setRecentCerts] = useState<Certificate[]>([]);
  const [systemActive, setSystemActive] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [certs, total, inst, info] = await Promise.allSettled([
          getRecentCertificates(6),
          getTotalCertificates(),
          getTotalInstitutions(),
          getNetworkInfo(),
        ]);
        if (certs.status === "fulfilled") setRecentCerts(certs.value);
        if (total.status === "fulfilled") setTotalCerts(total.value);
        if (inst.status === "fulfilled") setTotalInstitutions(inst.value);
        if (info.status === "fulfilled") setSystemActive(true);
      } catch { /* keep defaults */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 180000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid-pattern min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 bg-blue-500/5 dark:bg-blue-500/10" />
        <div className="absolute bottom-0 left-0 -z-10 h-64 w-64 bg-green-500/5 dark:bg-green-500/10" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

            {/* Left — copy */}
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-sm border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium dark:border-green-900 dark:bg-green-950/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <span className="text-green-700 dark:text-green-400">System active — certificates verified in real-time</span>
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                Credentials That{" "}
                <span className="text-glow">Can&apos;t Be</span>{" "}
                <span className="text-glow">Faked</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg text-gray-600 dark:text-gray-400">
                Edulocka lets schools and universities issue digital certificates that anyone can verify in seconds — no calls, no paperwork, no uncertainty.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/verify"
                  className="flex items-center justify-center gap-2 rounded-sm border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600">
                  <Search className="h-4 w-4" />
                  Verify a Certificate
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/student/login"
                  className="flex items-center justify-center gap-2 rounded-sm border-2 border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-900 hover:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white">
                  <GraduationCap className="h-4 w-4" />
                  Student Portal
                </Link>
              </div>

              <div className="mt-10 flex gap-8">
                <div>
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white">{totalCerts}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Certificates issued</p>
                </div>
                <div className="border-l border-gray-200 pl-8 dark:border-gray-700">
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white">{totalInstitutions}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Institutions</p>
                </div>
                <div className="border-l border-gray-200 pl-8 dark:border-gray-700">
                  <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white">100%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verifiable</p>
                </div>
              </div>
            </div>

            {/* Right — quick verify + activity */}
            <div className="flex flex-col gap-3">
              <QuickVerifyWidget />

              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Recent Certificates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Live</span>
                  </div>
                </div>
                <div className="p-3">
                  <ActivityFeed certs={recentCerts} />
                </div>
                <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                  <Link href="/dashboard" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    View dashboard <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Works for <span className="text-glow">everyone involved</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
              Whether you issue certificates, hold them, or need to verify them — Edulocka has a simple path for you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Building2,
                tag: "For Institutions",
                title: "Issue certificates that are permanent and trusted",
                body: "Upload your branding, issue one certificate or thousands at once, and let students download them instantly. Everything is automatically verifiable — no follow-up needed.",
                cta: "Apply as Institution",
                href: "/apply-institution",
                color: "blue",
              },
              {
                icon: GraduationCap,
                tag: "For Students",
                title: "Access and download your credentials anytime",
                body: "Log in with your student ID to view all your certificates, download PDFs, and share a verification link with any employer or institution.",
                cta: "Student Portal",
                href: "/student/login",
                color: "green",
              },
              {
                icon: Users,
                tag: "For Employers & Verifiers",
                title: "Confirm any certificate in seconds",
                body: "Upload the PDF you received or enter the certificate ID. You'll instantly know if it's genuine — no calls, no waiting, no intermediaries.",
                cta: "Verify a Certificate",
                href: "/verify",
                color: "orange",
              },
            ].map((card) => (
              <div key={card.tag}
                className={`flex flex-col rounded-none p-6 ${card.color === "blue" ? "neon-border" : card.color === "green" ? "neon-border-green" : "neon-border-orange"} bg-white dark:bg-gray-900`}>
                <div className={`hexagon mb-4 flex h-12 w-12 items-center justify-center ${
                  card.color === "blue" ? "bg-blue-100 dark:bg-blue-950/50"
                  : card.color === "green" ? "bg-green-100 dark:bg-green-950/50"
                  : "bg-orange-100 dark:bg-orange-950/50"
                }`}>
                  <card.icon className={`h-5 w-5 ${
                    card.color === "blue" ? "text-blue-600 dark:text-blue-400"
                    : card.color === "green" ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                  }`} />
                </div>
                <span className={`mb-2 text-xs font-bold uppercase tracking-wider ${
                  card.color === "blue" ? "text-blue-600 dark:text-blue-400"
                  : card.color === "green" ? "text-green-600 dark:text-green-400"
                  : "text-orange-600 dark:text-orange-400"
                }`}>{card.tag}</span>
                <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{card.title}</h3>
                <p className="mb-5 flex-1 text-sm text-gray-500 dark:text-gray-400">{card.body}</p>
                <Link href={card.href}
                  className={`flex w-fit items-center gap-1.5 rounded-none px-4 py-2 text-sm font-bold text-white ${
                    card.color === "blue" ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500"
                    : card.color === "green" ? "bg-green-600 hover:bg-green-700 dark:bg-green-500"
                    : "bg-orange-500 hover:bg-orange-600"
                  }`}>
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (simple steps) ── */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111111]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
              Four simple steps from issuance to verified trust.
            </p>
          </div>

          <div className="relative mx-auto max-w-4xl">
            {/* Connector line */}
            <div className="absolute left-6 top-6 hidden h-[calc(100%-3rem)] w-0.5 bg-gradient-to-b from-blue-300 via-green-300 to-gray-200 dark:from-blue-800 dark:via-green-800 dark:to-gray-700 md:block" />

            <div className="space-y-6">
              {[
                {
                  step: "1",
                  icon: Building2,
                  title: "Institution applies and gets verified",
                  body: "A school or university submits their details. Our team reviews and approves them — so only real, vetted institutions can issue certificates.",
                  color: "blue",
                },
                {
                  step: "2",
                  icon: FileText,
                  title: "Institution issues a certificate",
                  body: "The institution enters the student's details and issues the certificate. A PDF is generated, stored securely, and a unique ID is recorded.",
                  color: "blue",
                },
                {
                  step: "3",
                  icon: GraduationCap,
                  title: "Student receives and downloads",
                  body: "The student gets an email with their certificate PDF and can log in anytime to view, download, or share it.",
                  color: "green",
                },
                {
                  step: "4",
                  icon: CheckCircle,
                  title: "Anyone can verify in seconds",
                  body: "An employer or institution uploads the PDF or enters the certificate ID — and instantly knows whether it's real and who issued it.",
                  color: "orange",
                },
              ].map((item) => (
                <div key={item.step} className="relative flex gap-6">
                  <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-none border-2 font-mono text-base font-bold ${
                    item.color === "blue" ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    : item.color === "green" ? "border-green-400 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-400"
                    : "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                  }`}>
                    {item.step}
                  </div>
                  <div className="flex-1 rounded-none border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className={`h-4 w-4 ${
                        item.color === "blue" ? "text-blue-500" : item.color === "green" ? "text-green-500" : "text-orange-500"
                      }`} />
                      <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500">
              Learn more about how Edulocka works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <AnimatedCounter target={totalCerts} label="Certificates issued" />
            <AnimatedCounter target={totalInstitutions} label="Authorized institutions" />
            <div className="text-center">
              <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white">Instant</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Verification speed</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white">100%</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Tamper-proof</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY TRUST EDULOCKA ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Why Edulocka certificates <span className="text-glow">can&apos;t be faked</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
              Traditional paper or PDF certificates can be forged. Edulocka makes that impossible.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "Locked record, impossible to alter",
                body: "Every certificate is recorded on a blockchain — a permanent ledger. Once issued, no one — not even us — can change or delete it.",
                color: "blue",
                borderClass: "neon-border",
              },
              {
                icon: Shield,
                title: "Only verified institutions can issue",
                body: "Every institution goes through a verification process before they can issue certificates. If a school isn't in our system, it can't issue credentials.",
                color: "green",
                borderClass: "neon-border-green",
              },
              {
                icon: Eye,
                title: "Anyone can verify, no account needed",
                body: "Verification is open to the world. Employers, universities, and visa offices can check any certificate immediately — no login, no paperwork.",
                color: "orange",
                borderClass: "neon-border-orange",
              },
            ].map((f) => (
              <div key={f.title} className={`rounded-none p-6 ${f.borderClass} bg-white dark:bg-gray-900`}>
                <div className={`hexagon mb-4 flex h-12 w-12 items-center justify-center ${
                  f.color === "blue" ? "bg-blue-100 dark:bg-blue-950/50"
                  : f.color === "green" ? "bg-green-100 dark:bg-green-950/50"
                  : "bg-orange-100 dark:bg-orange-950/50"
                }`}>
                  <f.icon className={`h-5 w-5 ${
                    f.color === "blue" ? "text-blue-600 dark:text-blue-400"
                    : f.color === "green" ? "text-green-600 dark:text-green-400"
                    : "text-orange-600 dark:text-orange-400"
                  }`} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES (institution-focused) ── */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111111]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                <Building2 className="h-3.5 w-3.5" /> For Institutions
              </span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Everything you need to issue <span className="text-glow">trusted credentials</span>
              </h2>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                From your first certificate to thousands — Edulocka handles the entire workflow so you can focus on your students.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: ShieldCheck, text: "Only verified institutions can issue — no impersonation" },
                  { icon: LayoutTemplate, text: "Custom certificate designs with your logo and branding" },
                  { icon: Layers, text: "Issue to hundreds of students at once via spreadsheet upload" },
                  { icon: Mail, text: "Students automatically receive their certificate by email" },
                  { icon: Globe, text: "Certificates are permanently stored and publicly verifiable" },
                  { icon: Zap, text: "Dashboard to track every certificate you've ever issued" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-blue-100 dark:bg-blue-950/50">
                      <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/apply-institution"
                  className="inline-flex items-center gap-2 rounded-sm border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600">
                  <Building2 className="h-4 w-4" />
                  Apply for Authorization
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Pipeline visualization */}
            <div className="flex flex-col justify-center">
              <div className="space-y-3">
                {[
                  { step: "Application", desc: "Submit your institution details and documents", icon: FileText, status: "completed" },
                  { step: "Verification", desc: "We review and confirm your institution", icon: ShieldCheck, status: "completed" },
                  { step: "Authorization", desc: "Your institution is approved to issue certificates", icon: BadgeCheck, status: "completed" },
                  { step: "Template Setup", desc: "Upload your certificate design and branding", icon: LayoutTemplate, status: "completed" },
                  { step: "Issue Certificates", desc: "One at a time or hundreds via spreadsheet", icon: FileCheck, status: "active" },
                  { step: "Student Access", desc: "Students verify and download their credentials", icon: GraduationCap, status: "waiting" },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-none border-2 ${
                        item.status === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : item.status === "active" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.status === "completed" ? "text-green-600 dark:text-green-400"
                          : item.status === "active" ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400"
                        }`} />
                      </div>
                      {i < 5 && <div className={`h-3 w-0.5 ${item.status === "completed" ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600"}`} />}
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

      {/* ── RECENT CERTIFICATES ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Certificates</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Latest credentials issued on the platform</p>
            </div>
            <Link href="/verify" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Verify one <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-none border-2 border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-5 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <span>Recipient</span>
              <span>Credential</span>
              <span>Institution</span>
              <span>Issued</span>
              <span>Status</span>
            </div>

            {recentCerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                No certificates yet.{" "}
                <Link href="/issue" className="text-blue-600 hover:underline">Issue the first one!</Link>
              </div>
            ) : (
              recentCerts.slice(0, 5).map((cert) => (
                <div key={cert.certId}
                  className="grid grid-cols-5 gap-4 border-b border-gray-100 bg-white px-4 py-3 text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50">
                  <span className="truncate text-xs text-gray-900 dark:text-white">{cert.studentName}</span>
                  <span className="truncate text-xs text-gray-600 dark:text-gray-300">{cert.degree}</span>
                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">{cert.institution}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{cert.issueDate}</span>
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    cert.status === "verified" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : cert.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  }`}>
                    {cert.status === "verified" && <CheckCircle className="h-2.5 w-2.5" />}
                    {cert.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                    {cert.status === "verified" ? "Valid" : cert.status === "pending" ? "Pending" : "Revoked"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="neon-border rounded-none bg-white p-8 text-center dark:bg-gray-900 sm:p-12">
            <div className="hexagon mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-blue-600 dark:bg-blue-500">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-gray-500 dark:text-gray-400">
              Institutions can apply in minutes. Students can access their certificates immediately. Anyone can verify for free.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/apply-institution"
                className="flex items-center gap-2 rounded-sm border-2 border-blue-600 bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600">
                <Building2 className="h-4 w-4" /> Apply as Institution
              </Link>
              <Link href="/student/login"
                className="flex items-center gap-2 rounded-sm border-2 border-gray-300 px-8 py-3 text-sm font-bold text-gray-900 hover:border-green-500 dark:border-gray-600 dark:text-white">
                <GraduationCap className="h-4 w-4" /> Student Portal
              </Link>
              <Link href="/verify"
                className="flex items-center gap-2 rounded-sm border-2 border-gray-300 px-8 py-3 text-sm font-bold text-gray-900 hover:border-blue-500 dark:border-gray-600 dark:text-white">
                <Search className="h-4 w-4" /> Verify a Certificate
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
