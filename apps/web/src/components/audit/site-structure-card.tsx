import { FileText, Link2, ArrowRightLeft, AlertTriangle, Ghost, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SiteStructure } from "@/types/audit";

interface SiteStructureCardProps {
  structure: SiteStructure;
}

export function SiteStructureCard({ structure }: SiteStructureCardProps) {
  const items = [
    { icon: FileText, label: "Total Pages", value: structure.total_pages, color: "text-brand-orange" },
    { icon: Link2, label: "Broken Links", value: structure.broken_links, color: structure.broken_links > 0 ? "text-red-500" : "text-green-500" },
    { icon: ArrowRightLeft, label: "Redirect Chains", value: structure.redirect_chains, color: structure.redirect_chains > 0 ? "text-amber-500" : "text-green-500" },
    { icon: Ghost, label: "Orphan Pages", value: structure.orphan_pages, color: structure.orphan_pages > 0 ? "text-amber-500" : "text-green-500" },
    { icon: AlertTriangle, label: "Max Depth", value: structure.max_depth, color: "text-slate-600" },
    { icon: Timer, label: "Avg Load Time", value: `${(structure.avg_load_time_ms / 1000).toFixed(1)}s`, color: structure.avg_load_time_ms > 3000 ? "text-red-500" : "text-green-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Site Structure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
