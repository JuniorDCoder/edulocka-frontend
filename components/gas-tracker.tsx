"use client";

import { Fuel } from "lucide-react";

interface GasTrackerProps {
  gasPrice: string;
  className?: string;
}

export function GasTracker({ gasPrice, className = "" }: GasTrackerProps) {
  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-xs text-gray-500 dark:text-gray-400 ${className}`}
    >
      <Fuel className="h-3 w-3" />
      <span>Gas:</span>
      <span className="text-orange-600 dark:text-orange-400">{gasPrice}</span>
    </div>
  );
}
