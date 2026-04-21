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

export function useCancelAudit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditId: string) => {
      const token = await getToken();
      return apiFetch<Audit>(`/api/v1/audits/${auditId}/cancel`, {
        method: "POST",
        token: token || undefined,
      });
    },
    onSuccess: (_, auditId) => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["audit", auditId] });
    },
  });
}

export function useDeleteAudit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditId: string) => {
      const token = await getToken();
      return apiFetch<void>(`/api/v1/audits/${auditId}`, {
        method: "DELETE",
        token: token || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useRetryAudit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditId: string) => {
      const token = await getToken();
      return apiFetch<Audit>(`/api/v1/audits/${auditId}/retry`, {
        method: "POST",
        token: token || undefined,
      });
    },
    onSuccess: (data, auditId) => {
      // Immediately update the cache with the new "pending" status
      // so refetchInterval resumes polling
      queryClient.setQueryData(["audit", auditId], data);
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["audit-pages", auditId] });
    },
  });
}

export interface CrawledPageEntry {
  url: string;
  status_code: number | null;
  title: string | null;
  load_time_ms: number | null;
}

export function useAuditPages(auditId: string, enabled: boolean) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["audit-pages", auditId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<CrawledPageEntry[]>(`/api/v1/audits/${auditId}/pages`, {
        token: token || undefined,
      });
    },
    enabled,
    refetchInterval: enabled ? 3000 : false,
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
      // Use /detail endpoint for completed audits (includes issues + site structure)
      // Use /audits/{id} for in-progress audits (lighter payload)
      try {
        return await apiFetch<AuditDetail>(`/api/v1/audits/${auditId}/detail`, {
          token: token || undefined,
        });
      } catch {
        return apiFetch<AuditDetail>(`/api/v1/audits/${auditId}`, {
          token: token || undefined,
        });
      }
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 3000;
    },
  });
}

export function useExportPdf(auditId: string) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/v1/audits/${auditId}/export-pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Export failed" }));
        throw new Error(err.detail);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "report.pdf";
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
