"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateAudit } from "@/hooks/use-audits";

export function NewAuditForm() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const createAudit = useCreateAudit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    createAudit.mutate(
      { url: normalizedUrl },
      {
        onSuccess: (audit) => {
          router.push(`/dashboard/audits/${audit.id}`);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3" role="search" aria-label="Start new audit">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter URL to audit (e.g. example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="pl-9"
          required
          disabled={createAudit.isPending}
          aria-label="Website URL"
        />
      </div>
      <Button type="submit" disabled={createAudit.isPending || !url.trim()}>
        {createAudit.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          "Run Audit"
        )}
      </Button>
      {createAudit.isError && (
        <p className="absolute -bottom-6 left-0 text-xs text-red-600">
          {createAudit.error.message}
        </p>
      )}
    </form>
  );
}
