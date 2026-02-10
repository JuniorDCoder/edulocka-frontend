"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { isAuthorizedInstitution } from "@/lib/contract";
import { checkAuthorizationStatus } from "@/lib/api-client";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";

type AuthStatus = "loading" | "authorized" | "pending" | "not-applied" | "rejected" | "error";

export function AuthorizationStatus() {
  const { wallet } = useWallet();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!wallet.connected) {
      setStatus("not-applied");
      return;
    }

    (async () => {
      setStatus("loading");
      try {
        // Check on-chain first
        const onChain = await isAuthorizedInstitution(wallet.address);
        if (onChain) {
          setStatus("authorized");
          setMessage("Your institution is authorized on-chain.");
          return;
        }

        // Check backend application status
        try {
          const result = await checkAuthorizationStatus(wallet.address);
          if (result.application) {
            if (result.application.status === "pending" || result.application.status === "under_review") {
              setStatus("pending");
              setMessage("Your application is under review.");
            } else if (result.application.status === "rejected") {
              setStatus("rejected");
              setMessage("Your application was not approved.");
            } else {
              setStatus("not-applied");
            }
          } else {
            setStatus("not-applied");
          }
        } catch {
          // Backend may not be running — just check on-chain status
          setStatus("not-applied");
        }
      } catch {
        setStatus("error");
        setMessage("Failed to check authorization status.");
      }
    })();
  }, [wallet.connected, wallet.address]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking authorization status...
      </div>
    );
  }

  if (status === "authorized") {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
        <ShieldCheck className="h-4 w-4" />
        {message}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center justify-between rounded-sm border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {message}
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex items-center justify-between rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {message}
        </div>
        <Link
          href="/apply-institution"
          className="flex items-center gap-1 text-xs font-medium underline"
        >
          Reapply <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  // not-applied or error
  return (
    <div className="flex items-center justify-between rounded-sm border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
      <div className="flex items-center gap-2">
        <ShieldX className="h-4 w-4" />
        {status === "error" ? message : "Your institution is not yet authorized."}
      </div>
      <Link
        href="/apply-institution"
        className="flex items-center gap-1 text-xs font-medium underline"
      >
        Apply Now <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
