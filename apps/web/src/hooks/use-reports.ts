"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Audit } from "@/types/audit";

export function useCompletedAudits() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["completed-audits"],
    queryFn: async () => {
      const token = await getToken();
      const audits = await apiFetch<Audit[]>("/api/v1/audits/", {
        token: token || undefined,
      });
      return audits.filter((a) => a.status === "completed");
    },
  });
}
