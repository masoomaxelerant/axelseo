"use client";

import { Loader2, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditStatus } from "@/types/audit";

const steps: { key: AuditStatus; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "Queued", icon: Clock },
  { key: "crawling", label: "Crawling", icon: Loader2 },
  { key: "analyzing", label: "Analyzing", icon: Search },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

const statusOrder: Record<AuditStatus, number> = {
  pending: 0, crawling: 1, analyzing: 2, completed: 3, failed: -1,
};

interface AuditProgressBarProps {
  status: AuditStatus;
  statusMessage?: string | null;
  pagesCrawled?: number;
  className?: string;
}

export function AuditProgressBar({ status, statusMessage, pagesCrawled, className }: AuditProgressBarProps) {
  if (status === "failed") {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4", className)}>
        <XCircle className="h-5 w-5 text-red-500" />
        <div>
          <p className="text-sm font-medium text-red-800">Audit Failed</p>
          {statusMessage && <p className="text-xs text-red-600 mt-0.5">{statusMessage}</p>}
        </div>
      </div>
    );
  }

  const currentStep = statusOrder[status];

  return (
    <div className={cn("rounded-lg border bg-white p-6", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isDone ? "border-green-500 bg-green-50" :
                  isActive ? "border-brand-orange bg-orange-50" :
                  "border-gray-200 bg-white"
                )}>
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : isActive ? (
                    <Icon className={cn("h-5 w-5 text-brand-orange", status !== "completed" && "animate-spin")} />
                  ) : (
                    <Icon className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <span className={cn(
                  "mt-2 text-xs font-medium",
                  isDone ? "text-green-600" : isActive ? "text-brand-orange" : "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "mx-3 h-0.5 w-16 sm:w-24",
                  isDone ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
      {statusMessage && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {statusMessage}
          {pagesCrawled != null && pagesCrawled > 0 && status === "crawling" && (
            <span className="ml-1 font-medium text-foreground">({pagesCrawled} pages)</span>
          )}
        </p>
      )}
    </div>
  );
}
