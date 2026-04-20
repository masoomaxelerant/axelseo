/**
 * Server-side SVG chart generators for PDF reports.
 * Pure string-based SVG — no DOM or canvas dependencies.
 */

const ORANGE = "#FF5C00";
const NAVY = "#0D1B2A";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const GRAY = "#E5E7EB";
const LIGHT_GRAY = "#F3F4F6";

function scoreColor(score: number): string {
  if (score >= 90) return GREEN;
  if (score >= 50) return AMBER;
  return RED;
}

function ratingColor(rating: string): string {
  if (rating === "good") return GREEN;
  if (rating === "needs-improvement") return AMBER;
  return RED;
}

/**
 * Circular score gauge as inline SVG string.
 */
export function scoreGaugeSvg(
  score: number,
  label: string,
  size: number = 120
): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return `
    <svg width="${size}" height="${size + 30}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GRAY}" stroke-width="8"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="'Space Grotesk',sans-serif"
        font-size="${size * 0.28}" font-weight="700" fill="${color}">${Math.round(score)}</text>
      <text x="${cx}" y="${size + 20}" text-anchor="middle" font-family="Inter,sans-serif"
        font-size="11" fill="#6B7280">${label}</text>
    </svg>`;
}

/**
 * Horizontal bar chart for issue severity breakdown.
 */
export function severityBarSvg(
  critical: number,
  warning: number,
  info: number
): string {
  const total = critical + warning + info || 1;
  const w = 400;
  const h = 40;
  const cw = (critical / total) * w;
  const ww = (warning / total) * w;
  const iw = (info / total) * w;

  return `
    <svg width="${w}" height="${h + 30}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${cw}" height="${h}" rx="4" fill="${RED}"/>
      <rect x="${cw}" y="0" width="${ww}" height="${h}" rx="0" fill="${AMBER}"/>
      <rect x="${cw + ww}" y="0" width="${iw}" height="${h}" rx="4" fill="#60A5FA"/>
      ${critical > 0 ? `<text x="${cw / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="white">${critical}</text>` : ""}
      ${warning > 0 ? `<text x="${cw + ww / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="white">${warning}</text>` : ""}
      ${info > 0 ? `<text x="${cw + ww + iw / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="white">${info}</text>` : ""}
      <text x="0" y="${h + 22}" font-family="Inter,sans-serif" font-size="10" fill="#6B7280">
        <tspan fill="${RED}">&#9679;</tspan> Critical (${critical})
        <tspan dx="12" fill="${AMBER}">&#9679;</tspan> Warning (${warning})
        <tspan dx="12" fill="#60A5FA">&#9679;</tspan> Info (${info})
      </text>
    </svg>`;
}

/**
 * Core Web Vital metric badge as SVG.
 */
export function cwvBadgeSvg(
  label: string,
  value: string,
  target: string,
  rating: string
): string {
  const color = ratingColor(rating);
  const ratingLabel = rating === "good" ? "Good" : rating === "needs-improvement" ? "Needs Work" : "Poor";

  return `
    <div class="cwv-badge">
      <div class="cwv-value" style="color: ${color}">${value}</div>
      <div class="cwv-label">${label}</div>
      <div class="cwv-rating" style="background: ${color}20; color: ${color}">${ratingLabel}</div>
      <div class="cwv-target">Target: ${target}</div>
    </div>`;
}
