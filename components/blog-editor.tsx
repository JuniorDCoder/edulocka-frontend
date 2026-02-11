"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImagePlus,
  Code2,
  Eye,
  PencilLine,
  Loader2,
} from "lucide-react";
import { renderMarkdownToHtml } from "@/lib/markdown";

interface BlogEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSuggestCoverImage?: (url: string) => void;
}

function buildImageUrl(data: { gateway?: string; ipfsHash?: string }): string | null {
  if (data.gateway) return data.gateway;
  if (data.ipfsHash) return `https://ipfs.io/ipfs/${data.ipfsHash}`;
  return null;
}

export function BlogEditor({ value, onChange, disabled = false, onSuggestCoverImage }: BlogEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const insertAtSelection = (before: string, after = "", placeholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);

    setTimeout(() => {
      textarea.focus();
      const caret = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(caret, caret);
    }, 0);
  };

  const insertBlock = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const lines = (selected || "Text").split("\n");
    const formatted = lines.map((line) => `${prefix}${line}`).join("\n");
    const next = `${value.slice(0, start)}${formatted}${value.slice(end)}`;
    onChange(next);
  };

  const handleLinkInsert = () => {
    const url = window.prompt("Enter URL (https://...):");
    if (!url) return;
    insertAtSelection("[", `](${url})`, "link text");
  };

  const handleImageUpload = async (file: File) => {
    setEditorError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEditorError("Only image files can be inserted into blog content.");
      return;
    }

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Image upload failed");
      }
      const imageUrl = buildImageUrl(data);
      if (!imageUrl) throw new Error("Upload completed but image URL is missing");

      insertAtSelection("![Blog image](", ")", imageUrl);
      onSuggestCoverImage?.(imageUrl);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { icon: Heading2, onClick: () => insertAtSelection("## ", "", "Heading"), label: "Heading" },
            { icon: Bold, onClick: () => insertAtSelection("**", "**", "bold text"), label: "Bold" },
            { icon: Italic, onClick: () => insertAtSelection("*", "*", "italic text"), label: "Italic" },
            { icon: Quote, onClick: () => insertBlock("> "), label: "Quote" },
            { icon: List, onClick: () => insertBlock("- "), label: "List" },
            { icon: ListOrdered, onClick: () => insertBlock("1. "), label: "Numbered List" },
            { icon: Code2, onClick: () => insertAtSelection("```\n", "\n```", "code here"), label: "Code Block" },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={disabled}
              className="rounded-sm border border-gray-200 bg-white p-2 text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
              title={action.label}
            >
              <action.icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={handleLinkInsert}
            disabled={disabled}
            className="rounded-sm border border-gray-200 bg-white p-2 text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            title="Insert Link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || uploadingImage}
            className="rounded-sm border border-gray-200 bg-white p-2 text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            title="Upload and Insert Image"
          >
            {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-none border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`rounded-sm px-2 py-1 text-xs font-medium ${
              mode === "write"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <span className="inline-flex items-center gap-1"><PencilLine className="h-3 w-3" /> Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded-sm px-2 py-1 text-xs font-medium ${
              mode === "preview"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> Preview</span>
          </button>
        </div>
      </div>

      {editorError && (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
          {editorError}
        </div>
      )}

      {mode === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your article in Markdown..."
          disabled={disabled}
          className="min-h-[380px] w-full resize-y rounded-none border-0 bg-white p-4 font-mono text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
      ) : (
        <div
          className="min-h-[380px] overflow-x-auto p-4"
          dangerouslySetInnerHTML={{
            __html: renderMarkdownToHtml(value || "No content yet. Switch to Write mode to begin."),
          }}
        />
      )}

      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Markdown supported: headings, bold/italic, links, lists, code blocks, and images.
      </div>
    </div>
  );
}
