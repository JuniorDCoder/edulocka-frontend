"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type DragEvent,
} from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  listTemplates,
  uploadTemplate,
  generateAiTemplate,
  saveTemplateHtml,
  editTemplateWithAi,
  deleteTemplate,
  previewTemplate,
  type TemplateInfo,
  type WalletAuth,
  type AiTemplateMessage,
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
  Sparkles,
  Send,
  Bot,
  User,
  Wand2,
  Trash2,
  Save,
  Move,
  Type,
  QrCode,
  Award,
  MousePointer2,
  RotateCcw,
  Paintbrush,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Stamp,
  GripVertical,
} from "lucide-react";

const AI_SUGGESTIONS = [
  "Create a premium blockchain certificate with navy borders, emerald verification accents, and a formal university seal area.",
  "Design a modern skills certificate for a tech academy with glassy Web3 details, QR emphasis, and strong student name typography.",
  "Generate an elegant graduation certificate using gold linework, subtle ledger patterns, and space for registrar signatures.",
];

type BuilderElementType =
  | "studentName"
  | "degree"
  | "institution"
  | "issueDate"
  | "certId"
  | "qrDataUrl"
  | "verifyUrl"
  | "signature"
  | "stampImage";

interface BuilderElement {
  id: string;
  type: BuilderElementType;
  label: string;
  placeholder: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align: "left" | "center" | "right";
  imageData?: string;
}

const BUILDER_PALETTE: Array<Omit<BuilderElement, "id" | "x" | "y">> = [
  {
    type: "studentName",
    label: "Student Name",
    placeholder: "{{studentName}}",
    width: 300,
    height: 58,
    fontSize: 34,
    align: "center",
  },
  {
    type: "degree",
    label: "Degree",
    placeholder: "{{degree}}",
    width: 360,
    height: 44,
    fontSize: 20,
    align: "center",
  },
  {
    type: "institution",
    label: "Institution",
    placeholder: "{{institution}}",
    width: 320,
    height: 36,
    fontSize: 18,
    align: "center",
  },
  {
    type: "issueDate",
    label: "Issue Date",
    placeholder: "Issued {{issueDate}}",
    width: 190,
    height: 30,
    fontSize: 13,
    align: "left",
  },
  {
    type: "certId",
    label: "Certificate ID",
    placeholder: "ID {{certId}}",
    width: 210,
    height: 30,
    fontSize: 12,
    align: "right",
  },
  {
    type: "qrDataUrl",
    label: "QR Code",
    placeholder: "{{qrDataUrl}}",
    width: 94,
    height: 94,
    fontSize: 12,
    align: "center",
  },
  {
    type: "verifyUrl",
    label: "Verify Link",
    placeholder: "{{verifyUrl}}",
    width: 280,
    height: 28,
    fontSize: 10,
    align: "center",
  },
  {
    type: "signature",
    label: "Signature Line",
    placeholder: "Authorized Signature",
    width: 220,
    height: 42,
    fontSize: 12,
    align: "center",
  },
  {
    type: "stampImage",
    label: "Stamp / Seal Image",
    placeholder: "Upload stamp image",
    width: 120,
    height: 120,
    fontSize: 10,
    align: "center",
  },
];

const STARTER_ELEMENTS: BuilderElement[] = [
  { id: "builder-institution", ...BUILDER_PALETTE[2], x: 250, y: 70 },
  {
    id: "builder-title",
    type: "degree",
    label: "Certificate Title",
    placeholder: "Certificate of Achievement",
    width: 380,
    height: 46,
    fontSize: 28,
    align: "center",
    x: 220,
    y: 130,
  },
  { id: "builder-student", ...BUILDER_PALETTE[0], x: 260, y: 220 },
  { id: "builder-degree", ...BUILDER_PALETTE[1], x: 230, y: 292 },
  { id: "builder-date", ...BUILDER_PALETTE[3], x: 90, y: 425 },
  { id: "builder-cert", ...BUILDER_PALETTE[4], x: 520, y: 425 },
  { id: "builder-qr", ...BUILDER_PALETTE[5], x: 630, y: 300 },
  { id: "builder-verify", ...BUILDER_PALETTE[6], x: 270, y: 480 },
];

export default function TemplatesPage() {
  const { wallet } = useWallet();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [aiStudioOpen, setAiStudioOpen] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTemplateName, setAiTemplateName] = useState(
    "ai-certificate-template",
  );
  const [aiInstitutionName, setAiInstitutionName] = useState("");
  const [aiTone, setAiTone] = useState("prestigious, modern, trusted");
  const [aiPalette, setAiPalette] = useState(
    "deep navy, electric blue, emerald, white",
  );
  const [aiEditTemplateId, setAiEditTemplateId] = useState("");
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [isEditingWithAi, setIsEditingWithAi] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<TemplateInfo | null>(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [builderTemplateId, setBuilderTemplateId] = useState(
    "visual-certificate-template",
  );
  const [builderInstitutionName, setBuilderInstitutionName] = useState("");
  const [builderAccent, setBuilderAccent] = useState("#2563eb");
  const [builderElements, setBuilderElements] =
    useState<BuilderElement[]>(STARTER_ELEMENTS);
  const [selectedBuilderElementId, setSelectedBuilderElementId] = useState<
    string | null
  >("builder-student");
  const [isSavingBuilder, setIsSavingBuilder] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiTemplateMessage[]>([
    {
      role: "assistant",
      content:
        "Describe the certificate style, institution vibe, colors, and any layout details. I will save the result as a normal private template.",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Canvas drag state for repositioning elements
  const [dragState, setDragState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Build wallet auth object if connected (only for uploads/previews that need signing)
  const getWalletAuth = useCallback((): WalletAuth | undefined => {
    if (!wallet.connected || !wallet.address || !wallet.signer)
      return undefined;
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
      setSuccess(
        `Template "${result.templateId}" uploaded to your institution's templates.`,
      );
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

  // ── Gemini AI template generator ──────────────────────────────────────
  const handleGenerateAiTemplate = async (promptOverride?: string) => {
    const wallet = getWalletAuth();
    if (!wallet) {
      setError("Connect your wallet to generate templates.");
      return;
    }

    const prompt = (promptOverride || aiPrompt).trim();
    if (prompt.length < 12) {
      setError(
        "Describe the certificate template you want in a little more detail.",
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setAiMessages((messages) => [
      ...messages,
      { role: "user", content: prompt },
      {
        role: "assistant",
        content:
          "Generating your certificate template with Gemini and saving it to your institution vault...",
      },
    ]);

    try {
      const result = await generateAiTemplate(
        {
          prompt,
          templateName: aiTemplateName,
          institutionName: aiInstitutionName || undefined,
          tone: aiTone || undefined,
          colorPalette: aiPalette || undefined,
        },
        wallet,
      );

      setAiMessages((messages) => [
        ...messages.slice(0, -1),
        {
          role: "assistant",
          content: result.previewWarning
            ? `Saved "${result.templateId}" as a private institution template. ${result.previewWarning} You can still select it on the Issue page.`
            : `Saved "${result.templateId}" as a private institution template. You can preview it here or select it on the Issue page.`,
        },
      ]);
      setSuccess(`AI template "${result.templateId}" generated and saved.`);
      if (result.previewHtml) {
        setPreviewName(result.templateId);
        setPreviewHTML(result.previewHtml);
      }
      setAiPrompt("");
      await loadTemplates();
    } catch (err) {
      setAiMessages((messages) => [
        ...messages.slice(0, -1),
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Template generation failed.",
        },
      ]);
      setError(
        err instanceof Error ? err.message : "Template generation failed",
      );
    }

    setIsGenerating(false);
  };

  const buildManualTemplateHtml = useCallback(() => {
    const renderElement = (element: BuilderElement) => {
      const baseStyle = `position:absolute;left:${element.x}px;top:${element.y}px;width:${element.width}px;height:${element.height}px;text-align:${element.align};font-size:${element.fontSize}px;line-height:1.2;color:#0f172a;`;
      if (element.type === "qrDataUrl") {
        return `<img src="{{qrDataUrl}}" alt="Verification QR" style="${baseStyle}object-fit:contain;border:1px solid #cbd5e1;padding:6px;background:#ffffff;" />`;
      }
      if (element.type === "stampImage" && element.imageData) {
        return `<img src="${element.imageData}" alt="Institution Stamp" style="${baseStyle}object-fit:contain;" />`;
      }
      if (element.type === "stampImage") {
        return `<div style="${baseStyle}border:2px dashed #94a3b8;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Stamp</div>`;
      }
      if (element.type === "verifyUrl") {
        return `<a href="{{verifyUrl}}" style="${baseStyle}font-family:monospace;color:${builderAccent};text-decoration:none;word-break:break-all;">{{verifyUrl}}</a>`;
      }
      if (element.type === "signature") {
        return `<div style="${baseStyle}"><div style="border-top:2px solid #334155;margin-bottom:8px;"></div><span style="font-size:${element.fontSize}px;color:#475569;">${element.placeholder}</span></div>`;
      }
      return `<div style="${baseStyle}font-weight:${element.type === "studentName" ? 800 : 600};">${element.placeholder}</div>`;
    };

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f8fafc; color: #0f172a; }
    .certificate { position: relative; width: 1123px; height: 794px; overflow: hidden; background: #ffffff; border: 18px solid #0f172a; }
    .certificate::before { content: ""; position: absolute; inset: 28px; border: 3px solid ${builderAccent}; pointer-events: none; }
    .certificate::after { content: "EDULOCKA VERIFIED"; position: absolute; left: 52px; bottom: 38px; font-size: 11px; letter-spacing: .22em; color: #64748b; }
    .accent { position: absolute; right: -90px; top: -90px; width: 260px; height: 260px; border: 28px solid ${builderAccent}; opacity: .12; transform: rotate(18deg); }
    .ledger { position: absolute; inset: 52px; background-image: linear-gradient(90deg, rgba(37,99,235,.05) 1px, transparent 1px), linear-gradient(rgba(37,99,235,.05) 1px, transparent 1px); background-size: 32px 32px; opacity: .5; }
  </style>
</head>
<body>
  <main class="certificate">
    <div class="ledger"></div>
    <div class="accent"></div>
    ${builderElements.map(renderElement).join("\n    ")}
  </main>
</body>
</html>`;
  }, [builderAccent, builderElements]);

  const addBuilderElement = (type: BuilderElementType, x = 320, y = 240) => {
    const base = BUILDER_PALETTE.find((item) => item.type === type);
    if (!base) return;
    const newElement: BuilderElement = {
      id: `${type}-${Date.now()}`,
      ...base,
      x: Math.max(48, Math.min(740, x)),
      y: Math.max(48, Math.min(520, y)),
    };
    setBuilderElements((items) => [...items, newElement]);
    setSelectedBuilderElementId(newElement.id);
  };

  const handleBuilderDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(
      "application/edulocka-builder",
    ) as BuilderElementType;
    const rect = event.currentTarget.getBoundingClientRect();
    if (type) {
      addBuilderElement(
        type,
        event.clientX - rect.left - 80,
        event.clientY - rect.top - 20,
      );
    }
  };

  const handleCanvasPointerDown = useCallback(
    (elementId: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = builderElements.find((item) => item.id === elementId);
      if (!el) return;
      setSelectedBuilderElementId(elementId);
      setDragState({
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [builderElements],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const newX = Math.max(0, Math.min(780, dragState.origX + dx));
      const newY = Math.max(0, Math.min(530, dragState.origY + dy));
      setBuilderElements((items) =>
        items.map((item) =>
          item.id === dragState.elementId ? { ...item, x: Math.round(newX), y: Math.round(newY) } : item,
        ),
      );
    },
    [dragState],
  );

  const handleCanvasPointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleStampUpload = useCallback(
    (elementId: string, file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 2 * 1024 * 1024) {
        setError("Image too large. Maximum 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setBuilderElements((items) =>
          items.map((item) =>
            item.id === elementId ? { ...item, imageData: dataUrl } : item,
          ),
        );
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const updateBuilderElement = (id: string, patch: Partial<BuilderElement>) => {
    setBuilderElements((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const selectedBuilderElement =
    builderElements.find((item) => item.id === selectedBuilderElementId) ||
    null;

  const handleSaveManualTemplate = async () => {
    const wallet = getWalletAuth();
    if (!wallet) {
      setError("Connect your wallet to save templates.");
      return;
    }

    if (!builderTemplateId.trim()) {
      setError("Choose a template ID before saving.");
      return;
    }

    setIsSavingBuilder(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await saveTemplateHtml(
        builderTemplateId,
        buildManualTemplateHtml(),
        wallet,
        builderInstitutionName || undefined,
      );
      setSuccess(
        result.previewWarning
          ? `Template "${result.templateId}" saved from the visual builder. ${result.previewWarning}`
          : `Template "${result.templateId}" saved from the visual builder.`,
      );
      if (result.previewHtml) {
        setPreviewName(result.templateId);
        setPreviewHTML(result.previewHtml);
      }
      await loadTemplates();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save visual template",
      );
    }

    setIsSavingBuilder(false);
  };

  const handleAiEditTemplate = async () => {
    const wallet = getWalletAuth();
    if (!wallet) {
      setError("Connect your wallet to edit templates.");
      return;
    }
    if (!aiEditTemplateId) {
      setError("Select one of your templates to edit with AI.");
      return;
    }
    if (aiEditPrompt.trim().length < 12) {
      setError("Describe the edit you want in a little more detail.");
      return;
    }

    setIsEditingWithAi(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await editTemplateWithAi(
        aiEditTemplateId,
        aiEditPrompt,
        wallet,
        aiInstitutionName || undefined,
      );
      setSuccess(
        result.previewWarning
          ? `Template "${result.templateId}" updated with AI. ${result.previewWarning}`
          : `Template "${result.templateId}" updated with AI.`,
      );
      if (result.previewHtml) {
        setPreviewName(result.templateId);
        setPreviewHTML(result.previewHtml);
      }
      setAiEditPrompt("");
      await loadTemplates();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to edit template with AI",
      );
    }

    setIsEditingWithAi(false);
  };

  const requestDeleteTemplate = (template: TemplateInfo) => {
    setDeleteTarget(template);
    setDeleteConfirmValue("");
    setError(null);
  };

  const closeDeleteDialog = () => {
    if (deletingTemplateId) return;
    setDeleteTarget(null);
    setDeleteConfirmValue("");
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTarget) return;

    const wallet = getWalletAuth();
    if (!wallet) {
      setError("Connect your wallet to delete templates.");
      return;
    }

    const templateId = deleteTarget.id;
    setDeletingTemplateId(templateId);
    setError(null);
    setSuccess(null);

    try {
      await deleteTemplate(templateId, wallet);
      setSuccess(`Template "${templateId}" deleted.`);
      if (aiEditTemplateId === templateId) setAiEditTemplateId("");
      setDeleteTarget(null);
      setDeleteConfirmValue("");
      await loadTemplates();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete template",
      );
    }

    setDeletingTemplateId(null);
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
              {wallet.connected
                ? " Your custom templates are private to your institution."
                : " Connect wallet to manage institution templates."}
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
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-none border-2 border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">
              {success}
            </p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading templates...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* ── AI Template Generator ── */}
            <div className="mb-10 overflow-hidden rounded-none border-2 border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-900">
              <div
                className={`${aiStudioOpen ? "border-b" : ""} border-blue-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-5 dark:border-blue-900 dark:from-blue-950/30 dark:via-gray-900 dark:to-emerald-950/20`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        AI Template Studio
                      </h2>
                      <span className="rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Gemini
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                      Generate institution-ready HTML templates, then use them
                      like any uploaded template when issuing certificates.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {wallet.connected ? (
                      <div className="flex items-center gap-2 rounded-sm border border-blue-200 bg-white px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-300">
                        <Shield className="h-3.5 w-3.5" />
                        Authorized wallet required
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-sm border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
                        <Wallet className="h-3.5 w-3.5" />
                        Connect wallet to generate
                      </div>
                    )}
                    <button
                      onClick={() => setAiStudioOpen((open) => !open)}
                      className="flex items-center gap-2 rounded-none border-2 border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:border-blue-500 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-300"
                      aria-expanded={aiStudioOpen}
                      aria-controls="ai-template-studio-panel"
                    >
                      {aiStudioOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {aiStudioOpen ? "Collapse" : "Open"}
                    </button>
                  </div>
                </div>
              </div>

              {aiStudioOpen && (
                <div
                  id="ai-template-studio-panel"
                  className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]"
                >
                  <div className="border-b border-gray-200 p-5 lg:border-b-0 lg:border-r dark:border-gray-800">
                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Template ID
                        <input
                          value={aiTemplateName}
                          onChange={(e) => setAiTemplateName(e.target.value)}
                          className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          placeholder="mit-blockchain-award"
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Institution Name
                        <input
                          value={aiInstitutionName}
                          onChange={(e) => setAiInstitutionName(e.target.value)}
                          className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          placeholder="Uses {{institution}} if empty"
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Tone
                        <input
                          value={aiTone}
                          onChange={(e) => setAiTone(e.target.value)}
                          className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          placeholder="prestigious, modern, trusted"
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Palette
                        <input
                          value={aiPalette}
                          onChange={(e) => setAiPalette(e.target.value)}
                          className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          placeholder="navy, blue, emerald, white"
                        />
                      </label>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      {AI_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setAiPrompt(suggestion)}
                          disabled={isGenerating}
                          className="rounded-sm border border-blue-200 bg-blue-50 px-3 py-1.5 text-left text-xs text-blue-700 hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:border-blue-600"
                        >
                          <Wand2 className="mr-1 inline h-3 w-3" />
                          {suggestion}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={4}
                        className="min-h-28 flex-1 resize-none rounded-none border-2 border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        placeholder="Ask for a certificate design with specific layout, border style, colors, security details, signature areas, or branding..."
                      />
                      <button
                        onClick={() => handleGenerateAiTemplate()}
                        disabled={isGenerating || !wallet.connected}
                        className="flex w-14 items-center justify-center rounded-none border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500"
                        aria-label="Generate AI template"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex max-h-[520px] flex-col bg-gray-50 dark:bg-gray-950">
                    <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                      <p className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400">
                        TEMPLATE CHAT
                      </p>
                    </div>
                    <div className="flex-1 space-y-3 overflow-auto p-5">
                      {aiMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.role === "assistant" && (
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-blue-600 text-white">
                              <Bot className="h-4 w-4" />
                            </div>
                          )}
                          <div
                            className={`max-w-[82%] rounded-none border-2 px-3 py-2 text-sm ${
                              message.role === "user"
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {message.content}
                          </div>
                          {message.role === "user" && (
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-gray-900 text-white dark:bg-gray-700">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI edit existing template */}
            <div className="mb-10 overflow-hidden rounded-none border-2 border-emerald-200 bg-white dark:border-emerald-800 dark:bg-gray-900">
              <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/20">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <Paintbrush className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Improve Existing Templates
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Select one of your private templates and ask Gemini for a
                    precise redesign or correction.
                  </p>
                </div>
                <span className="rounded-sm border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-gray-950 dark:text-emerald-300">
                  Owner-only edits
                </span>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-[260px_1fr_auto] lg:items-end">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Template
                  <select
                    value={aiEditTemplateId}
                    onChange={(event) =>
                      setAiEditTemplateId(event.target.value)
                    }
                    className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Select private template</option>
                    {myTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Edit request
                  <textarea
                    value={aiEditPrompt}
                    onChange={(event) => setAiEditPrompt(event.target.value)}
                    rows={3}
                    className="mt-1 min-h-20 w-full resize-none rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    placeholder="Make it more formal, add a stronger QR area, use emerald accents, improve spacing, keep all certificate variables..."
                  />
                </label>
                <button
                  onClick={handleAiEditTemplate}
                  disabled={
                    isEditingWithAi || !wallet.connected || !aiEditTemplateId
                  }
                  className="flex items-center justify-center gap-2 rounded-none border-2 border-emerald-600 bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEditingWithAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Apply AI Edit
                </button>
              </div>
            </div>

            {/* Visual template builder */}
            <div className="mb-10 overflow-hidden rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div
                className={`${builderOpen ? "border-b" : ""} border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                      <MousePointer2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Guided Visual Builder
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                      Drag certificate fields onto the canvas, adjust their
                      layout, then save the design as a normal private template.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setBuilderOpen((open) => !open)}
                      className="flex items-center gap-2 rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      aria-expanded={builderOpen}
                      aria-controls="guided-visual-builder-panel"
                    >
                      {builderOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {builderOpen ? "Collapse" : "Open Builder"}
                    </button>
                    <button
                      onClick={() => {
                        setBuilderElements(STARTER_ELEMENTS);
                        setSelectedBuilderElementId("builder-student");
                      }}
                      className="flex items-center gap-2 rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset Layout
                    </button>
                    <button
                      onClick={handleSaveManualTemplate}
                      disabled={isSavingBuilder || !wallet.connected}
                      className="flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingBuilder ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save Builder Template
                    </button>
                  </div>
                </div>
              </div>

              {builderOpen && (
                <div
                  id="guided-visual-builder-panel"
                  className="grid gap-0 xl:grid-cols-[220px_1fr_260px]"
                >
                  <div className="border-b border-gray-200 p-4 xl:border-b-0 xl:border-r dark:border-gray-800">
                    <p className="mb-3 font-mono text-xs font-bold text-gray-500 dark:text-gray-400">
                      FIELDS
                    </p>
                    <div className="grid gap-2">
                      {BUILDER_PALETTE.map((item) => (
                        <button
                          key={item.type}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData(
                              "application/edulocka-builder",
                              item.type,
                            )
                          }
                          onClick={() => addBuilderElement(item.type)}
                          className="flex items-center gap-2 rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                        >
                          {item.type === "qrDataUrl" ? (
                            <QrCode className="h-4 w-4" />
                          ) : item.type === "signature" ? (
                            <Award className="h-4 w-4" />
                          ) : item.type === "stampImage" ? (
                            <Stamp className="h-4 w-4" />
                          ) : (
                            <Type className="h-4 w-4" />
                          )}
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Template ID
                        <input
                          value={builderTemplateId}
                          onChange={(event) =>
                            setBuilderTemplateId(event.target.value)
                          }
                          className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Institution
                        <input
                          value={builderInstitutionName}
                          onChange={(event) =>
                            setBuilderInstitutionName(event.target.value)
                          }
                          className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          placeholder="Preview name"
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Accent
                        <input
                          type="color"
                          value={builderAccent}
                          onChange={(event) =>
                            setBuilderAccent(event.target.value)
                          }
                          className="mt-1 h-10 w-full rounded-none border-2 border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-950"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="overflow-auto bg-slate-100 p-4 dark:bg-gray-950">
                    <div
                      ref={canvasRef}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleBuilderDrop}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      className="relative mx-auto h-[560px] w-[820px] overflow-hidden border-[14px] border-slate-900 bg-white shadow-sm select-none dark:border-slate-700"
                    >
                      <div
                        className="pointer-events-none absolute inset-6 border-2"
                        style={{ borderColor: builderAccent }}
                      />
                      <div className="pointer-events-none absolute inset-12 bg-[linear-gradient(90deg,rgba(37,99,235,.05)_1px,transparent_1px),linear-gradient(rgba(37,99,235,.05)_1px,transparent_1px)] bg-[length:28px_28px]" />
                      {builderElements.map((element) => (
                        <div
                          key={element.id}
                          onPointerDown={(e) => handleCanvasPointerDown(element.id, e)}
                          className={`absolute flex items-center justify-center border-2 px-2 text-slate-900 ${
                            selectedBuilderElementId === element.id
                              ? "border-blue-600 bg-blue-50/90 ring-2 ring-blue-300"
                              : "border-slate-300 bg-white/80 hover:border-blue-400"
                          } ${dragState?.elementId === element.id ? "cursor-grabbing opacity-90" : "cursor-grab"}`}
                          style={{
                            left: element.x,
                            top: element.y,
                            width: element.width,
                            height: element.height,
                            fontSize: element.fontSize,
                            textAlign: element.align,
                            touchAction: "none",
                          }}
                        >
                          {element.type === "qrDataUrl" ? (
                            <QrCode className="h-9 w-9 text-slate-500" />
                          ) : element.type === "stampImage" && element.imageData ? (
                            <img src={element.imageData} alt="Stamp" className="h-full w-full object-contain" draggable={false} />
                          ) : element.type === "stampImage" ? (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <Stamp className="h-6 w-6" />
                              <span className="text-[9px]">Stamp</span>
                            </div>
                          ) : (
                            element.placeholder
                          )}
                          {selectedBuilderElementId === element.id && (
                            <GripVertical className="absolute -right-0.5 top-0.5 h-3.5 w-3.5 text-blue-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 p-4 xl:border-l xl:border-t-0 dark:border-gray-800">
                    <p className="mb-3 font-mono text-xs font-bold text-gray-500 dark:text-gray-400">
                      SELECTED FIELD
                    </p>
                    {selectedBuilderElement ? (
                      <div className="grid gap-3">
                        <div className="flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
                          <Move className="h-3.5 w-3.5" />
                          {selectedBuilderElement.label}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          Drag on the canvas to reposition
                        </p>

                        {selectedBuilderElement.type === "stampImage" ? (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              Stamp / Seal Image
                            </label>
                            <input
                              ref={stampInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleStampUpload(selectedBuilderElement.id, file);
                                if (stampInputRef.current) stampInputRef.current.value = "";
                              }}
                              className="hidden"
                            />
                            {selectedBuilderElement.imageData ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-center rounded-none border-2 border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                                  <img
                                    src={selectedBuilderElement.imageData}
                                    alt="Stamp preview"
                                    className="max-h-20 max-w-full object-contain"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => stampInputRef.current?.click()}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                  >
                                    <ImagePlus className="h-3.5 w-3.5" />
                                    Replace
                                  </button>
                                  <button
                                    onClick={() => updateBuilderElement(selectedBuilderElement.id, { imageData: undefined })}
                                    className="flex items-center justify-center gap-1.5 rounded-none border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:border-red-400 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => stampInputRef.current?.click()}
                                className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              >
                                <ImagePlus className="h-4 w-4" />
                                Upload stamp image (PNG, JPG)
                              </button>
                            )}
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              Max 2MB. Use a transparent PNG for best results.
                            </p>
                          </div>
                        ) : (
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            Text
                            <input
                              value={selectedBuilderElement.placeholder}
                              onChange={(event) =>
                                updateBuilderElement(selectedBuilderElement.id, {
                                  placeholder: event.target.value,
                                })
                              }
                              disabled={
                                selectedBuilderElement.type === "qrDataUrl" ||
                                selectedBuilderElement.type === "verifyUrl"
                              }
                              className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                          </label>
                        )}
                        {(
                          ["x", "y", "width", "height", "fontSize"] as const
                        ).map((field) => (
                          <label
                            key={field}
                            className="text-xs font-medium capitalize text-gray-600 dark:text-gray-300"
                          >
                            {field}
                            <input
                              type="number"
                              value={selectedBuilderElement[field]}
                              onChange={(event) =>
                                updateBuilderElement(
                                  selectedBuilderElement.id,
                                  {
                                    [field]: Number(event.target.value),
                                  } as Partial<BuilderElement>,
                                )
                              }
                              className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                          </label>
                        ))}
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Align
                          <select
                            value={selectedBuilderElement.align}
                            onChange={(event) =>
                              updateBuilderElement(selectedBuilderElement.id, {
                                align: event.target
                                  .value as BuilderElement["align"],
                              })
                            }
                            className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                        <button
                          onClick={() => {
                            setBuilderElements((items) =>
                              items.filter(
                                (item) => item.id !== selectedBuilderElement.id,
                              ),
                            );
                            setSelectedBuilderElementId(null);
                          }}
                          className="flex items-center justify-center gap-2 rounded-none border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:border-red-400 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove Field
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-none border-2 border-dashed border-gray-200 p-5 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Select a field on the canvas to adjust position, size,
                        and text.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {t.name}
                            </h3>
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
                        <button
                          onClick={() => {
                            setAiEditTemplateId(t.id);
                            setAiEditPrompt(
                              `Improve ${t.name} with stronger spacing, clearer hierarchy, and a polished Web3 certificate finish while preserving all variables.`,
                            );
                          }}
                          className="flex flex-1 items-center justify-center gap-2 rounded-none border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:border-emerald-500 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> AI Edit
                        </button>
                        <button
                          onClick={() => requestDeleteTemplate(t)}
                          disabled={deletingTemplateId === t.id}
                          className="flex h-9 w-9 items-center justify-center rounded-none border-2 border-red-200 bg-red-50 text-red-700 hover:border-red-500 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                          aria-label={`Delete ${t.name}`}
                        >
                          {deletingTemplateId === t.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
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
                    <p className="text-sm font-medium text-blue-500 dark:text-blue-400">
                      Upload New Template
                    </p>
                    <p className="mt-1 text-xs text-blue-400/70">
                      .html or .hbs files
                    </p>
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
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {t.name}
                          </h3>
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
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Upload Custom Template
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Private to your institution
                    </p>
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
                  Contact our support team and we&apos;ll design and upload a
                  professional certificate template tailored to your
                  institution&apos;s branding. Each custom template is private
                  and only accessible to your institution.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Palette className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No templates yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload an HTML template to get started with PDF certificate
              generation.
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
                <span className="text-gray-500 dark:text-gray-400">
                  {v.desc}
                </span>
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
                  onClick={() => {
                    setPreviewName(null);
                    setPreviewHTML(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div
                className="overflow-auto"
                style={{ maxHeight: "calc(90vh - 52px)" }}
              >
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

        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-none border-2 border-red-500 bg-white shadow-2xl dark:bg-gray-950">
              <div className="border-b-2 border-red-200 bg-gradient-to-r from-red-50 via-white to-blue-50 p-5 dark:border-red-900 dark:from-red-950/30 dark:via-gray-950 dark:to-blue-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-none border-2 border-red-500 bg-red-600 text-white">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                        Destructive template action
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                        Delete {deleteTarget.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        This removes the private HTML template from your
                        institution library. Issued certificates remain
                        on-chain, but this template will no longer be available
                        for new issuance.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeDeleteDialog}
                    disabled={Boolean(deletingTemplateId)}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-50 dark:hover:text-gray-200"
                    aria-label="Close delete dialog"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 grid gap-3 rounded-none border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Template ID
                    </span>
                    <code className="break-all rounded-sm bg-white px-2 py-1 font-mono text-xs text-red-600 dark:bg-gray-950 dark:text-red-300">
                      {deleteTarget.id}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Owner
                    </span>
                    <code className="break-all rounded-sm bg-white px-2 py-1 font-mono text-xs text-blue-600 dark:bg-gray-950 dark:text-blue-300">
                      {deleteTarget.owner.slice(0, 8)}...
                      {deleteTarget.owner.slice(-6)}
                    </code>
                  </div>
                </div>

                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Type the template ID to confirm
                  <input
                    value={deleteConfirmValue}
                    onChange={(event) =>
                      setDeleteConfirmValue(event.target.value)
                    }
                    disabled={Boolean(deletingTemplateId)}
                    className="mt-1 w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-red-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    placeholder={deleteTarget.id}
                  />
                </label>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={closeDeleteDialog}
                    disabled={Boolean(deletingTemplateId)}
                    className="rounded-none border-2 border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-gray-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  >
                    Keep Template
                  </button>
                  <button
                    onClick={confirmDeleteTemplate}
                    disabled={
                      deleteConfirmValue.trim() !== deleteTarget.id ||
                      Boolean(deletingTemplateId)
                    }
                    className="flex items-center justify-center gap-2 rounded-none border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingTemplateId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
