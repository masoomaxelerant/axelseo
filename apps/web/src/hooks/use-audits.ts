"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { MOCK_AUDITS, MOCK_AUDIT_DETAIL } from "@/lib/mock-data";
import type { Audit, AuditDetail } from "@/types/audit";

const USE_MOCK = process.env.NEXT_PUBLIC_API_URL === undefined;

interface CreateAuditPayload {
  url: string;
  project_id?: string;
  max_pages?: number;
}

export function useCreateAudit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAuditPayload) => {
      const token = await getToken();
      return apiFetch<Audit>("/api/v1/audits/", {
        method: "POST",
        body: JSON.stringify(payload),
        token: token || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useAudits(projectId?: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["audits", projectId],
    queryFn: async () => {
      if (USE_MOCK) return MOCK_AUDITS;
      const token = await getToken();
      const params = projectId ? `?project_id=${projectId}` : "";
      return apiFetch<Audit[]>(`/api/v1/audits/${params}`, {
        token: token || undefined,
      });
    },
  });
}

export function useAudit(auditId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["audit", auditId],
    queryFn: async () => {
      if (USE_MOCK) {
        const mock = MOCK_AUDITS.find((a) => a.id === auditId);
        if (mock && mock.id === "a1") return MOCK_AUDIT_DETAIL;
        if (mock) return { ...MOCK_AUDIT_DETAIL, ...mock };
        return MOCK_AUDIT_DETAIL;
      }
      const token = await getToken();
      return apiFetch<AuditDetail>(`/api/v1/audits/${auditId}`, {
        token: token || undefined,
      });
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 3000;
    },
  });
}
