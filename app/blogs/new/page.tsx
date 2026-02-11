"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import { createBlog } from "@/lib/api-client";
import { getWalletAuth } from "@/lib/wallet-auth";
import { BlogEditor } from "@/components/blog-editor";
import { Loader2, ArrowLeft, Wallet, Save, Send, AlertTriangle } from "lucide-react";

export default function NewBlogPage() {
  const router = useRouter();
  const { wallet, connect } = useWallet();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [authorDisplayName, setAuthorDisplayName] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "pending_review" | null>(null);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput]
  );

  const submit = async (status: "draft" | "pending_review") => {
    const walletAuth = getWalletAuth(wallet);
    if (!walletAuth) {
      setError("Connect wallet to create blog posts.");
      return;
    }

    setSubmitting(status);
    setError(null);
    try {
      const result = await createBlog(walletAuth, {
        title,
        excerpt,
        contentMarkdown,
        coverImageUrl,
        tags,
        authorDisplayName,
        status,
      });
      router.push(`/blogs/edit/${result.blog.id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create blog post");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
          <span className="text-xs text-gray-500 dark:text-gray-400">Wallet-gated write operation</span>
        </div>

        <div className="rounded-none border-2 border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Write New Blog Post</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Draft content, add media, then submit for admin review and publication.
          </p>

          {!wallet.connected && (
            <div className="mt-4 rounded-none border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300">
              <Wallet className="mr-1 inline h-4 w-4" />
              Connect wallet before publishing.
              <button
                onClick={connect}
                className="ml-2 rounded-sm border border-yellow-400 px-2 py-0.5 text-xs font-semibold"
              >
                Connect
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-none border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
              <AlertTriangle className="mr-1 inline h-4 w-4" />
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog title"
              className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-base font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />

            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short excerpt (optional)"
              className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="Cover image URL (optional)"
                className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <input
              value={authorDisplayName}
              onChange={(e) => setAuthorDisplayName(e.target.value)}
              placeholder="Display name (optional)"
              className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />

            <BlogEditor
              value={contentMarkdown}
              onChange={setContentMarkdown}
              onSuggestCoverImage={(url) => {
                if (!coverImageUrl) setCoverImageUrl(url);
              }}
            />

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void submit("draft")}
                disabled={Boolean(submitting)}
                className="inline-flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-200"
              >
                {submitting === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => void submit("pending_review")}
                disabled={Boolean(submitting)}
                className="inline-flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {submitting === "pending_review" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
