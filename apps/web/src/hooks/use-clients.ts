"use client";

import { useQuery } from "@tanstack/react-query";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import type { Client } from "@/types/client";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      // TODO: wire to real API when ready
      return MOCK_CLIENTS;
    },
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async (): Promise<Client | undefined> => {
      return MOCK_CLIENTS.find((c) => c.id === clientId);
    },
  });
}
