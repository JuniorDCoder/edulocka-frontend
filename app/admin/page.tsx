"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import { getContractOwner, getAllInstitutions } from "@/lib/contract";
import {
  ApiError,
  adminListApplications,
  adminGetStats,
  adminGetApplication,
  adminApproveApplication,
  adminRejectApplication,
  adminDeauthorizeInstitution,
  adminListBlogs,
  adminReviewBlog,
  adminDeleteBlog,
  adminListBlogLogs,
  type BlogPost,
  type BlogAuditLogEntry,
  type BlogStatus,
} from "@/lib/api-client";
import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { InstitutionBadge } from "@/components/institution-badge";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import { ethers } from "ethers";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldX,
  Building2,
  Wallet,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
  ChevronRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Ban,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  X,
  Download,
  FileImage,
  PenSquare,
  Trash2,
  Clock3,
} from "lucide-react";

type Tab = "overview" | "applications" | "institutions" | "blogs";

interface AuthData {
  address: string;
  signature: string;
  message: string;
}

type ModerationAction = "approve" | "reject";

const blogStatusFilters: Array<{ value: "all" | BlogStatus; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "pending_review", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminPage() {
  const { wallet, connect } = useWallet();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Stats
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Applications
  const [applications, setApplications] = useState<Record<string, unknown>[]>([]);
  const [appFilter, setAppFilter] = useState<string>("all");
  const [appSearch, setAppSearch] = useState("");
  const [loadingApps, setLoadingApps] = useState(false);
  const [totalApps, setTotalApps] = useState(0);

  // Institutions
  const [institutions, setInstitutions] = useState<Record<string, unknown>[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Blogs
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogFilter, setBlogFilter] = useState<"all" | BlogStatus>("all");
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [blogSummary, setBlogSummary] = useState({
    pendingReview: 0,
    published: 0,
    drafts: 0,
    rejected: 0,
  });

  // Blog logs
  const [blogLogs, setBlogLogs] = useState<BlogAuditLogEntry[]>([]);
  const [loadingBlogLogs, setLoadingBlogLogs] = useState(false);

  // Detail view
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Deauthorize modal
  const [deauthTarget, setDeauthTarget] = useState<{ address: string; name: string } | null>(null);
  const [deauthReason, setDeauthReason] = useState("");

  // Blog moderation modal
  const [blogModerationTarget, setBlogModerationTarget] = useState<{
    blogId: string;
    title: string;
    action: ModerationAction;
  } | null>(null);
  const [blogModerationNote, setBlogModerationNote] = useState("");

  // Blog delete modal
  const [blogDeleteTarget, setBlogDeleteTarget] = useState<BlogPost | null>(null);
  const [blogDeleteConfirm, setBlogDeleteConfirm] = useState("");

  const [copied, setCopied] = useState<string | null>(null);

  const handleUnauthorizedAdminError = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 401) {
      setAuth(null);
      setAuthError("Admin session expired. Sign again to continue.");
      return true;
    }
    return false;
  }, []);

  // Check if wallet is owner
  useEffect(() => {
    (async () => {
      if (!wallet.connected) {
        setIsOwner(null);
        setChecking(false);
        return;
      }
      try {
        const owner = await getContractOwner();
        setIsOwner(owner.toLowerCase() === wallet.address.toLowerCase());
      } catch {
        setIsOwner(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [wallet.connected, wallet.address]);

  // Sign admin message
  const signAdmin = useCallback(async () => {
    if (!wallet.connected || !window.ethereum) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Edulocka Admin: ${timestamp}`;
      const signature = await signer.signMessage(message);
      setAuth({ address: wallet.address, signature, message });
    } catch (err) {
      console.error("Sign failed:", err);
      setAuthError(err instanceof Error ? err.message : "Failed to sign admin message.");
    } finally {
      setSigningIn(false);
    }
  }, [wallet.connected, wallet.address]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!auth) return;
    setLoadingStats(true);
    try {
      const data = await adminGetStats(auth);
      setStats(data);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) {
        setStats(null);
        return;
      }
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [auth, handleUnauthorizedAdminError]);

  // Load applications
  const loadApplications = useCallback(async () => {
    if (!auth) return;
    setLoadingApps(true);
    try {
      const params: Record<string, string | number> = {};
      if (appFilter !== "all") params.status = appFilter;
      if (appSearch) params.search = appSearch;
      const data = await adminListApplications(auth, params as { status?: string; search?: string });
      setApplications(data.applications);
      setTotalApps(data.total);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) {
        setApplications([]);
        setTotalApps(0);
        return;
      }
      setApplications([]);
      setTotalApps(0);
    } finally {
      setLoadingApps(false);
    }
  }, [auth, appFilter, appSearch, handleUnauthorizedAdminError]);

  // Load institutions
  const loadInstitutions = useCallback(async () => {
    if (!auth) return;
    setLoadingInstitutions(true);
    try {
      // Get on-chain institutions
      const onChain = await getAllInstitutions();
      setInstitutions(onChain as unknown as Record<string, unknown>[]);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) {
        setInstitutions([]);
        return;
      }
      setInstitutions([]);
    } finally {
      setLoadingInstitutions(false);
    }
  }, [auth, handleUnauthorizedAdminError]);

  // Load blogs for admin moderation
  const loadBlogs = useCallback(async () => {
    if (!auth) return;
    setLoadingBlogs(true);
    try {
      const data = await adminListBlogs(auth, {
        status: blogFilter,
        search: blogSearch || undefined,
        limit: 50,
      });
      setBlogs(data.blogs);
      setBlogSummary(data.summary);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) {
        setBlogs([]);
        setBlogSummary({
          pendingReview: 0,
          published: 0,
          drafts: 0,
          rejected: 0,
        });
        return;
      }
      setBlogs([]);
      setBlogSummary({
        pendingReview: 0,
        published: 0,
        drafts: 0,
        rejected: 0,
      });
    } finally {
      setLoadingBlogs(false);
    }
  }, [auth, blogFilter, blogSearch, handleUnauthorizedAdminError]);

  // Load blog logs
  const loadBlogLogs = useCallback(async () => {
    if (!auth) return;
    setLoadingBlogLogs(true);
    try {
      const data = await adminListBlogLogs(auth, { limit: 20 });
      setBlogLogs(data.logs);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) {
        setBlogLogs([]);
        return;
      }
      setBlogLogs([]);
    } finally {
      setLoadingBlogLogs(false);
    }
  }, [auth, handleUnauthorizedAdminError]);

  // Auto-load data when auth is set
  useEffect(() => {
    if (auth) {
      loadStats();
      loadApplications();
    }
  }, [auth, loadStats, loadApplications]);

  useEffect(() => {
    if (auth && activeTab === "institutions") {
      loadInstitutions();
    }
  }, [auth, activeTab, loadInstitutions]);

  useEffect(() => {
    if (auth && activeTab === "blogs") {
      loadBlogs();
      loadBlogLogs();
    }
  }, [auth, activeTab, loadBlogs, loadBlogLogs]);

  // Approve application
  const handleApprove = async (appId: string) => {
    if (!auth) return;
    setActionLoading(appId);
    setActionResult(null);
    try {
      const result = await adminApproveApplication(auth, appId);
      setActionResult({ type: "success", message: result.message || "Application approved and institution authorized on-chain!" });
      loadApplications();
      loadStats();
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) return;
      setActionResult({ type: "error", message: err instanceof Error ? err.message : "Approval failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Reject application
  const handleReject = async () => {
    if (!auth || !rejectingId || !rejectReason.trim()) return;
    setActionLoading(rejectingId);
    setActionResult(null);
    try {
      const result = await adminRejectApplication(auth, rejectingId, rejectReason);
      setActionResult({ type: "success", message: result.message || "Application rejected." });
      setShowRejectModal(false);
      setRejectReason("");
      setRejectingId(null);
      loadApplications();
      loadStats();
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) return;
      setActionResult({ type: "error", message: err instanceof Error ? err.message : "Rejection failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Deauthorize institution
  const openDeauthorizeModal = (address: string, name: string) => {
    setDeauthTarget({ address, name });
    setDeauthReason("");
  };

  const handleDeauthorize = async () => {
    if (!auth) return;
    if (!deauthTarget) return;
    setActionLoading(deauthTarget.address);
    try {
      await adminDeauthorizeInstitution(auth, deauthTarget.address, deauthReason.trim() || undefined);
      setActionResult({ type: "success", message: "Institution deauthorized." });
      setDeauthTarget(null);
      setDeauthReason("");
      loadInstitutions();
      loadStats();
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) return;
      setActionResult({ type: "error", message: err instanceof Error ? err.message : "Deauthorization failed" });
    } finally {
      setActionLoading(null);
    }
  };

  const openBlogModerationModal = (blog: BlogPost, action: ModerationAction) => {
    setBlogModerationTarget({
      blogId: blog.id,
      title: blog.title,
      action,
    });
    setBlogModerationNote("");
  };

  const submitBlogModeration = async () => {
    if (!auth || !blogModerationTarget) return;
    setActionLoading(blogModerationTarget.blogId);
    try {
      const result = await adminReviewBlog(
        auth,
        blogModerationTarget.blogId,
        blogModerationTarget.action,
        blogModerationNote.trim() || undefined
      );
      setActionResult({
        type: "success",
        message: result.message || (blogModerationTarget.action === "approve" ? "Blog published." : "Blog rejected."),
      });
      setBlogModerationTarget(null);
      setBlogModerationNote("");
      await Promise.all([loadBlogs(), loadBlogLogs()]);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) return;
      setActionResult({ type: "error", message: err instanceof Error ? err.message : "Moderation failed" });
    } finally {
      setActionLoading(null);
    }
  };

  const openBlogDeleteModal = (blog: BlogPost) => {
    setBlogDeleteTarget(blog);
    setBlogDeleteConfirm("");
  };

  const submitBlogDelete = async () => {
    if (!auth || !blogDeleteTarget) return;
    if (blogDeleteConfirm.trim() !== blogDeleteTarget.title.trim()) return;

    setActionLoading(blogDeleteTarget.id);
    try {
      const result = await adminDeleteBlog(auth, blogDeleteTarget.id);
      setActionResult({ type: "success", message: result.message || "Blog deleted." });
      setBlogDeleteTarget(null);
      setBlogDeleteConfirm("");
      await Promise.all([loadBlogs(), loadBlogLogs()]);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) return;
      setActionResult({ type: "error", message: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch full application details (includes document info)
  const selectApplication = useCallback(async (app: Record<string, unknown>) => {
    if (!auth) return;
    setSelectedApp(app); // show immediately with list data
    setLoadingDetail(true);
    try {
      const full = await adminGetApplication(auth, String(app._id));
      setSelectedApp(full);
    } catch (err) {
      if (handleUnauthorizedAdminError(err)) return;
      console.error("Failed to load full details:", err);
      // Keep the list data as fallback
    } finally {
      setLoadingDetail(false);
    }
  }, [auth, handleUnauthorizedAdminError]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const formatDateTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString() : "—";

  // ── Not connected ───────────────────────────────────────────────────
  if (!wallet.connected) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="mb-2 font-mono text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Connect the contract owner wallet to access the admin panel.</p>
          <button
            onClick={connect}
            className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  // ── Checking ────────────────────────────────────────────────────────
  if (checking) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </main>
    );
  }

  // ── Not owner ───────────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <ShieldX className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="mb-2 font-mono text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            This wallet is not the contract owner.
          </p>
          <p className="mb-6 font-mono text-xs text-gray-400">{wallet.address}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // ── Need to sign ────────────────────────────────────────────────────
  if (!auth) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="mb-2 font-mono text-2xl font-bold text-gray-900 dark:text-white">Admin Authentication</h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Sign a message with your wallet to authenticate as admin.
          </p>
          <button
            onClick={signAdmin}
            disabled={signingIn}
            className="inline-flex items-center gap-2 rounded-sm bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {signingIn ? "Signing..." : "Sign to Authenticate"}
          </button>
          {authError && (
            <p className="mt-3 text-xs text-red-500 dark:text-red-400">{authError}</p>
          )}
        </div>
      </main>
    );
  }

  // ── Main Dashboard ──────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage institution applications and authorizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-sm border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
            <ShieldCheck className="h-3 w-3" />
            Owner
          </span>
          <span className="font-mono text-xs text-gray-500">{truncAddr(wallet.address)}</span>
        </div>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div className={`mb-6 flex items-center justify-between rounded-sm border p-3 text-sm ${
          actionResult.type === "success"
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        }`}>
          <div className="flex items-center gap-2">
            {actionResult.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {actionResult.message}
          </div>
          <button onClick={() => setActionResult(null)} className="text-current hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {[
          { id: "overview" as Tab, label: "Overview", icon: Activity },
          { id: "applications" as Tab, label: "Applications", icon: FileText },
          { id: "institutions" as Tab, label: "Institutions", icon: Building2 },
          { id: "blogs" as Tab, label: "Blogs", icon: PenSquare },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-mono text-lg font-bold text-gray-900 dark:text-white">Statistics</h2>
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingStats ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : stats ? (
            <>
              <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                {[
                  { label: "Total", value: stats.totalApplications, color: "text-gray-900 dark:text-white", icon: FileText },
                  { label: "Pending", value: stats.pending, color: "text-yellow-600 dark:text-yellow-400", icon: Clock },
                  { label: "Under Review", value: stats.underReview, color: "text-blue-600 dark:text-blue-400", icon: Search },
                  { label: "Approved", value: stats.approved, color: "text-green-600 dark:text-green-400", icon: CheckCircle },
                  { label: "Rejected", value: stats.rejected, color: "text-red-600 dark:text-red-400", icon: XCircle },
                  { label: "On-Chain", value: stats.totalOnChainInstitutions, color: "text-purple-600 dark:text-purple-400", icon: Building2 },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="rounded-sm border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#111]">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <div className={`mt-1 font-mono text-2xl font-bold ${color}`}>
                      {value != null ? String(value) : "—"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent applications */}
              {stats.recentApplications && (stats.recentApplications as unknown[]).length > 0 && (
                <div>
                  <h3 className="mb-3 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">Recent Applications</h3>
                  <div className="space-y-2">
                    {(stats.recentApplications as Record<string, unknown>[]).slice(0, 5).map((app) => (
                      <div key={String(app._id)} className="flex items-center justify-between rounded-sm border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#111]">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{String(app.institutionName)}</span>
                            <span className="ml-2 font-mono text-xs text-gray-400">{truncAddr(String(app.walletAddress))}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ApplicationStatusBadge status={String(app.status)} />
                          <button
                            onClick={() => { setActiveTab("applications"); selectApplication(app); }}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Could not load stats. Make sure the backend is running with MongoDB connected.
            </p>
          )}
        </div>
      )}

      {/* ── Applications Tab ─────────────────────────────────────────── */}
      {activeTab === "applications" && !selectedApp && (
        <div>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadApplications()}
                placeholder="Search by name, wallet, or registration..."
                className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={loadApplications}
              disabled={loadingApps}
              className="flex items-center gap-1 rounded-sm bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {loadingApps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>

          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{totalApps} total applications</p>

          {/* Applications list */}
          {loadingApps ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-sm border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-[#111]">
              <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No applications found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => (
                <div
                  key={String(app._id)}
                  className="flex items-center justify-between rounded-sm border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-blue-200 dark:border-gray-800 dark:bg-[#111] dark:hover:border-blue-800"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {String(app.institutionName)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{truncAddr(String(app.walletAddress))}</span>
                        <span>·</span>
                        <span>{String(app.country)}</span>
                        <span>·</span>
                        <span>{new Date(String(app.createdAt)).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ApplicationStatusBadge status={String(app.status)} />
                    {(app.status === "pending" || app.status === "under_review") && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApprove(String(app._id))}
                          disabled={actionLoading === String(app._id)}
                          className="rounded-sm bg-green-600 p-1.5 text-white hover:bg-green-700 disabled:opacity-50"
                          title="Approve"
                        >
                          {actionLoading === String(app._id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => { setRejectingId(String(app._id)); setShowRejectModal(true); }}
                          className="rounded-sm bg-red-600 p-1.5 text-white hover:bg-red-700"
                          title="Reject"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => selectApplication(app)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Application Detail ───────────────────────────────────────── */}
      {activeTab === "applications" && selectedApp && (
        <div>
          <button
            onClick={() => setSelectedApp(null)}
            className="mb-4 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to list
          </button>

          <div className="rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#111]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                  {String(selectedApp.institutionName)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Application #{String(selectedApp._id).slice(-8)}
                </p>
              </div>
              <ApplicationStatusBadge status={String(selectedApp.status)} size="md" />
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              {[
                { label: "Registration #", value: String(selectedApp.registrationNumber) },
                { label: "Country", value: String(selectedApp.country) },
                { label: "Email", value: String(selectedApp.contactEmail) },
                { label: "Submitted", value: new Date(String(selectedApp.createdAt)).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="block text-xs uppercase tracking-wider text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}

              <div className="md:col-span-2">
                <span className="block text-xs uppercase tracking-wider text-gray-400">Wallet Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-900 dark:text-white">{String(selectedApp.walletAddress)}</span>
                  <button onClick={() => copyToClipboard(String(selectedApp.walletAddress))} className="text-gray-400 hover:text-blue-600">
                    {copied === String(selectedApp.walletAddress) ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {Boolean(selectedApp.authorizedPersonName) && (
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-400">Authorized Person</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {String(selectedApp.authorizedPersonName)}
                    {selectedApp.authorizedPersonTitle ? (
                      <span className="ml-1 text-xs text-gray-400">({String(selectedApp.authorizedPersonTitle)})</span>
                    ) : null}
                  </span>
                </div>
              )}
              {Boolean(selectedApp.contactPhone) && (
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-400">Phone</span>
                  <span className="font-medium text-gray-900 dark:text-white">{String(selectedApp.contactPhone)}</span>
                </div>
              )}
              {Boolean(selectedApp.website) && (
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-400">Website</span>
                  <a href={String(selectedApp.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {String(selectedApp.website)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {Boolean(selectedApp.physicalAddress) && (
                <div className="md:col-span-2">
                  <span className="block text-xs uppercase tracking-wider text-gray-400">Physical Address</span>
                  <span className="font-medium text-gray-900 dark:text-white">{String(selectedApp.physicalAddress)}</span>
                </div>
              )}
              {Boolean(selectedApp.blockchainTxHash) && (
                <div className="md:col-span-2">
                  <span className="block text-xs uppercase tracking-wider text-gray-400">Blockchain TX</span>
                  <span className="font-mono text-sm text-green-700 dark:text-green-400">{String(selectedApp.blockchainTxHash)}</span>
                </div>
              )}
            </div>

            {/* Uploaded Documents */}
            {(() => {
              const docInfo = selectedApp.documentInfo as Record<string, { exists: boolean; fileName: string; url: string }> | undefined;
              const docEntries = docInfo ? Object.entries(docInfo).filter(([, v]) => v?.exists) : [];
              const docLabels: Record<string, string> = {
                registrationCert: "Registration Certificate",
                accreditationProof: "Accreditation Proof",
                letterOfIntent: "Letter of Intent",
                idDocument: "ID Document",
              };

              if (loadingDetail) {
                return (
                  <div className="mt-6">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Uploaded Documents</h3>
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
                    </div>
                  </div>
                );
              }

              if (docEntries.length === 0) {
                return (
                  <div className="mt-6">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Uploaded Documents</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No documents were uploaded with this application.</p>
                  </div>
                );
              }

              const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
              const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

              const openDocument = async (url: string, fileName: string, mode: "view" | "download") => {
                if (!auth) return;
                try {
                  const res = await fetch(`${API_BASE}/${url.replace(/^\/+/, "")}`, {
                    headers: {
                      "x-wallet-address": auth.address,
                      "x-wallet-signature": auth.signature,
                      "x-wallet-message": auth.message,
                    },
                  });
                  if (!res.ok) throw new Error("Failed to fetch document");
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  if (mode === "view") {
                    window.open(blobUrl, "_blank");
                  } else {
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                  // Revoke after a delay to allow download/view to start
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                } catch (err) {
                  console.error("Document fetch error:", err);
                  setActionResult({ type: "error", message: "Failed to load document" });
                }
              };

              return (
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Uploaded Documents</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {docEntries.map(([key, doc]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-sm border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex items-center gap-3">
                          <FileImage className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {docLabels[key] || key}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{doc.fileName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openDocument(doc.url, doc.fileName, "view")}
                            className="rounded-sm p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDocument(doc.url, doc.fileName, "download")}
                            className="rounded-sm p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30 dark:hover:text-green-400"
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Verification Checklist */}
            {Boolean(selectedApp.verificationChecks) && (
              <div className="mt-6">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Verification Checklist</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedApp.verificationChecks as Record<string, boolean>).map(([key, checked]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {checked ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      )}
                      <span className="text-gray-700 dark:text-gray-300">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {(selectedApp.status === "pending" || selectedApp.status === "under_review") && (
              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
                <button
                  onClick={() => handleApprove(String(selectedApp._id))}
                  disabled={actionLoading === String(selectedApp._id)}
                  className="flex items-center gap-2 rounded-sm bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === String(selectedApp._id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  Approve & Authorize
                </button>
                <button
                  onClick={() => { setRejectingId(String(selectedApp._id)); setShowRejectModal(true); }}
                  className="flex items-center gap-2 rounded-sm bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Institutions Tab ─────────────────────────────────────────── */}
      {activeTab === "institutions" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-lg font-bold text-gray-900 dark:text-white">
              Authorized Institutions (On-Chain)
            </h2>
            <button
              onClick={loadInstitutions}
              disabled={loadingInstitutions}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingInstitutions ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingInstitutions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : institutions.length === 0 ? (
            <div className="rounded-sm border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-[#111]">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No institutions authorized on-chain yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {institutions.map((inst) => (
                <div
                  key={String(inst.address)}
                  className="flex items-center justify-between rounded-sm border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#111]"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {String(inst.name || "Unknown")}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono">{truncAddr(String(inst.address))}</span>
                        <button onClick={() => copyToClipboard(String(inst.address))} className="text-gray-400 hover:text-blue-600">
                          {copied === String(inst.address) ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <span>·</span>
                        <span>{String(inst.country)}</span>
                        <span>·</span>
                        <span>{Number(inst.totalIssued)} certs issued</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <InstitutionBadge address={String(inst.address)} compact />
                    <button
                      onClick={() => openDeauthorizeModal(String(inst.address), String(inst.name || "Unknown Institution"))}
                      disabled={actionLoading === String(inst.address)}
                      className="flex items-center gap-1 rounded-sm border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                      title="Deauthorize"
                    >
                      {actionLoading === String(inst.address) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Ban className="h-3 w-3" />
                      )}
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Blogs Tab ────────────────────────────────────────────────── */}
      {activeTab === "blogs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Pending Review", value: blogSummary.pendingReview, color: "text-yellow-600 dark:text-yellow-400" },
              { label: "Published", value: blogSummary.published, color: "text-green-600 dark:text-green-400" },
              { label: "Drafts", value: blogSummary.drafts, color: "text-blue-600 dark:text-blue-400" },
              { label: "Rejected", value: blogSummary.rejected, color: "text-red-600 dark:text-red-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-sm border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#111]">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className={`mt-1 font-mono text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-sm border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#111]">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadBlogs()}
                  placeholder="Search title, author wallet, excerpt, tags..."
                  className="w-full rounded-sm border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>

              <select
                value={blogFilter}
                onChange={(e) => setBlogFilter(e.target.value as "all" | BlogStatus)}
                className="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              >
                {blogStatusFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={loadBlogs}
                disabled={loadingBlogs}
                className="flex items-center gap-1 rounded-sm bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingBlogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Filter
              </button>

              <button
                onClick={() => {
                  loadBlogs();
                  loadBlogLogs();
                }}
                disabled={loadingBlogs || loadingBlogLogs}
                className="flex items-center gap-1 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              >
                <RefreshCw className={`h-4 w-4 ${(loadingBlogs || loadingBlogLogs) ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingBlogs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : blogs.length === 0 ? (
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                <PenSquare className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No blogs match your current filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blogs.map((blog) => (
                  <div key={blog.id} className="rounded-sm border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <BlogStatusBadge status={blog.status} small />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Updated {formatDateTime(blog.updatedAt)}
                          </span>
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            Author {truncAddr(blog.author.wallet)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{blog.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{blog.excerpt}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {blog.tags.slice(0, 6).map((tag) => (
                            <span key={`${blog.id}-${tag}`} className="rounded-sm bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        {blog.chainAnchor?.blockNumber ? (
                          <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                            Chain anchor: {blog.chainAnchor.chainName || "Unknown"} #{blog.chainAnchor.blockNumber.toLocaleString()}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {blog.status === "published" && (
                          <Link
                            href={`/blogs/${blog.slug}`}
                            className="inline-flex items-center gap-1 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        )}
                        <Link
                          href={`/blogs/edit/${blog.id}`}
                          className="inline-flex items-center gap-1 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Edit
                        </Link>

                        {blog.status !== "published" && (
                          <button
                            onClick={() => openBlogModerationModal(blog, "approve")}
                            disabled={actionLoading === blog.id}
                            className="inline-flex items-center gap-1 rounded-sm bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {actionLoading === blog.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                        )}

                        {blog.status !== "rejected" && (
                          <button
                            onClick={() => openBlogModerationModal(blog, "reject")}
                            disabled={actionLoading === blog.id}
                            className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        )}

                        <button
                          onClick={() => openBlogDeleteModal(blog)}
                          disabled={actionLoading === blog.id}
                          className="inline-flex items-center gap-1 rounded-sm border border-red-300 bg-white px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-sm border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#111]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-gray-900 dark:text-white">
                <Clock3 className="h-4 w-4 text-blue-500" />
                Recent Blog Audit Logs
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{blogLogs.length} entries</span>
            </div>

            {loadingBlogLogs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : blogLogs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No audit logs available yet.</p>
            ) : (
              <div className="space-y-2">
                {blogLogs.map((log) => (
                  <div key={log.id} className="rounded-sm border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                        {log.action.replace("_", " ")}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {truncAddr(log.actorWallet)}
                      </span>
                      <span className="rounded-sm bg-gray-200 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {log.actorRole}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {log.blogTitle || "Deleted Blog"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Status: {log.statusBefore || "none"} → {log.statusAfter || "none"}
                    </p>
                    {log.note ? (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Note: {log.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-sm border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#111]">
            <h3 className="mb-4 font-mono text-lg font-bold text-gray-900 dark:text-white">
              Reject Application
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={4}
              className="mb-4 w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); setRejectingId(null); }}
                className="rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading !== null}
                className="flex items-center gap-2 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deauthTarget)}
        title="Deauthorize Institution"
        description={
          deauthTarget
            ? `Remove ${deauthTarget.name} (${truncAddr(deauthTarget.address)}) from authorized institutions?`
            : ""
        }
        confirmLabel="Deauthorize"
        danger
        loading={Boolean(deauthTarget && actionLoading === deauthTarget.address)}
        confirmValue={deauthReason}
        confirmEnabled
        confirmPlaceholder="Optional admin reason..."
        onConfirmValueChange={setDeauthReason}
        onConfirm={() => void handleDeauthorize()}
        onCancel={() => {
          if (deauthTarget && actionLoading === deauthTarget.address) return;
          setDeauthTarget(null);
          setDeauthReason("");
        }}
      />

      <ConfirmModal
        open={Boolean(blogModerationTarget)}
        title={blogModerationTarget?.action === "approve" ? "Approve Blog Post" : "Reject Blog Post"}
        description={
          blogModerationTarget
            ? blogModerationTarget.action === "approve"
              ? `Publish "${blogModerationTarget.title}"? You can include an optional approval note.`
              : `Reject "${blogModerationTarget.title}"? You can include a reason for the author.`
            : ""
        }
        confirmLabel={blogModerationTarget?.action === "approve" ? "Approve & Publish" : "Reject Post"}
        danger={blogModerationTarget?.action === "reject"}
        loading={Boolean(blogModerationTarget && actionLoading === blogModerationTarget.blogId)}
        confirmValue={blogModerationNote}
        confirmEnabled
        confirmPlaceholder={
          blogModerationTarget?.action === "approve"
            ? "Optional approval note..."
            : "Optional rejection note..."
        }
        onConfirmValueChange={setBlogModerationNote}
        onConfirm={() => void submitBlogModeration()}
        onCancel={() => {
          if (blogModerationTarget && actionLoading === blogModerationTarget.blogId) return;
          setBlogModerationTarget(null);
          setBlogModerationNote("");
        }}
      />

      <ConfirmModal
        open={Boolean(blogDeleteTarget)}
        title="Delete Blog Post"
        description={
          blogDeleteTarget
            ? `This will permanently delete "${blogDeleteTarget.title}". Type the exact blog title to confirm.`
            : ""
        }
        confirmLabel="Delete Permanently"
        danger
        loading={Boolean(blogDeleteTarget && actionLoading === blogDeleteTarget.id)}
        confirmValue={blogDeleteConfirm}
        confirmEnabled={Boolean(blogDeleteTarget && blogDeleteConfirm.trim() === blogDeleteTarget.title.trim())}
        confirmPlaceholder={blogDeleteTarget?.title || "Type blog title"}
        onConfirmValueChange={setBlogDeleteConfirm}
        onConfirm={() => void submitBlogDelete()}
        onCancel={() => {
          if (blogDeleteTarget && actionLoading === blogDeleteTarget.id) return;
          setBlogDeleteTarget(null);
          setBlogDeleteConfirm("");
        }}
      />
    </main>
  );
}
