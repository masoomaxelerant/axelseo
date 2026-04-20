"use client";

import { useQuery } from "@tanstack/react-query";
import { MOCK_REPORTS } from "@/lib/mock-data";
import type { Report } from "@/types/report";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async (): Promise<Report[]> => {
      return MOCK_REPORTS;
    },
  });
}
