"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CoreWebVitals, CWVRating } from "@/types/audit";

const ratingStyles: Record<CWVRating, { variant: "success" | "warning" | "destructive"; label: string }> = {
  good: { variant: "success", label: "Good" },
  "needs-improvement": { variant: "warning", label: "Needs Work" },
  poor: { variant: "destructive", label: "Poor" },
};

interface CWVCardProps {
  vitals: CoreWebVitals;
}

export function CoreWebVitalsCard({ vitals }: CWVCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Core Web Vitals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          <MetricItem
            label="LCP"
            sublabel="Largest Contentful Paint"
            value={vitals.lcp_ms != null ? `${(vitals.lcp_ms / 1000).toFixed(1)}s` : "--"}
            target="< 2.5s"
            rating={vitals.lcp_rating}
          />
          <MetricItem
            label="INP"
            sublabel="Interaction to Next Paint"
            value={vitals.inp_ms != null ? `${Math.round(vitals.inp_ms)}ms` : "--"}
            target="< 200ms"
            rating={vitals.inp_rating}
          />
          <MetricItem
            label="CLS"
            sublabel="Cumulative Layout Shift"
            value={vitals.cls != null ? vitals.cls.toFixed(2) : "--"}
            target="< 0.1"
            rating={vitals.cls_rating}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({
  label,
  sublabel,
  value,
  target,
  rating,
}: {
  label: string;
  sublabel: string;
  value: string;
  target: string;
  rating: CWVRating | null;
}) {
  const style = rating ? ratingStyles[rating] : null;

  return (
    <div className="text-center">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn(
        "font-display text-2xl font-bold mt-1",
        rating === "good" ? "text-green-600" : rating === "needs-improvement" ? "text-amber-600" : rating === "poor" ? "text-red-600" : "text-gray-400"
      )}>
        {value}
      </p>
      {style && (
        <Badge variant={style.variant} className="mt-1.5 text-[10px]">{style.label}</Badge>
      )}
      <p className="text-[10px] text-muted-foreground mt-1">Target: {target}</p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}
