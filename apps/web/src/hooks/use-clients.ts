"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface ClientFromAPI {
  id: string;
  name: string;
  domain: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateClientPayload {
  name: string;
  domain: string;
  notes?: string;
}

export function useClients() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ClientFromAPI[]>("/api/v1/clients/", {
        token: token || undefined,
      });
    },
  });
}

export function useClient(clientId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ClientFromAPI>(`/api/v1/clients/${clientId}`, {
        token: token || undefined,
      });
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const token = await getToken();
      return apiFetch<ClientFromAPI>("/api/v1/clients/", {
        method: "POST",
        body: JSON.stringify(payload),
        token: token || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const token = await getToken();
      return apiFetch<void>(`/api/v1/clients/${clientId}`, {
        method: "DELETE",
        token: token || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
