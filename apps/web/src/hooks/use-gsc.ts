"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { GSCConnectionStatus, GSCProperty, GSCSnapshot } from "@/types/gsc";

export function useGSCStatus(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["gsc-status", clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<GSCConnectionStatus>(
        `/api/v1/integrations/gsc/status/${clientId}`,
        { token: token || undefined }
      );
    },
    enabled: !!clientId,
  });
}

export function useGSCData(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["gsc-data", clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<GSCSnapshot | null>(
        `/api/v1/integrations/gsc/data/${clientId}`,
        { token: token || undefined }
      );
    },
    enabled: !!clientId,
  });
}

export function useGSCAuthUrl(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["gsc-auth-url", clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{ auth_url: string; state: string }>(
        `/api/v1/integrations/gsc/auth-url?client_id=${clientId}`,
        { token: token || undefined }
      );
    },
    enabled: false, // only fetch on demand
  });
}

export function useGSCProperties(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["gsc-properties", clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{ properties: GSCProperty[]; client_id: string }>(
        `/api/v1/integrations/gsc/properties?client_id=${clientId}`,
        { token: token || undefined }
      );
    },
    enabled: false,
  });
}

export function useGSCConnect() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { client_id: string; gsc_property: string }) => {
      const token = await getToken();
      return apiFetch("/api/v1/integrations/gsc/connect", {
        method: "POST",
        body: JSON.stringify(payload),
        token: token || undefined,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gsc-status", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["gsc-data", variables.client_id] });
    },
  });
}

export function useGSCDisconnect() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const token = await getToken();
      return apiFetch(`/api/v1/integrations/gsc/disconnect/${clientId}`, {
        method: "POST",
        token: token || undefined,
      });
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ["gsc-status", clientId] });
      queryClient.invalidateQueries({ queryKey: ["gsc-data", clientId] });
    },
  });
}
