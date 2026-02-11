"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmValue?: string;
  confirmPlaceholder?: string;
  confirmEnabled?: boolean;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onConfirmValueChange?: (value: string) => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmValue,
  confirmPlaceholder = "Type to confirm",
  confirmEnabled,
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
  onConfirmValueChange,
}: ConfirmModalProps) {
  if (!open) return null;

  const baseConfirm = onConfirmValueChange ? Boolean(confirmValue && confirmValue.trim().length > 0) : true;
  const canConfirm = confirmEnabled !== undefined ? confirmEnabled : baseConfirm;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-none border-2 border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className={`mt-0.5 h-5 w-5 ${danger ? "text-red-500" : "text-yellow-500"}`} />
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {onConfirmValueChange && (
          <div className="mb-4">
            <input
              value={confirmValue || ""}
              onChange={(e) => onConfirmValueChange(e.target.value)}
              placeholder={confirmPlaceholder}
              className="w-full rounded-none border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-none border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-transparent dark:text-gray-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            className={`rounded-none border-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              danger
                ? "border-red-600 bg-red-600 hover:bg-red-700"
                : "border-blue-600 bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
