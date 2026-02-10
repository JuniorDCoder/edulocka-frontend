"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  listTemplates,
  uploadTemplate,
  previewTemplate,
  type TemplateInfo,
  type WalletAuth,
} from "@/lib/api-client";
import {
  FileText,
  Upload,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Palette,
  Plus,
  LayoutTemplate,
  Code2,
  Wallet,
  Shield,
  Lock,
  Mail,
} from "lucide-react";

export default function TemplatesPage() {
  const { wallet } = useWallet();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build wallet auth object if connected (only for uploads/previews that need signing)
  const getWalletAuth = useCallback((): WalletAuth | undefined => {
    if (!wallet.connected || !wallet.address || !wallet.signer) return undefined;
    return {
      address: wallet.address,
      signMessage: (msg: string) => wallet.signer!.signMessage(msg),
    };
  }, [wallet.connected, wallet.address, wallet.signer]);

  // ── Load templates (no signing needed — just pass address) ────────────
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates(wallet.address || undefined);
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    }
    setLoading(false);
  }, [wallet.address]);

  // Load on mount and re-load whenever the connected address changes
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ── Upload handler (requires wallet) ──────────────────────────────────
  const handleUpload = async (file: File) => {
    const wallet = getWalletAuth();
    if (!wallet) {
      setError("Connect your wallet to upload templates.");
      return;
    }

    if (!file.name.endsWith(".html") && !file.name.endsWith(".hbs")) {
      setError("Only .html and .hbs template files are accepted.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Maximum 2MB.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadTemplate(file, wallet);
      setSuccess(`Template "${result.templateId}" uploaded to your institution's templates.`);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Preview handler ───────────────────────────────────────────────────
  const handlePreview = async (templateId: string, templateName: string) => {
    setPreviewName(templateName);
    setPreviewHTML(null);

    try {
      const wallet = getWalletAuth();
      const html = await previewTemplate(templateId, undefined, wallet);
      setPreviewHTML(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
      setPreviewName(null);
    }
  };

  // Separate templates by ownership
  const defaultTemplates = templates.filter((t) => t.owner === "default");
  const myTemplates = templates.filter((t) => t.owner !== "default");

  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
              Certificate Templates
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage HTML templates for PDF certificate generation.
              {wallet.connected ? " Your custom templates are private to your institution." : " Connect wallet to manage institution templates."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            {wallet.connected ? (
              <>
                <span className="flex items-center justify-center gap-1.5 rounded-sm border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                  <Shield className="h-3.5 w-3.5" />
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.hbs"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto dark:border-blue-500 dark:bg-blue-600"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Upload Template
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-sm border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
                <Wallet className="h-3.5 w-3.5" />
                Connect wallet to upload &amp; manage templates
              </div>
            )}
          </div>
        </div>

        {/* Error/success banners */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-none border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-none border-2 border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Institution Templates Section ── */}
            {wallet.connected && myTemplates.length > 0 && (
              <div className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Your Institution Templates
                  </h2>
                  <span className="rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Private
                  </span>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {myTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="group rounded-none border-2 border-blue-200 bg-white transition-colors hover:border-blue-500 dark:border-blue-800 dark:bg-gray-900 dark:hover:border-blue-500"
                    >
                      <div className="flex items-start justify-between border-b border-blue-100 p-4 dark:border-blue-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-none bg-blue-50 dark:bg-blue-950/30">
                            <LayoutTemplate className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{t.name}</h3>
                            <p className="text-xs text-gray-400">{t.id}</p>
                          </div>
                        </div>
                        <span className="rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Custom
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-4">
                        <button
                          onClick={() => handlePreview(t.id, t.name)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-500"
                        >
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Upload card for institution templates */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed border-blue-300 bg-white py-12 transition-colors hover:border-blue-400 dark:border-blue-700 dark:bg-gray-900 dark:hover:border-blue-500"
                  >
                    <Upload className="mb-3 h-8 w-8 text-blue-300 dark:text-blue-600" />
                    <p className="text-sm font-medium text-blue-500 dark:text-blue-400">Upload New Template</p>
                    <p className="mt-1 text-xs text-blue-400/70">.html or .hbs files</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Default Templates Section ── */}
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Default Templates
                </h2>
                <span className="rounded-sm bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Available to all
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {defaultTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="group rounded-none border-2 border-gray-200 bg-white transition-colors hover:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-green-500"
                  >
                    <div className="flex items-start justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-none bg-green-50 dark:bg-green-950/30">
                          <LayoutTemplate className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{t.name}</h3>
                          <p className="text-xs text-gray-400">{t.id}</p>
                        </div>
                      </div>
                      <span className="rounded-sm bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Default
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-4">
                      <button
                        onClick={() => handlePreview(t.id, t.name)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:border-green-500 hover:text-green-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-green-500"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                    </div>
                  </div>
                ))}

                {/* Upload card — only if wallet is connected but no custom templates yet */}
                {wallet.connected && myTemplates.length === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed border-gray-300 bg-white py-12 transition-colors hover:border-blue-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-500"
                  >
                    <Upload className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Upload Custom Template</p>
                    <p className="mt-1 text-xs text-gray-400">Private to your institution</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact support note */}
            <div className="mb-10 flex items-start gap-3 rounded-none border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Need a custom template designed?
                </p>
                <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/60">
                  Contact our support team and we&apos;ll design and upload a professional certificate template tailored to your institution&apos;s branding. Each custom template is private and only accessible to your institution.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Palette className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No templates yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload an HTML template to get started with PDF certificate generation.
            </p>
          </div>
        )}

        {/* Template format guide */}
        <div className="mt-10 rounded-none border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Code2 className="h-4 w-4 text-blue-500" />
            Template Variables
          </h3>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Templates use Handlebars syntax. Available variables:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { var: "{{studentName}}", desc: "Full name of the student" },
              { var: "{{studentId}}", desc: "Student's ID" },
              { var: "{{degree}}", desc: "Degree or program name" },
              { var: "{{institution}}", desc: "Issuing institution" },
              { var: "{{issueDate}}", desc: "Date of issuance" },
              { var: "{{certId}}", desc: "Auto-generated certificate ID" },
              { var: "{{ipfsHash}}", desc: "IPFS content hash" },
              { var: "{{qrDataUrl}}", desc: "QR code as base64 data URL" },
              { var: "{{formatDate date}}", desc: "Formatted date helper" },
              { var: "{{uppercase text}}", desc: "Uppercase helper" },
              { var: "{{currentYear}}", desc: "Current year" },
            ].map((v) => (
              <div key={v.var} className="flex items-start gap-2 text-xs">
                <code className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 font-mono text-blue-600 dark:bg-gray-800 dark:text-blue-400">
                  {v.var}
                </code>
                <span className="text-gray-500 dark:text-gray-400">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview modal */}
        {previewName && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h3 className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                  PREVIEW: {previewName}
                </h3>
                <button
                  onClick={() => { setPreviewName(null); setPreviewHTML(null); }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-auto" style={{ maxHeight: "calc(90vh - 52px)" }}>
                {previewHTML ? (
                  <iframe
                    srcDoc={previewHTML}
                    title="Template preview"
                    className="h-[800px] w-full border-none bg-white"
                  />
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
