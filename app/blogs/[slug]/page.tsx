"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getBlogBySlug, type BlogPost } from "@/lib/api-client";
import { renderMarkdownToHtml } from "@/lib/markdown";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Clock3,
  Fingerprint,
  Blocks,
  AlertTriangle,
} from "lucide-react";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blog, setBlog] = useState<BlogPost | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBlogBySlug(slug);
        if (!cancelled) setBlog(data.blog);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load blog post");
          setBlog(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/blogs" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400">
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-none border-2 border-red-300 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            {error}
          </div>
        ) : blog ? (
          <>
            <article className="overflow-hidden rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {blog.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blog.coverImageUrl} alt={blog.title} className="max-h-[420px] w-full object-cover" />
              ) : (
                <div className="h-52 w-full bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-green-500/20" />
              )}

              <div className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <BlogStatusBadge status={blog.status} />
                  {blog.tags.map((tag) => (
                    <span key={tag} className="rounded-sm bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      #{tag}
                    </span>
                  ))}
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{blog.title}</h1>
                <p className="mt-3 text-base text-gray-600 dark:text-gray-300">{blog.excerpt}</p>

                <div className="mt-4 grid gap-2 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
                  <p className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Published: {formatDate(blog.publishedAt)}
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {blog.readTimeMinutes} min read
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <Fingerprint className="h-3.5 w-3.5" />
                    {blog.contentHash.slice(0, 12)}...
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <Blocks className="h-3.5 w-3.5" />
                    {blog.chainAnchor?.blockNumber ? `Block #${blog.chainAnchor.blockNumber}` : "No anchor block"}
                  </p>
                </div>
              </div>
            </article>

            <section className="mt-5 rounded-none border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <div
                className="max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownToHtml(blog.contentMarkdown || ""),
                }}
              />
            </section>

            {blog.chainAnchor && (
              <section className="mt-5 rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Chain Anchor Metadata</h2>
                <div className="grid gap-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  <p>Chain: {blog.chainAnchor.chainName || "—"} ({blog.chainAnchor.chainId ?? "—"})</p>
                  <p>Block Number: {blog.chainAnchor.blockNumber ?? "—"}</p>
                  <p className="sm:col-span-2">
                    Block Hash:{" "}
                    <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      {blog.chainAnchor.blockHash || "—"}
                    </span>
                  </p>
                  <p>Anchored At: {formatDate(blog.chainAnchor.anchoredAt)}</p>
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
