import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Globe, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";

interface ClientCardProps {
  client: Client;
}

const trendIcons = {
  up: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
  down: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
  stable: { icon: Minus, color: "text-gray-500", bg: "bg-gray-50" },
};

export function ClientCard({ client }: ClientCardProps) {
  const trend = client.score_trend ? trendIcons[client.score_trend] : null;
  const TrendIcon = trend?.icon;

  return (
    <Link href={`/dashboard/clients/${client.id}`}>
      <Card className="group transition-all hover:shadow-md hover:border-brand-orange/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy text-white font-display font-bold text-sm">
                {client.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground group-hover:text-brand-orange transition-colors">
                  {client.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {client.domain}
                </div>
              </div>
            </div>
            {client.avg_seo_score != null && (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "font-display text-xl font-bold",
                  client.avg_seo_score >= 90 ? "text-green-500" :
                  client.avg_seo_score >= 50 ? "text-amber-500" : "text-red-500"
                )}>
                  {client.avg_seo_score}
                </span>
                {TrendIcon && (
                  <div className={cn("rounded-full p-1", trend?.bg)}>
                    <TrendIcon className={cn("h-3 w-3", trend?.color)} />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {client.audit_count} audits
            </div>
            {client.last_audit_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(client.last_audit_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
