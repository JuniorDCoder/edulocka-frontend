"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, Building2 } from "lucide-react";
import { getInstitutionInfo } from "@/lib/contract";
import type { InstitutionInfo } from "@/lib/types";

interface InstitutionBadgeProps {
  address: string;
  compact?: boolean;
}

export function InstitutionBadge({ address, compact = false }: InstitutionBadgeProps) {
  const [info, setInfo] = useState<InstitutionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await getInstitutionInfo(address);
        setInfo(data);
      } catch {
        setInfo(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && "Checking..."}
      </span>
    );
  }

  if (!info || !info.isAuthorized) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <ShieldX className="h-3 w-3" />
        {compact ? "Unverified" : "Not Authorized"}
      </span>
    );
  }

  if (!info.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
        <ShieldAlert className="h-3 w-3" />
        {compact ? "Suspended" : "Institution Suspended"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
      <ShieldCheck className="h-3 w-3" />
      {compact ? "Verified" : (
        <span className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {info.name}
        </span>
      )}
    </span>
  );
}
