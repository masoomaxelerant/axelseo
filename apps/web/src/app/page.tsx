import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Search, BarChart3, FileText, Globe, Smartphone, Monitor,
  Shield, Zap, Link2, CheckCircle2, ArrowRight, ChevronRight,
} from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  const isLoggedIn = !!userId;

  return (
    <main className="min-h-screen bg-brand-navy text-white">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="font-display text-xl font-bold">
          <span className="text-brand-orange">Axel</span>SEO
        </span>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-md bg-brand-orange px-5 py-2 text-sm font-semibold transition-colors hover:bg-orange-600">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/sign-in" className="text-sm text-gray-300 hover:text-white transition-colors">Sign In</Link>
              <Link href="/auth/sign-up" className="rounded-md bg-brand-orange px-5 py-2 text-sm font-semibold transition-colors hover:bg-orange-600">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-28">
        {/* Background gradient accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-orange/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Open-source SEO auditing — no paid tools needed
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            Your own{" "}
            <span className="text-brand-orange">SEO engine</span>
            <br />for client audits
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Crawl any website, detect 25+ SEO issues, get Lighthouse scores, and generate
            branded PDF reports — all without paid third-party tools.
          </p>

          {/* Quick audit input */}
          <div className="mt-10 flex items-center justify-center gap-3 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Enter a URL to audit..."
                className="w-full rounded-lg bg-white/10 border border-white/10 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/30 transition-colors"
                disabled
              />
            </div>
            <Link
              href={isLoggedIn ? "/dashboard/audits/new" : "/auth/sign-up"}
              className="rounded-lg bg-brand-orange px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 whitespace-nowrap"
            >
              Run Free Audit
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <StatBadge value="25+" label="Issue Detectors" />
            <StatBadge value="500+" label="Pages per Crawl" />
            <StatBadge value="4" label="Lighthouse Scores" />
            <StatBadge value="12pg" label="PDF Reports" />
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="px-6 py-20 bg-[#0a1525]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Everything you need to audit <span className="text-brand-orange">any website</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              Built for SEO consultants who want full control over their audit pipeline.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Search className="h-5 w-5" />}
              title="Site Crawler"
              description="Playwright-powered headless browser crawls up to 10,000 pages. Respects robots.txt, discovers sitemaps, handles JavaScript-rendered content."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="25 SEO Detectors"
              description="Missing titles, duplicate meta, broken links, redirect chains, thin content, heading hierarchy, schema.org, Open Graph, and more."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Lighthouse Scores"
              description="Performance, Accessibility, Best Practices, and SEO scores with Core Web Vitals — LCP, INP, and CLS for both mobile and desktop."
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="PDF Reports"
              description="12-page branded reports with score gauges, issue breakdowns, recommendations, and a full glossary. Ready to share with clients."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Search Console Data"
              description="Connect Google Search Console for real keyword rankings, impressions, clicks, and CTR data — no third-party estimates."
            />
            <FeatureCard
              icon={<Smartphone className="h-5 w-5" />}
              title="Mobile + Desktop"
              description="Separate Lighthouse results for mobile and desktop. Toggle between them on the audit detail page to compare performance."
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Three steps to a <span className="text-brand-orange">complete audit</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            <StepCard number={1} title="Enter a URL" description="Paste any website URL. Choose single page or full site crawl (up to 10,000 pages)." />
            <StepCard number={2} title="Crawl & Analyze" description="Our crawler discovers pages, runs Lighthouse, and checks 25+ SEO rules. Watch progress live." />
            <StepCard number={3} title="Get Your Report" description="View detailed scores, issues with fix guidance, and download a branded PDF for your client." />
          </div>
        </div>
      </section>

      {/* ── Score Preview ── */}
      <section className="px-6 py-20 bg-[#0a1525]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            This is what your audit looks like
          </h2>
          <p className="text-gray-400 mb-12">Real scores from a real audit — not a mockup.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto mb-12">
            <ScorePreview score={85} label="SEO" />
            <ScorePreview score={72} label="Performance" />
            <ScorePreview score={94} label="Accessibility" />
            <ScorePreview score={91} label="Best Practices" />
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="font-display text-xl font-bold text-green-400">2.1s</p>
              <p className="text-gray-500 text-xs mt-1">LCP (Good)</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="font-display text-xl font-bold text-green-400">120ms</p>
              <p className="text-gray-500 text-xs mt-1">INP (Good)</p>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <p className="font-display text-xl font-bold text-green-400">0.04</p>
              <p className="text-gray-500 text-xs mt-1">CLS (Good)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="px-6 py-14 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-gray-500 mb-6 uppercase tracking-wider">Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span>Next.js</span>
            <span className="text-gray-700">|</span>
            <span>FastAPI</span>
            <span className="text-gray-700">|</span>
            <span>Playwright</span>
            <span className="text-gray-700">|</span>
            <span>Lighthouse</span>
            <span className="text-gray-700">|</span>
            <span>PostgreSQL</span>
            <span className="text-gray-700">|</span>
            <span>Redis</span>
            <span className="text-gray-700">|</span>
            <span>Puppeteer</span>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Ready to run your first audit?
          </h2>
          <p className="mt-4 text-gray-400">
            No credit card. No subscriptions. Just paste a URL and go.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? "/dashboard" : "/auth/sign-up"}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-8 py-3.5 font-semibold text-white transition-colors hover:bg-orange-600"
            >
              {isLoggedIn ? "Open Dashboard" : "Get Started Free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!isLoggedIn && (
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-8 py-3.5 font-semibold text-white transition-colors hover:bg-white/5"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold">
              <span className="text-brand-orange">Axel</span>SEO
            </span>
            <span className="text-xs text-gray-600">by Axelerant Digital</span>
          </div>
          <p className="text-xs text-gray-600">
            Merging Human Creativity With AI
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-components ── */

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-bold text-brand-orange">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-brand-orange/30 hover:bg-white/[0.04]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange mb-4">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-white font-display text-lg font-bold mb-4">
        {number}
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ScorePreview({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const ring = score >= 90 ? "border-green-400/30" : score >= 50 ? "border-amber-400/30" : "border-red-400/30";

  return (
    <div className="flex flex-col items-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${ring}`}>
        <span className={`font-display text-2xl font-bold ${color}`}>{score}</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{label}</p>
    </div>
  );
}
