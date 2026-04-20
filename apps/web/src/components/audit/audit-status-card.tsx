"use client";

import { CheckCircle2, Clock, Loader2, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge } from "@/components/audit/score-gauge";
import type { Audit, AuditStatus } from "@/types/audit";

const statusConfig: Record<AuditStatus, { icon: typeof Clock; label: string; variant: "outline" | "warning" | "success" | "destructive"; color: string; animate?: boolean }> = {
  pending: { icon: Clock, label: "Queued", variant: "outline", color: "text-gray-500" },
  crawling: { icon: Loader2, label: "Crawling", variant: "warning", color: "text-yellow-600", animate: true },
  analyzing: { icon: Search, label: "Analyzing", variant: "warning", color: "text-blue-600", animate: true },
  completed: { icon: CheckCircle2, label: "Completed", variant: "success", color: "text-green-600" },
  failed: { icon: XCircle, label: "Failed", variant: "destructive", color: "text-red-600" },
};

interface AuditStatusCardProps {
  audit: Audit;
}

export function AuditStatusCard({ audit }: AuditStatusCardProps) {
  const config = statusConfig[audit.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg">{audit.url}</CardTitle>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color} ${config.animate ? "animate-spin" : ""}`} />
          <span className="text-sm text-muted-foreground">{audit.status_message || "Waiting..."}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pages crawled:</span>{" "}
            <span className="font-medium">{audit.pages_crawled}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Started:</span>{" "}
            <span className="font-medium">{new Date(audit.created_at).toLocaleString()}</span>
          </div>
        </div>

        {audit.status === "completed" && audit.score_seo != null && (
          <div className="mt-6 grid grid-cols-4 gap-4">
            <ScoreGauge score={audit.score_seo} label="SEO" size="sm" />
            <ScoreGauge score={audit.score_performance} label="Performance" size="sm" />
            <ScoreGauge score={audit.score_accessibility} label="Accessibility" size="sm" />
            <ScoreGauge score={audit.score_best_practices} label="Best Practices" size="sm" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
