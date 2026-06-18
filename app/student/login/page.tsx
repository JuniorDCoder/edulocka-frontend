"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building2,
  Search,
  CheckCircle,
  ChevronDown,
  RotateCcw,
  Shield,
  Smartphone,
  KeyRound,
  Mail,
} from "lucide-react";
import {
  lookupStudentById,
  studentLogin,
  mfaChallenge,
  mfaLoginVerify,
  ApiError,
  type StudentLookupResult,
  type StudentLoginResult,
} from "@/lib/api-client";
import { saveStudentSession, isStudentLoggedIn } from "@/lib/student-auth";

type Step = "enter-id" | "pick-institution" | "logging-in" | "mfa-verify";

const MFA_ICONS: Record<string, typeof Smartphone> = {
  authenticator: Smartphone,
  pin: KeyRound,
  email: Mail,
};

const MFA_LABELS: Record<string, string> = {
  authenticator: "Authenticator App",
  pin: "PIN",
  email: "Email Code",
};

export default function StudentLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("enter-id");
  const [studentId, setStudentId] = useState("");
  const [lookupData, setLookupData] = useState<StudentLookupResult | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA state
  const [mfaMethod, setMfaMethod] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEmailHint, setMfaEmailHint] = useState<string | null>(null);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<StudentLoginResult["student"] | null>(null);

  const institutionSelectRef = useRef<HTMLSelectElement>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isStudentLoggedIn()) {
      router.replace("/student/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (step === "pick-institution" && institutionSelectRef.current) {
      institutionSelectRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (step === "mfa-verify" && mfaInputRef.current) {
      mfaInputRef.current.focus();
    }
  }, [step]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = studentId.trim();
    if (!id) { setError("Please enter your Student ID."); return; }

    setError(null);
    setLookupLoading(true);

    try {
      const data = await lookupStudentById(id);
      setLookupData(data);

      if (data.institutions.length === 1) {
        setStep("logging-in");
        await doLogin(id, data.institutions[0].name);
      } else {
        setSelectedInstitution(data.institutions[0].name);
        setStep("pick-institution");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the server. Please try again.");
      }
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstitution) { setError("Please select your institution."); return; }
    setError(null);
    setStep("logging-in");
    await doLogin(studentId.trim(), selectedInstitution);
  }

  async function doLogin(id: string, institution: string) {
    setLoginLoading(true);
    try {
      const result = await studentLogin(id, institution);

      if (result.mfaRequired) {
        setPendingStudent(result.student);
        setSelectedInstitution(institution);

        const challengeResult = await mfaChallenge(id, institution);
        setMfaMethod(challengeResult.method || result.mfaMethod || null);
        setMfaEmailHint(challengeResult.emailHint || null);
        setMfaCode("");
        setStep("mfa-verify");
        return;
      }

      if (result.token) {
        saveStudentSession(result.token, result.student);
        router.push("/student/dashboard");
      }
    } catch (err) {
      setStep(lookupData && lookupData.institutions.length > 1 ? "pick-institution" : "enter-id");
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaCode.trim()) { setError("Please enter the verification code."); return; }

    setError(null);
    setMfaVerifying(true);

    try {
      const result = await mfaLoginVerify(
        studentId.trim(),
        selectedInstitution,
        mfaCode.trim()
      );

      if (result.token) {
        saveStudentSession(result.token, result.student);
        router.push("/student/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setMfaVerifying(false);
    }
  }

  async function handleResendEmailCode() {
    setError(null);
    try {
      const challengeResult = await mfaChallenge(studentId.trim(), selectedInstitution);
      setMfaEmailHint(challengeResult.emailHint || null);
      setError(null);
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  }

  function resetToStart() {
    setStep("enter-id");
    setLookupData(null);
    setSelectedInstitution("");
    setError(null);
    setMfaCode("");
    setMfaMethod(null);
    setPendingStudent(null);
  }

  const isLoading = lookupLoading || loginLoading;
  const MfaIcon = mfaMethod ? MFA_ICONS[mfaMethod] || Shield : Shield;

  return (
    <main className="grid-pattern flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-none bg-blue-600 dark:bg-blue-500">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Student Portal
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Access and download your certificates using your Student ID
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[
            { label: "Enter ID", s: "enter-id" },
            { label: "Select Institution", s: "pick-institution" },
            ...(mfaMethod ? [{ label: "Verify", s: "mfa-verify" }] : []),
          ].map(({ label, s }, i) => {
            const isActive =
              step === s ||
              (step === "logging-in" && s === "pick-institution") ||
              (step === "mfa-verify" && s === "mfa-verify");
            const isDone =
              (s === "enter-id" && step !== "enter-id") ||
              (s === "pick-institution" && step === "mfa-verify");
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${isDone || isActive ? "bg-blue-400" : "bg-gray-300 dark:bg-gray-600"}`} />}
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  isDone ? "bg-green-500 text-white"
                  : isActive ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`hidden text-xs font-medium sm:block ${
                  isActive ? "text-blue-600 dark:text-blue-400" : isDone ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-none border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">

          {/* STEP 1: Enter Student ID */}
          {step === "enter-id" && (
            <form onSubmit={handleLookup} className="p-8 space-y-5">
              <div>
                <label htmlFor="studentId" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => { setStudentId(e.target.value); setError(null); }}
                    placeholder="e.g. STU-2024-001"
                    className="w-full rounded-none border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The ID your institution used when issuing your certificate
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !studentId.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {lookupLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Looking up…</>
                ) : (
                  <>Find My Certificates <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Pick institution */}
          {(step === "pick-institution" || step === "logging-in") && lookupData && (
            <form onSubmit={handleContinue} className="p-8 space-y-5">

              <div className="rounded-none border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/40 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Found {lookupData.total} certificate{lookupData.total !== 1 ? "s" : ""} for{" "}
                    <span className="font-bold">{lookupData.studentName}</span>
                  </p>
                </div>
                <p className="mt-1 pl-6 text-xs text-green-700/80 dark:text-green-400/80">
                  Student ID: <span className="font-mono font-medium">{lookupData.studentId}</span>
                </p>
              </div>

              <div>
                <label htmlFor="institution" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Select your institution
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    id="institution"
                    ref={institutionSelectRef}
                    value={selectedInstitution}
                    onChange={(e) => { setSelectedInstitution(e.target.value); setError(null); }}
                    disabled={step === "logging-in"}
                    className="w-full appearance-none rounded-none border border-gray-300 bg-white py-2.5 pl-9 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {lookupData.institutions.map((inst) => (
                      <option key={inst.name} value={inst.name}>
                        {inst.name} ({inst.count} certificate{inst.count !== 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Only institutions that have issued certificates to your ID are shown
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={step === "logging-in" || !selectedInstitution}
                className="flex w-full items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {step === "logging-in" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Access My Certificates <ArrowRight className="h-4 w-4" /></>
                )}
              </button>

              <button
                type="button"
                onClick={resetToStart}
                disabled={step === "logging-in"}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:pointer-events-none dark:hover:text-gray-300"
              >
                <RotateCcw className="h-3 w-3" /> Use a different Student ID
              </button>
            </form>
          )}

          {/* STEP 3: MFA Verification */}
          {step === "mfa-verify" && (
            <form onSubmit={handleMfaVerify} className="p-8 space-y-5">

              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MfaIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {mfaMethod === "authenticator" && "Enter the 6-digit code from your authenticator app."}
                  {mfaMethod === "pin" && "Enter your security PIN to continue."}
                  {mfaMethod === "email" && (
                    <>A verification code was sent to <strong className="text-gray-700 dark:text-gray-300">{mfaEmailHint || "your email"}</strong>.</>
                  )}
                </p>
              </div>

              {pendingStudent && (
                <div className="rounded-none border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {pendingStudent.studentName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedInstitution} &middot; <span className="font-mono">{pendingStudent.studentId}</span>
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="mfaCode" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {mfaMethod === "pin" ? "Security PIN" : "Verification Code"}
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="mfaCode"
                    ref={mfaInputRef}
                    type={mfaMethod === "pin" ? "password" : "text"}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => { setMfaCode(e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
                    placeholder={mfaMethod === "pin" ? "Enter PIN" : "Enter 6-digit code"}
                    maxLength={mfaMethod === "pin" ? 6 : 6}
                    className="w-full rounded-none border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-center font-mono text-lg tracking-[0.3em] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    disabled={mfaVerifying}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={mfaVerifying || !mfaCode.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {mfaVerifying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                ) : (
                  <><Shield className="h-4 w-4" /> Verify &amp; Sign In</>
                )}
              </button>

              {mfaMethod === "email" && (
                <button
                  type="button"
                  onClick={handleResendEmailCode}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Mail className="h-3 w-3" /> Resend code
                </button>
              )}

              <button
                type="button"
                onClick={resetToStart}
                disabled={mfaVerifying}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:pointer-events-none dark:hover:text-gray-300"
              >
                <RotateCcw className="h-3 w-3" /> Use a different Student ID
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Want to verify a specific certificate?{" "}
          <Link href="/verify" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Use the Verify page
          </Link>
        </p>
      </div>
    </main>
  );
}
