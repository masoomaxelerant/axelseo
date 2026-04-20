"use client";

import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number | null;
  label: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function getStrokeColor(score: number): string {
  if (score >= 90) return "stroke-green-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function getTrackColor(score: number): string {
  if (score >= 90) return "stroke-green-100";
  if (score >= 50) return "stroke-amber-100";
  return "stroke-red-100";
}

const sizes = {
  sm: { box: 80, r: 30, stroke: 6, text: "text-lg", label: "text-[10px]" },
  md: { box: 120, r: 46, stroke: 8, text: "text-3xl", label: "text-xs" },
  lg: { box: 160, r: 62, stroke: 10, text: "text-4xl", label: "text-sm" },
};

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const s = sizes[size];
  const circumference = 2 * Math.PI * s.r;
  const displayScore = score ?? 0;
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1" role="meter" aria-valuenow={displayScore} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${displayScore}`}>
      <div className="relative" style={{ width: s.box, height: s.box }}>
        <svg width={s.box} height={s.box} className="-rotate-90">
          {/* Track */}
          <circle
            cx={s.box / 2}
            cy={s.box / 2}
            r={s.r}
            fill="none"
            strokeWidth={s.stroke}
            className={score !== null ? getTrackColor(displayScore) : "stroke-gray-100"}
          />
          {/* Progress */}
          {score !== null && (
            <circle
              cx={s.box / 2}
              cy={s.box / 2}
              r={s.r}
              fill="none"
              strokeWidth={s.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(getStrokeColor(displayScore), "transition-[stroke-dashoffset] duration-700 ease-out")}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-display font-bold", s.text, score !== null ? getScoreColor(displayScore) : "text-gray-300")}>
            {score !== null ? Math.round(displayScore) : "--"}
          </span>
        </div>
      </div>
      <span className={cn("font-medium text-muted-foreground mt-1", s.label)}>{label}</span>
    </div>
  );
}
