"use client";

import { Clock, CheckCircle, XCircle, Search } from "lucide-react";

interface ApplicationStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function ApplicationStatusBadge({ status, size = "sm" }: ApplicationStatusBadgeProps) {
  const baseClasses = size === "sm"
    ? "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium"
    : "inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm font-medium";

  switch (status) {
    case "pending":
      return (
        <span className={`${baseClasses} border border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400`}>
          <Clock className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Pending
        </span>
      );
    case "under_review":
      return (
        <span className={`${baseClasses} border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400`}>
          <Search className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Under Review
        </span>
      );
    case "approved":
      return (
        <span className={`${baseClasses} border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400`}>
          <CheckCircle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className={`${baseClasses} border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400`}>
          <XCircle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Rejected
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400`}>
          {status}
        </span>
      );
  }
}
