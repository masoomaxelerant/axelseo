"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendDataPoint {
  date: string;
  seo: number;
  performance: number;
  accessibility: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  title?: string;
}

export function TrendChart({ data, title = "Score Trend" }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Need at least 2 audits to show trends.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                fontSize: "12px",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "Inter, sans-serif" }} />
            <Line type="monotone" dataKey="seo" name="SEO" stroke="#FF5C00" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="performance" name="Performance" stroke="#0D1B2A" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="accessibility" name="Accessibility" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
