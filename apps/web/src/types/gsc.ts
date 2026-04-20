export interface GSCConnectionStatus {
  connected: boolean;
  gsc_property?: string;
  last_fetch_at?: string;
  created_at?: string;
}

export interface GSCProperty {
  site_url: string;
  permission_level: string;
}

export interface GSCKeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCSnapshot {
  date_range_start: string;
  date_range_end: string;
  top_queries: GSCKeywordRow[];
  top_pages: GSCPageRow[];
  opportunity_queries: GSCKeywordRow[];
  device_breakdown: Record<string, { clicks: number; impressions: number }>;
  country_breakdown: Array<{ country: string; clicks: number; impressions: number }>;
  fetched_at: string;
}
