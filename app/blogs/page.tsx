"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { getContractOwner } from "@/lib/contract";
import {
  listBlogs,
  listMyBlogs,
  deleteBlog,
  listPendingReviewBlogs,
  reviewBlog,
  type BlogPost,
} from "@/lib/api-client";
import { getWalletAuth, signAdminAuth } from "@/lib/wallet-auth";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  Loader2,
  Search,
  PenSquare,
  Wallet,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function BlogsPage() {
  const { wallet, connect } = useWallet();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const [myBlogs, setMyBlogs] = useState<BlogPost[]>([]);
  const [loadingMyBlogs, setLoadingMyBlogs] = useState(false);
  const [myError, setMyError] = useState<string | null>(null);

  const [pendingBlogs, setPendingBlogs] = useState<BlogPost[]>([]);
  const [adminAuth, setAdminAuth] = useState<{ address: string; signature: string; message: string } | null>(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [moderationTarget, setModerationTarget] = useState<{
    blogId: string;
    blogTitle: string;
    action: "approve" | "reject";
  } | null>(null);
  const [moderationNote, setModerationNote] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadPublishedBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBlogs({
        search: search || undefined,
        tag: activeTag || undefined,
        limit: 24,
      });
      setBlogs(data.blogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blogs");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeTag]);

  useEffect(() => {
    void loadPublishedBlogs();
  }, [loadPublishedBlogs]);

  useEffect(() => {
    if (!wallet.connected || !wallet.address) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      setCheckingAdmin(true);
      try {
        const owner = await getContractOwner();
        if (!cancelled) setIsAdmin(owner.toLowerCase() === wallet.address.toLowerCase());
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setCheckingAdmin(false);
      }
    };
    void check();

    return () => {
      cancelled = true;
    };
  }, [wallet.connected, wallet.address]);

  const loadMyBlogs = useCallback(async () => {
    const auth = getWalletAuth(wallet);
    if (!auth) {
      setMyError("Connect wallet to load your blog workspace.");
      return;
    }

    setLoadingMyBlogs(true);
    setMyError(null);
    try {
      const data = await listMyBlogs(auth, { limit: 50 });
      setMyBlogs(data.blogs);
    } catch (err) {
      setMyError(err instanceof Error ? err.message : "Failed to load your blogs");
      setMyBlogs([]);
    } finally {
      setLoadingMyBlogs(false);
    }
  }, [wallet]);

  const authenticateAdmin = async () => {
    try {
      const auth = await signAdminAuth(wallet);
      setAdminAuth(auth);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Admin signature failed");
    }
  };

  const loadPendingReview = useCallback(async () => {
    if (!adminAuth) return;
    setLoadingPending(true);
    setPendingError(null);
    try {
      const data = await listPendingReviewBlogs(adminAuth, { limit: 50 });
      setPendingBlogs(data.blogs);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Failed to load moderation queue");
      setPendingBlogs([]);
    } finally {
      setLoadingPending(false);
    }
  }, [adminAuth]);

  useEffect(() => {
    if (adminAuth) void loadPendingReview();
  }, [adminAuth, loadPendingReview]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const auth = getWalletAuth(wallet);
    if (!auth) {
      setMyError("Connect wallet before deleting a blog.");
      return;
    }

    if (deleteConfirmText.trim() !== deleteTarget.title.trim()) return;

    setDeleting(true);
    try {
      await deleteBlog(auth, deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await Promise.all([loadMyBlogs(), loadPublishedBlogs()]);
    } catch (err) {
      setMyError(err instanceof Error ? err.message : "Failed to delete blog");
    } finally {
      setDeleting(false);
    }
  };

  const openModerationDialog = (blog: BlogPost, action: "approve" | "reject") => {
    setModerationTarget({
      blogId: blog.id,
      blogTitle: blog.title,
      action,
    });
    setModerationNote("");
  };

  const submitModeration = async () => {
    if (!adminAuth || !moderationTarget) return;
    setModerationBusyId(moderationTarget.blogId);
    try {
      await reviewBlog(
        adminAuth,
        moderationTarget.blogId,
        moderationTarget.action,
        moderationNote.trim() || undefined
      );
      setModerationTarget(null);
      setModerationNote("");
      await Promise.all([loadPendingReview(), loadPublishedBlogs()]);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Moderation action failed");
    } finally {
      setModerationBusyId(null);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const blog of blogs) {
      for (const tag of blog.tags || []) set.add(tag);
    }
    return Array.from(set).slice(0, 20);
  }, [blogs]);

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-none border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                <PenSquare className="h-3.5 w-3.5" />
                Edulocka Blog Network
              </p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">Insights, Security, and Web3 Education</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                Community posts are stored in MongoDB for low cost and moderated by admin before publication. Approved posts are anchored to live chain metadata.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blogs/new"
                className="inline-flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Write a Blog
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadPublishedBlogs()}
                placeholder="Search posts by title, excerpt, or tag..."
                className="w-full rounded-none border-2 border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <button
              onClick={() => void loadPublishedBlogs()}
              className="inline-flex items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              onClick={() => {
                setSearch("");
                setActiveTag("");
                void loadPublishedBlogs();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-none border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-transparent dark:text-gray-200"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
          {allTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag("")}
                className={`rounded-sm border px-2 py-1 text-xs ${
                  !activeTag
                    ? "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    : "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                All Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-sm border px-2 py-1 text-xs ${
                    activeTag === tag
                      ? "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                      : "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-none border-2 border-red-300 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          ) : blogs.length === 0 ? (
            <div className="rounded-none border-2 border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">No published blog posts found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {blogs.map((blog) => (
                <article key={blog.id} className="overflow-hidden rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  {blog.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blog.coverImageUrl} alt={blog.title} className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-green-500/20" />
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <BlogStatusBadge status={blog.status} small />
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{blog.readTimeMinutes} min read</span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-bold text-gray-900 dark:text-white">{blog.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{blog.excerpt}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {blog.tags.slice(0, 4).map((tag) => (
                        <span key={`${blog.id}-${tag}`} className="rounded-sm bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        Published {formatDate(blog.publishedAt)}
                      </span>
                      <Link
                        href={`/blogs/${blog.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Read
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 xl:grid-cols-2">
          <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                <Wallet className="h-4 w-4 text-blue-500" />
                My Blog Workspace
              </h3>
              {wallet.connected ? (
                <button
                  onClick={() => void loadMyBlogs()}
                  disabled={loadingMyBlogs}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {loadingMyBlogs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </button>
              ) : null}
            </div>

            {!wallet.connected ? (
              <div className="rounded-none border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300">
                Connect wallet to create, edit, and delete your posts.
                <button
                  onClick={connect}
                  className="ml-2 rounded-sm border border-yellow-400 px-2 py-0.5 text-[11px] font-semibold"
                >
                  Connect
                </button>
              </div>
            ) : loadingMyBlogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : myBlogs.length === 0 ? (
              <div className="rounded-none border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                No posts yet. Start your first post.
                <Link href="/blogs/new" className="ml-1 font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Create now
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myBlogs.map((blog) => (
                  <div key={blog.id} className="flex items-center justify-between rounded-none border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{blog.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <BlogStatusBadge status={blog.status} small />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Updated {formatDate(blog.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {blog.status === "published" && (
                        <Link
                          href={`/blogs/${blog.slug}`}
                          className="rounded-sm border border-gray-300 bg-white p-1.5 text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/blogs/edit/${blog.id}`}
                        className="rounded-sm border border-gray-300 bg-white p-1.5 text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(blog)}
                        className="rounded-sm border border-red-300 bg-white p-1.5 text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/20"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {myError && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{myError}</p>}
          </div>

          <div className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                Admin Review Queue
              </h3>
              {checkingAdmin && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>

            {!wallet.connected ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Connect admin wallet to review pending posts.</p>
            ) : !isAdmin ? (
              <div className="rounded-none border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                Your wallet is not the contract owner admin wallet.
              </div>
            ) : !adminAuth ? (
              <button
                onClick={() => void authenticateAdmin()}
                className="inline-flex items-center gap-2 rounded-none border-2 border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Sign to Access Moderation
              </button>
            ) : loadingPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : pendingBlogs.length === 0 ? (
              <div className="rounded-none border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                No pending posts in queue.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingBlogs.map((blog) => (
                  <div key={blog.id} className="rounded-none border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{blog.title}</p>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          {blog.author.wallet} · <Clock3 className="mr-1 inline h-3 w-3" />
                          Submitted {formatDate(blog.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModerationDialog(blog, "approve")}
                          disabled={moderationBusyId === blog.id}
                          className="rounded-sm border border-green-300 bg-white p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:bg-gray-900 dark:text-green-400"
                          title="Approve"
                        >
                          {moderationBusyId === blog.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => openModerationDialog(blog, "reject")}
                          disabled={moderationBusyId === blog.id}
                          className="rounded-sm border border-red-300 bg-white p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400"
                          title="Reject"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingError && (
              <div className="mt-3 rounded-none border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                {pendingError}
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        open={Boolean(moderationTarget)}
        title={moderationTarget?.action === "approve" ? "Approve Blog Post" : "Reject Blog Post"}
        description={
          moderationTarget
            ? moderationTarget.action === "approve"
              ? `Approve "${moderationTarget.blogTitle}" for public publishing? You can include an optional review note.`
              : `Reject "${moderationTarget.blogTitle}"? You can include an optional reason for the author.`
            : ""
        }
        confirmLabel={moderationTarget?.action === "approve" ? "Approve and Publish" : "Reject Post"}
        danger={moderationTarget?.action === "reject"}
        loading={Boolean(moderationTarget && moderationBusyId === moderationTarget.blogId)}
        confirmValue={moderationNote}
        confirmEnabled
        confirmPlaceholder={
          moderationTarget?.action === "approve"
            ? "Optional approval note..."
            : "Optional rejection note..."
        }
        onConfirmValueChange={setModerationNote}
        onConfirm={() => void submitModeration()}
        onCancel={() => {
          if (moderationTarget && moderationBusyId === moderationTarget.blogId) return;
          setModerationTarget(null);
          setModerationNote("");
        }}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Blog Post"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.title}". Type the exact blog title to confirm.`
            : ""
        }
        confirmLabel="Delete Permanently"
        danger
        loading={deleting}
        confirmValue={deleteConfirmText}
        confirmEnabled={Boolean(deleteTarget && deleteConfirmText.trim() === deleteTarget.title.trim())}
        confirmPlaceholder={deleteTarget?.title || "Type blog title"}
        onConfirmValueChange={setDeleteConfirmText}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteConfirmText("");
        }}
      />
    </div>
  );
}
