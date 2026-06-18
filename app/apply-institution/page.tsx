"use client";

import { useState, useRef } from "react";
import { useWallet } from "@/lib/wallet-context";
import { submitInstitutionApplication, getApplicationStatus } from "@/lib/api-client";
import { ApplicationStatusBadge } from "@/components/application-status-badge";
import Link from "next/link";
import {
  Building2,
  Wallet,
  Upload,
  FileText,
  Mail,
  Globe,
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  Copy,
  Check,
  User,
  Briefcase,
  Home,
  Download,
  Chrome,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Shield,
  Eye,
  Lock,
  Fingerprint,
  Info,
} from "lucide-react";

const COUNTRIES = [
  "Cameroon",
  "Australia", "Brazil", "Canada", "China", "France", "Germany", "Ghana",
  "India", "Japan", "Kenya", "Nigeria", "Saudi Arabia", "Singapore",
  "South Africa", "South Korea", "UAE", "United Kingdom", "United States",
  "Other",
];

const WALLET_GUIDE_STEPS = [
  {
    number: 1,
    title: "Install MetaMask Browser Extension",
    icon: Download,
    content: (
      <>
        <p className="mb-3">
          MetaMask is a free, secure browser extension that acts as your digital wallet on the blockchain.
          It works with Chrome, Firefox, Brave, and Edge browsers.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#f6851b] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#e2761b]"
          >
            <Download className="h-3.5 w-3.5" />
            Download MetaMask
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
          Only install MetaMask from the official website (metamask.io). Never install from unofficial sources.
        </p>
      </>
    ),
  },
  {
    number: 2,
    title: "Create Your Wallet",
    icon: Wallet,
    content: (
      <>
        <p className="mb-2">After installing MetaMask:</p>
        <ol className="mb-3 space-y-1.5 pl-4 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">a</span>
            <span>Click the MetaMask fox icon in your browser toolbar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">b</span>
            <span>Select &quot;Create a new wallet&quot;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">c</span>
            <span>Create a strong password you&apos;ll remember</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">d</span>
            <span>
              <strong className="text-red-600 dark:text-red-400">IMPORTANT:</strong> Write down your 12-word Secret Recovery Phrase on paper and store it safely.
              This is the ONLY way to recover your wallet. Never share it with anyone.
            </span>
          </li>
        </ol>
      </>
    ),
  },
  {
    number: 3,
    title: "Secure Your Recovery Phrase",
    icon: Shield,
    content: (
      <>
        <div className="mb-3 rounded-sm border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
          <p className="text-xs font-bold text-red-700 dark:text-red-400">
            Your 12-word Secret Recovery Phrase is like the master key to your institution&apos;s wallet.
          </p>
        </div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span>Write it on paper and store in a secure location (e.g., a safe)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span>Consider making a second copy stored in a different secure location</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span><strong>Never</strong> share it via WhatsApp, email, or any digital channel</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span><strong>Never</strong> take a screenshot or photo of it</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>Edulocka staff will <strong>never</strong> ask you for your recovery phrase</span>
          </li>
        </ul>
      </>
    ),
  },
  {
    number: 4,
    title: "Connect Your Wallet Below",
    icon: Fingerprint,
    content: (
      <>
        <p className="mb-2">
          Once MetaMask is installed and your wallet is created, click the
          <strong className="text-blue-600 dark:text-blue-400"> &quot;Connect MetaMask Wallet&quot; </strong>
          button in Step 2 of this form. MetaMask will pop up asking you to authorize the connection.
        </p>
        <p className="text-sm">
          Your wallet address will be automatically detected and linked to your institution&apos;s application.
          This is the address that will be authorized on the blockchain to issue certificates once approved.
        </p>
      </>
    ),
  },
];

function WalletSetupGuide({ onDismiss }: { onDismiss: () => void }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  return (
    <div className="mb-8 overflow-hidden rounded-sm border border-blue-200 bg-gradient-to-b from-blue-50 to-white dark:border-blue-800/50 dark:from-blue-950/30 dark:to-[#111]">
      {/* Guide Header */}
      <div className="border-b border-blue-100 bg-blue-600 px-6 py-5 dark:border-blue-800/50 dark:bg-blue-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-white/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-mono text-lg font-bold text-white">
                Wallet Setup Guide
              </h2>
              <p className="mt-0.5 text-sm text-blue-100">
                You need a blockchain wallet to register your institution. Follow these steps to get started.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-sm bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Must Read
          </span>
        </div>
      </div>

      {/* What is a Wallet? */}
      <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-4 dark:border-blue-800/30 dark:bg-blue-950/10">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              What is a blockchain wallet?
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              A blockchain wallet is like a digital identity for your institution on the Edulocka network.
              It generates a unique address (like an account number) that identifies your institution
              when issuing certificates. Unlike traditional accounts, you control the wallet directly &mdash;
              no one else has access. The wallet is free to create and does not require any cryptocurrency to use with Edulocka.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 py-4">
        <div className="space-y-2">
          {WALLET_GUIDE_STEPS.map((step) => {
            const isExpanded = expandedStep === step.number;
            const Icon = step.icon;
            return (
              <div key={step.number} className="rounded-sm border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isExpanded
                      ? "bg-blue-600 text-white dark:bg-blue-500"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {step.number}
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <Icon className={`h-4 w-4 ${isExpanded ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                    <span className={`text-sm font-medium ${isExpanded ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {step.title}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                    {step.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guide Footer */}
      <div className="flex items-center justify-between border-t border-blue-100 bg-blue-50/30 px-6 py-3 dark:border-blue-800/30 dark:bg-blue-950/10">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Already have MetaMask installed? You can skip straight to the application form.
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-sm bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          I&apos;m Ready &mdash; Continue to Form
        </button>
      </div>
    </div>
  );
}

export default function ApplyInstitutionPage() {
  const { wallet, connect } = useWallet();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Track application status
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState<Record<string, unknown> | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [showTracker, setShowTracker] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    institutionName: "",
    registrationNumber: "",
    country: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    description: "",
    authorizedPersonName: "",
    authorizedPersonTitle: "",
    physicalAddress: "",
  });

  // File refs
  const regCertRef = useRef<HTMLInputElement>(null);
  const accreditRef = useRef<HTMLInputElement>(null);
  const intentRef = useRef<HTMLInputElement>(null);
  const idDocRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{
    registrationCert?: File;
    accreditationProof?: File;
    letterOfIntent?: File;
    idDocument?: File;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFiles({ ...files, [field]: e.target.files[0] });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitInstitutionApplication({
        ...formData,
        walletAddress: wallet.address,
        documents: files,
      });
      setApplicationId(result.applicationId);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    setIsTracking(true);
    setTrackResult(null);
    try {
      const result = await getApplicationStatus(trackId.trim());
      setTrackResult(result as unknown as Record<string, unknown>);
    } catch {
      setTrackResult({ error: "Application not found" } as Record<string, unknown>);
    } finally {
      setIsTracking(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(applicationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceed = (s: number) => {
    if (s === 1) {
      return formData.institutionName && formData.registrationNumber && formData.country;
    }
    if (s === 2) {
      return formData.contactEmail && formData.authorizedPersonName && wallet.connected;
    }
    return true;
  };

  // ── Success Screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-sm border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600 dark:text-green-400" />
          <h1 className="mb-2 font-mono text-2xl font-bold text-green-800 dark:text-green-300">
            Application Submitted
          </h1>
          <p className="mb-6 text-sm text-green-700 dark:text-green-400">
            Your institution application has been submitted for review. Save your application ID to track its status.
          </p>

          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-green-300 bg-white px-4 py-2 font-mono text-sm dark:border-green-700 dark:bg-gray-900">
            <span className="text-gray-700 dark:text-gray-300">{applicationId}</span>
            <button onClick={copyId} className="text-green-600 hover:text-green-800 dark:text-green-400">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/issue"
              className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Issue Certificates
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-mono text-3xl font-bold text-gray-900 dark:text-white">
          Apply for Institution Authorization
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Submit your institution details for verification. Once approved, you&apos;ll be authorized on the blockchain to issue certificates.
        </p>
      </div>

      {/* Wallet Setup Guide */}
      {showGuide && (
        <WalletSetupGuide onDismiss={() => setShowGuide(false)} />
      )}

      {/* Show guide again button */}
      {!showGuide && (
        <button
          onClick={() => setShowGuide(true)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <BookOpen className="h-4 w-4" />
          Show Wallet Setup Guide
        </button>
      )}

      {/* Track Existing Application Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowTracker(!showTracker)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <Search className="h-4 w-4" />
          {showTracker ? "Hide" : "Track"} existing application
        </button>

        {showTracker && (
          <div className="mt-3 rounded-sm border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder="Enter Application ID..."
                className="flex-1 rounded-sm border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              />
              <button
                onClick={handleTrack}
                disabled={isTracking}
                className="rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
              </button>
            </div>
            {trackResult && (
              <div className="mt-3 text-sm">
                {"error" in trackResult ? (
                  <p className="text-red-600 dark:text-red-400">{String(trackResult.error)}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Institution:</strong> {String(trackResult.institutionName || "N/A")}
                    </p>
                    <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <strong>Status:</strong> <ApplicationStatusBadge status={String(trackResult.status || "")} />
                    </p>
                    {Boolean(trackResult.authorizedOnChain) && (
                      <p className="text-green-600 dark:text-green-400">✅ Authorized on blockchain</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-0">
        {[
          { n: 1, label: "Institution Info" },
          { n: 2, label: "Contact & Wallet" },
          { n: 3, label: "Documents" },
          { n: 4, label: "Review & Submit" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                step >= s.n
                  ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                  : "border-gray-300 text-gray-400 dark:border-gray-600"
              }`}
            >
              {step > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
            </div>
            <span
              className={`ml-2 hidden text-xs font-medium sm:inline ${
                step >= s.n ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < 3 && (
              <div className={`mx-3 h-0.5 w-8 sm:w-12 ${step > s.n ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Institution Info */}
      {step === 1 && (
        <div className="space-y-5 rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#111]">
          <h2 className="flex items-center gap-2 font-mono text-lg font-bold text-gray-900 dark:text-white">
            <Building2 className="h-5 w-5 text-blue-600" />
            Institution Information
          </h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Institution Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="institutionName"
              value={formData.institutionName}
              onChange={handleChange}
              placeholder="University of Technology"
              className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              placeholder="REG-2024-001"
              className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of your institution..."
              rows={3}
              className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceed(1)}
              className="flex items-center gap-2 rounded-sm bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Contact & Wallet */}
      {step === 2 && (
        <div className="space-y-5 rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#111]">
          <h2 className="flex items-center gap-2 font-mono text-lg font-bold text-gray-900 dark:text-white">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact & Wallet
          </h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="admin@university.edu"
                className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://university.edu"
                  className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Authorized Person */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Authorized Person Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="authorizedPersonName"
                  value={formData.authorizedPersonName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title / Position</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="authorizedPersonTitle"
                  value={formData.authorizedPersonTitle}
                  onChange={handleChange}
                  placeholder="Registrar, Dean, etc."
                  className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Physical Address</label>
            <div className="relative">
              <Home className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="physicalAddress"
                value={formData.physicalAddress}
                onChange={handleChange}
                placeholder="123 University Ave, City, State"
                className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>
          </div>

          {/* Wallet Connection */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Wallet Address <span className="text-red-500">*</span>
            </label>
            {wallet.connected ? (
              <div className="flex items-center gap-2 rounded-sm border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-800 dark:bg-green-950/20">
                <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-mono text-green-700 dark:text-green-300">{wallet.address}</span>
                <CheckCircle className="ml-auto h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div>
                <button
                  onClick={connect}
                  className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <Wallet className="h-4 w-4" />
                  Connect MetaMask Wallet
                </button>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Don&apos;t have MetaMask?{" "}
                  <button
                    type="button"
                    onClick={() => { setShowGuide(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="font-medium underline hover:no-underline"
                  >
                    Read the wallet setup guide above
                  </button>
                </p>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              This wallet address will be authorized on the blockchain to issue certificates.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceed(2)}
              className="flex items-center gap-2 rounded-sm bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {step === 3 && (
        <div className="space-y-5 rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#111]">
          <h2 className="flex items-center gap-2 font-mono text-lg font-bold text-gray-900 dark:text-white">
            <Upload className="h-5 w-5 text-blue-600" />
            Supporting Documents
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload documents to support your application. Accepted formats: PDF, JPG, PNG (max 10MB each).
          </p>

          {[
            { key: "registrationCert", label: "Registration Certificate", ref: regCertRef, required: true },
            { key: "accreditationProof", label: "Accreditation Proof", ref: accreditRef, required: false },
            { key: "letterOfIntent", label: "Letter of Intent", ref: intentRef, required: false },
            { key: "idDocument", label: "ID Document (Authorized Representative)", ref: idDocRef, required: true },
          ].map(({ key, label, ref, required }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <div
                onClick={() => ref.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500"
              >
                {files[key as keyof typeof files] ? (
                  <>
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700 dark:text-gray-300">{files[key as keyof typeof files]!.name}</span>
                    <CheckCircle className="ml-auto h-4 w-4 text-green-600" />
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Click to upload {label.toLowerCase()}
                  </>
                )}
              </div>
              <input
                ref={ref}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange(key)}
                className="hidden"
              />
            </div>
          ))}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-2 rounded-sm bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-5 rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#111]">
          <h2 className="flex items-center gap-2 font-mono text-lg font-bold text-gray-900 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Review Your Application
          </h2>

          <div className="space-y-4 rounded-sm border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-400">Institution</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.institutionName}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-400">Registration #</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">{formData.registrationNumber}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-400">Country</span>
                <span className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
                  <MapPin className="h-3 w-3" /> {formData.country}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-400">Email</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.contactEmail}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-400">Authorized Person</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.authorizedPersonName}
                  {formData.authorizedPersonTitle && <span className="text-gray-500"> — {formData.authorizedPersonTitle}</span>}
                </span>
              </div>
              {formData.physicalAddress && (
                <div className="sm:col-span-2">
                  <span className="block text-xs uppercase tracking-wider text-gray-400">Physical Address</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formData.physicalAddress}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="block text-xs uppercase tracking-wider text-gray-400">Wallet</span>
                <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">{wallet.address}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-xs uppercase tracking-wider text-gray-400">Documents</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(files).map(([key, file]) => (
                    <span key={key} className="inline-flex items-center gap-1 rounded-sm bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <FileText className="h-3 w-3" />
                      {file.name}
                    </span>
                  ))}
                  {Object.keys(files).length === 0 && (
                    <span className="text-xs text-gray-400">No documents uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400">
            <strong>Note:</strong> By submitting, you confirm that all information is accurate. False applications may result in permanent blocking.
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-sm bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
