"use client";

import { CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { TransactionStep } from "@/lib/types";

interface TransactionStatusProps {
  steps: TransactionStep[];
}

export function TransactionStatus({ steps }: TransactionStatusProps) {
  const getStatusIcon = (status: TransactionStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TransactionStep["status"]) => {
    switch (status) {
      case "completed":
        return "border-green-500 dark:border-green-400";
      case "processing":
        return "border-blue-500 dark:border-blue-400";
      case "failed":
        return "border-red-500 dark:border-red-400";
      default:
        return "border-gray-300 dark:border-gray-600";
    }
  };

  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          {/* Vertical line + icon */}
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center">
              {getStatusIcon(step.status)}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-0.5 flex-1 ${
                  step.status === "completed"
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            )}
          </div>

          {/* Content */}
          <div className={`flex-1 pb-6 ${index === steps.length - 1 ? "pb-0" : ""}`}>
            <p
              className={`text-sm font-medium ${
                step.status === "completed"
                  ? "text-green-700 dark:text-green-400"
                  : step.status === "processing"
                  ? "text-blue-700 dark:text-blue-400"
                  : step.status === "failed"
                  ? "text-red-700 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {step.label}
            </p>
            {step.txHash && (
              <code className="mt-1 block font-mono text-xs text-gray-500 dark:text-gray-400">
                Tx: {step.txHash.slice(0, 16)}...
              </code>
            )}
            {step.blockNumber && (
              <code className="font-mono text-xs text-gray-500 dark:text-gray-400">
                Block #{step.blockNumber.toLocaleString()}
              </code>
            )}
            {step.timestamp && (
              <span className="ml-2 text-xs text-gray-400">{step.timestamp}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
