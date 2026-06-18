"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Download,
  ExternalLink,
  LogOut,
  Building2,
  Award,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Hash,
  Calendar,
  RefreshCw,
  Shield,
  Filter,
  ShieldCheck,
} from "lucide-react";
import {
  getStudentCertificates,
  getStudentProfile,
  getCertificatePdfUrl,
  ApiError,
  type StudentCertificate,
  type StudentProfile,
} from "@/lib/api-client";
import {
  getStudentToken,
  getStoredStudentProfile,
  clearStudentSession,
  isStudentLoggedIn,
  type StoredStudentProfile,
} from "@/lib/student-auth";
import { HashDisplay } from "@/components/hash-display";

function formatDate(value: string | number | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function truncateHash(hash: string | null | undefined, chars = 8) {
  if (!hash) return "—";
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "issued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
        <CheckCircle className="h-3 w-3" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      Revoked
    </span>
  );
}

function CertificateCard({ cert }: { cert: StudentCertificate }) {
  const pdfUrl = getCertificatePdfUrl(cert.certId);
  const verifyUrl = `/verify?certId=${encodeURIComponent(cert.certId)}`;
  const txHash = cert.blockchain.txHash;
  const isRevoked = cert.status === "revoked";

  return (
    <div
      className={`rounded-none border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900 ${
        isRevoked
          ? "border-red-200 dark:border-red-800/40"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Award className={`h-4 w-4 shrink-0 ${isRevoked ? "text-red-400" : "text-blue-500"}`} />
            <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">{cert.degree}</h3>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{cert.institution}</span>
          </p>
        </div>
        <StatusBadge status={cert.status} />
      </div>

      {/* Details */}
      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-gray-400 dark:text-gray-500">Issue Date</dt>
          <dd className="font-medium text-gray-700 dark:text-gray-300">{formatDate(cert.issueDate)}</dd>
        </div>
        <div>
          <dt className="text-gray-400 dark:text-gray-500">Certificate ID</dt>
          <dd className="font-mono font-medium text-gray-700 dark:text-gray-300">{truncateHash(cert.certId, 6)}</dd>
        </div>
        {txHash && (
          <div className="col-span-2">
            <dt className="mb-0.5 text-gray-400 dark:text-gray-500">Transaction Hash</dt>
            <dd>
              <HashDisplay hash={txHash} truncate />
            </dd>
          </div>
        )}
      </dl>

      {isRevoked && cert.revokedAt && (
        <div className="mb-3 flex items-center gap-1.5 rounded-none border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Revoked on {formatDate(cert.revokedAt)}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1.5 rounded-none border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </a>
        <Link
          href={verifyUrl}
          className="inline-flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Shield className="h-3.5 w-3.5" />
          Verify
        </Link>
        {cert.ipfs.ipfsHash && (
          <a
            href={`https://ipfs.io/ipfs/${cert.ipfs.ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            IPFS
          </a>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [storedProfile, setStoredProfile] = useState<StoredStudentProfile | null>(null);
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "issued" | "revoked">("all");
  const [filterInstitution, setFilterInstitution] = useState<string>("");

  const loadData = useCallback(async () => {
    const token = getStudentToken();
    if (!token || !isStudentLoggedIn()) {
      router.replace("/student/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [certsRes, profileRes] = await Promise.all([
        getStudentCertificates(token),
        getStudentProfile(token),
      ]);
      setCertificates(certsRes.certificates);
      setProfile(profileRes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearStudentSession();
        router.replace("/student/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load your certificates.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const sp = getStoredStudentProfile();
    setStoredProfile(sp);

    if (!isStudentLoggedIn()) {
      router.replace("/student/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  function handleLogout() {
    clearStudentSession();
    router.push("/student/login");
  }

  // Derive institution list from certificates for the filter dropdown
  const institutionList = Array.from(new Set(certificates.map((c) => c.institution))).sort();

  const filtered = certificates.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterInstitution && c.institution !== filterInstitution) return false;
    return true;
  });

  const displayName = profile?.studentName || storedProfile?.studentName || "Student";
  const displayId = profile?.studentId || storedProfile?.studentId || "";

  return (
    <main className="grid-pattern min-h-screen"><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none bg-blue-600 dark:bg-blue-500">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Student ID: <span className="font-mono font-medium">{displayId}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/student/security"
            className="inline-flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Security
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-none border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: profile.stats.total, icon: FileText, color: "text-blue-600 dark:text-blue-400" },
            { label: "Valid", value: profile.stats.issued, icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
            { label: "Revoked", value: profile.stats.revoked, icon: XCircle, color: "text-red-500 dark:text-red-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-none border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Institutions row */}
      {profile && profile.institutions.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Institutions:</span>
          {profile.institutions.map((inst) => (
            <span
              key={inst}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-400"
            >
              <Building2 className="h-3 w-3" />
              {inst}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      {certificates.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            Filter:
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "issued" | "revoked")}
            className="rounded-none border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">All statuses</option>
            <option value="issued">Valid only</option>
            <option value="revoked">Revoked only</option>
          </select>

          {institutionList.length > 1 && (
            <select
              value={filterInstitution}
              onChange={(e) => setFilterInstitution(e.target.value)}
              className="rounded-none border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="">All institutions</option>
              {institutionList.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          )}

          {(filterStatus !== "all" || filterInstitution) && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterInstitution(""); }}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} of {certificates.length}
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadData}
            className="rounded-none border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-none border border-dashed border-gray-300 py-20 text-center dark:border-gray-600">
          <GraduationCap className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {certificates.length === 0 ? "No certificates found." : "No certificates match these filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cert) => (
            <CertificateCard key={cert.certId} cert={cert} />
          ))}
        </div>
      )}
    </div></main>
  );
}
