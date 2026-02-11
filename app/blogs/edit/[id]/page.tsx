"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  getMyBlogById,
  updateBlog,
  deleteBlog,
  type BlogPost,
} from "@/lib/api-client";
import { getWalletAuth } from "@/lib/wallet-auth";
import { BlogEditor } from "@/components/blog-editor";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Trash2,
  Wallet,
  AlertTriangle,
  Eye,
} from "lucide-react";

export default function EditBlogPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { wallet, connect } = useWallet();

  const blogId = String(params?.id || "");
  const created = searchParams.get("created") === "1";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(created ? "Blog created successfully." : null);
  const [blog, setBlog] = useState<BlogPost | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [authorDisplayName, setAuthorDisplayName] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");

  const [saving, setSaving] = useState<"draft" | "pending_review" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput]
  );

  const loadBlog = useCallback(async () => {
    const auth = getWalletAuth(wallet);
    if (!auth) {
      setError("Connect wallet to edit your blog.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getMyBlogById(auth, blogId);
      setBlog(data.blog);
      setTitle(data.blog.title);
      setExcerpt(data.blog.excerpt || "");
      setCoverImageUrl(data.blog.coverImageUrl || "");
      setTagsInput((data.blog.tags || []).join(", "));
      setAuthorDisplayName(data.blog.author.displayName || "");
      setContentMarkdown(data.blog.contentMarkdown || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blog");
      setBlog(null);
    } finally {
      setLoading(false);
    }
  }, [wallet, blogId]);

  useEffect(() => {
    if (blogId) void loadBlog();
  }, [blogId, loadBlog]);

  const save = async (status: "draft" | "pending_review") => {
    const auth = getWalletAuth(wallet);
    if (!auth) {
      setError("Connect wallet to save changes.");
      return;
    }
    setSaving(status);
    setError(null);
    setSaveMessage(null);
    try {
      const result = await updateBlog(auth, blogId, {
        title,
        excerpt,
        contentMarkdown,
        coverImageUrl,
        tags,
        authorDisplayName,
        status,
      });
      setBlog(result.blog);
      setSaveMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blog");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    const auth = getWalletAuth(wallet);
    if (!auth || !blog) return;
    if (deleteConfirmText.trim() !== blog.title.trim()) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteBlog(auth, blogId);
      router.push("/blogs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blog");
    } finally {
      setDeleting(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="grid-pattern min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-none border-2 border-yellow-300 bg-yellow-50 p-6 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300">
            <Wallet className="mb-2 h-5 w-5" />
            Connect wallet to edit blog posts.
            <button
              onClick={connect}
              className="ml-3 rounded-sm border border-yellow-400 px-3 py-1 text-xs font-semibold"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/blogs" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400">
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
          {blog?.slug && blog.status === "published" && (
            <Link
              href={`/blogs/${blog.slug}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              <Eye className="h-3.5 w-3.5" />
              View Published
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="rounded-none border-2 border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Blog Post</h1>
              {blog && <BlogStatusBadge status={blog.status} />}
            </div>

            {error && (
              <div className="mb-4 rounded-none border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                {error}
              </div>
            )}

            {saveMessage && (
              <div className="mb-4 rounded-none border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300">
                {saveMessage}
              </div>
            )}

            <div className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Blog title"
                className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-base font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Excerpt"
                className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Cover image URL"
                  className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags comma separated"
                  className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <input
                value={authorDisplayName}
                onChange={(e) => setAuthorDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />

              <BlogEditor
                value={contentMarkdown}
                onChange={setContentMarkdown}
                onSuggestCoverImage={(url) => {
                  if (!coverImageUrl) setCoverImageUrl(url);
                }}
              />

              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-2 rounded-none border-2 border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void save("draft")}
                    disabled={Boolean(saving)}
                    className="inline-flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-200"
                  >
                    {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void save("pending_review")}
                    disabled={Boolean(saving)}
                    className="inline-flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    {saving === "pending_review" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit for Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Delete Blog Post"
        description={blog ? `Type "${blog.title}" to confirm permanent deletion.` : "Confirm deletion"}
        confirmLabel="Delete Permanently"
        danger
        loading={deleting}
        confirmValue={deleteConfirmText}
        confirmEnabled={Boolean(blog && deleteConfirmText.trim() === blog.title.trim())}
        confirmPlaceholder={blog?.title || "Type blog title"}
        onConfirmValueChange={setDeleteConfirmText}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteConfirmText("");
        }}
      />
    </div>
  );
}
