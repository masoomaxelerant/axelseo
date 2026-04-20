import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAuditForm } from "@/components/audit/new-audit-form";

export default function NewAuditPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-brand-navy">
        New Audit
      </h1>
      <p className="mt-2 text-muted-foreground">
        Enter a URL to run a full technical SEO audit.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-lg">Target URL</CardTitle>
          <CardDescription>
            We&apos;ll crawl up to 500 pages, run Lighthouse, and analyze on-page SEO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewAuditForm />
        </CardContent>
      </Card>
    </div>
  );
}
