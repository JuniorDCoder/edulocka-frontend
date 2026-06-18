"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Smartphone,
  KeyRound,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  GraduationCap,
  Copy,
  Check,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import {
  getMfaStatus,
  setupMfaAuthenticator,
  verifyMfaAuthenticator,
  setupMfaPin,
  setupMfaEmail,
  verifyMfaEmail,
  disableMfa,
  ApiError,
  type MfaStatus,
} from "@/lib/api-client";
import {
  getStudentToken,
  getStoredStudentProfile,
  isStudentLoggedIn,
} from "@/lib/student-auth";

type SetupFlow = null | "authenticator" | "pin" | "email";

export default function StudentSecurityPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Setup flows
  const [setupFlow, setSetupFlow] = useState<SetupFlow>(null);
  const [flowLoading, setFlowLoading] = useState(false);

  // Authenticator setup
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  // PIN setup
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  // Email setup
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Disable confirmation
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const profile = getStoredStudentProfile();

  const loadStatus = useCallback(async () => {
    const token = getStudentToken();
    if (!token || !isStudentLoggedIn()) {
      router.replace("/student/login");
      return;
    }
    setLoading(true);
    try {
      const s = await getMfaStatus(token);
      setStatus(s);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/student/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load MFA status.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isStudentLoggedIn()) {
      router.replace("/student/login");
      return;
    }
    loadStatus();
  }, [loadStatus, router]);

  function resetFlow() {
    setSetupFlow(null);
    setTotpSecret("");
    setTotpUri("");
    setTotpCode("");
    setPin("");
    setPinConfirm("");
    setEmail("");
    setEmailCode("");
    setEmailSent(false);
    setError(null);
    setSuccess(null);
  }

  // ── Authenticator Flow ──────────────────────────────────────────────────

  async function startAuthenticatorSetup() {
    const token = getStudentToken();
    if (!token) return;
    resetFlow();
    setSetupFlow("authenticator");
    setFlowLoading(true);
    try {
      const result = await setupMfaAuthenticator(token);
      setTotpSecret(result.secret);
      setTotpUri(result.otpauthUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start authenticator setup.");
    } finally {
      setFlowLoading(false);
    }
  }

  async function confirmAuthenticator() {
    const token = getStudentToken();
    if (!token || !totpCode.trim()) return;
    setFlowLoading(true);
    setError(null);
    try {
      await verifyMfaAuthenticator(token, totpCode.trim());
      setSuccess("Authenticator app verified! MFA is now enabled.");
      resetFlow();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setFlowLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(totpSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  // ── PIN Flow ────────────────────────────────────────────────────────────

  async function confirmPin() {
    const token = getStudentToken();
    if (!token) return;

    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4-6 digits.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("PINs do not match.");
      return;
    }

    setFlowLoading(true);
    setError(null);
    try {
      await setupMfaPin(token, pin);
      setSuccess("PIN set! MFA is now enabled.");
      resetFlow();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set PIN.");
    } finally {
      setFlowLoading(false);
    }
  }

  // ── Email Flow ──────────────────────────────────────────────────────────

  async function sendEmailCode() {
    const token = getStudentToken();
    if (!token || !email.trim()) return;

    setFlowLoading(true);
    setError(null);
    try {
      await setupMfaEmail(token, email.trim());
      setEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setFlowLoading(false);
    }
  }

  async function confirmEmailCode() {
    const token = getStudentToken();
    if (!token || !emailCode.trim()) return;

    setFlowLoading(true);
    setError(null);
    try {
      await verifyMfaEmail(token, emailCode.trim());
      setSuccess("Email verified! MFA is now enabled.");
      resetFlow();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setFlowLoading(false);
    }
  }

  // ── Disable MFA ─────────────────────────────────────────────────────────

  async function handleDisable() {
    const token = getStudentToken();
    if (!token) return;

    setDisabling(true);
    setError(null);
    try {
      await disableMfa(token);
      setSuccess("MFA has been disabled.");
      setShowDisableConfirm(false);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable MFA.");
    } finally {
      setDisabling(false);
    }
  }

  if (loading) {
    return (
      <main className="grid-pattern flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </main>
    );
  }

  return (
    <main className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/student/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-none border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage two-factor authentication for your account
            </p>
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-none border border-green-200 bg-green-50 p-4 dark:border-green-800/40 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && !setupFlow && (
          <div className="mb-6 flex items-center gap-2 rounded-none border border-red-200 bg-red-50 p-4 dark:border-red-800/40 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Status */}
        <div className="mb-6 rounded-none border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.mfaEnabled ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <ShieldOff className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {status?.mfaEnabled
                    ? `Enabled via ${status.mfaMethod === "authenticator" ? "Authenticator App" : status.mfaMethod === "pin" ? "PIN" : "Email"}`
                    : "Not enabled — your account uses only your Student ID to sign in"
                  }
                </p>
              </div>
            </div>
            {status?.mfaEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3 w-3" /> Active
              </span>
            )}
          </div>
        </div>

        {/* Setup Options (when MFA is not enabled or no active flow) */}
        {!setupFlow && !status?.mfaEnabled && (
          <div className="space-y-3">
            <p className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Choose a verification method to secure your account:
            </p>

            {/* Authenticator App */}
            <button
              onClick={startAuthenticatorSetup}
              className="flex w-full items-center gap-4 rounded-none border border-gray-200 bg-white p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-purple-100 dark:bg-purple-900/30">
                <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Authenticator App</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use Google Authenticator, Authy, or any TOTP app to generate codes
                </p>
              </div>
              <span className="rounded-none bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                Recommended
              </span>
            </button>

            {/* PIN */}
            <button
              onClick={() => { resetFlow(); setSetupFlow("pin"); }}
              className="flex w-full items-center gap-4 rounded-none border border-gray-200 bg-white p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-amber-100 dark:bg-amber-900/30">
                <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Security PIN</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Set a 4-6 digit PIN that you&apos;ll enter each time you log in
                </p>
              </div>
            </button>

            {/* Email */}
            <button
              onClick={() => { resetFlow(); setSetupFlow("email"); }}
              className="flex w-full items-center gap-4 rounded-none border border-gray-200 bg-white p-5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Email Verification</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive a one-time code via email each time you log in
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Authenticator Setup Flow */}
        {setupFlow === "authenticator" && (
          <div className="rounded-none border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <Smartphone className="h-4 w-4 text-purple-500" />
              Set Up Authenticator App
            </h3>

            {flowLoading && !totpSecret ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Step 1: Open your authenticator app and scan this QR code, or enter the secret key manually.
                  </p>
                  {totpUri && (
                    <div className="mb-3 flex justify-center rounded-none border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                        alt="TOTP QR Code"
                        width={200}
                        height={200}
                        className="rounded"
                      />
                    </div>
                  )}
                  {totpSecret && (
                    <div className="flex items-center gap-2 rounded-none border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                      <span className="flex-1 font-mono text-xs tracking-wider text-gray-700 dark:text-gray-300">
                        {totpSecret}
                      </span>
                      <button onClick={copySecret} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {secretCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Step 2: Enter the 6-digit code from your app to verify.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full rounded-none border border-gray-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={resetFlow} className="flex-1 rounded-none border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                  <button
                    onClick={confirmAuthenticator}
                    disabled={flowLoading || totpCode.length < 6}
                    className="flex flex-1 items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500"
                  >
                    {flowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Verify &amp; Enable
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PIN Setup Flow */}
        {setupFlow === "pin" && (
          <div className="rounded-none border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Set Up Security PIN
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Enter a 4-6 digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Enter PIN"
                  maxLength={6}
                  className="w-full rounded-none border border-gray-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Confirm PIN"
                  maxLength={6}
                  className="w-full rounded-none border border-gray-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={resetFlow} className="flex-1 rounded-none border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button
                  onClick={confirmPin}
                  disabled={flowLoading || pin.length < 4 || pin !== pinConfirm}
                  className="flex flex-1 items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500"
                >
                  {flowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Set PIN &amp; Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Setup Flow */}
        {setupFlow === "email" && (
          <div className="rounded-none border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <Mail className="h-4 w-4 text-blue-500" />
              Set Up Email Verification
            </h3>

            <div className="space-y-4">
              {!emailSent ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Email address for verification codes
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-none border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={resetFlow} className="flex-1 rounded-none border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                    <button
                      onClick={sendEmailCode}
                      disabled={flowLoading || !email.includes("@")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500"
                    >
                      {flowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Send Code
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-none border border-green-200 bg-green-50 p-3 dark:border-green-800/40 dark:bg-green-950/20">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Code sent to <strong>{email}</strong>. Check your inbox.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Enter verification code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full rounded-none border border-gray-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={resetFlow} className="flex-1 rounded-none border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                    <button
                      onClick={confirmEmailCode}
                      disabled={flowLoading || emailCode.length < 6}
                      className="flex flex-1 items-center justify-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500"
                    >
                      {flowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Verify &amp; Enable
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Disable MFA (when enabled) */}
        {status?.mfaEnabled && !setupFlow && (
          <div className="mt-6 rounded-none border border-red-200 bg-white p-6 dark:border-red-800/40 dark:bg-gray-900">
            <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Disable MFA</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Disabling MFA will remove the extra security layer from your account. You&apos;ll only need your Student ID to sign in.
            </p>

            {!showDisableConfirm ? (
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="rounded-none border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                Disable Two-Factor Authentication
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-none border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Are you sure? This will remove all MFA protection.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisableConfirm(false)}
                    className="flex-1 rounded-none border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Keep MFA
                  </button>
                  <button
                    onClick={handleDisable}
                    disabled={disabling}
                    className="flex flex-1 items-center justify-center gap-2 rounded-none bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                    Yes, Disable
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Change MFA Method */}
        {status?.mfaEnabled && !setupFlow && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Want to switch methods? Disable MFA first, then set up a new method.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
