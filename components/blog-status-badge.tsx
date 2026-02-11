"use client";

import { BlogStatus } from "@/lib/api-client";
import { CheckCircle2, Clock3, FileEdit, ShieldAlert } from "lucide-react";
import type { ComponentType } from "react";

interface BlogStatusBadgeProps {
  status: BlogStatus;
  small?: boolean;
}

export function BlogStatusBadge({ status, small = false }: BlogStatusBadgeProps) {
  const styleMap: Record<BlogStatus, { label: string; className: string; icon: ComponentType<{ className?: string }> }> = {
    draft: {
      label: "Draft",
      className: "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
      icon: FileEdit,
    },
    pending_review: {
      label: "Pending Review",
      className: "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
      icon: Clock3,
    },
    published: {
      label: "Published",
      className: "border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejected",
      className: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
      icon: ShieldAlert,
    },
  };

  const style = styleMap[status];
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-medium ${small ? "text-[10px]" : "text-xs"} ${style.className}`}
    >
      <Icon className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {style.label}
    </span>
  );
}
