export interface Report {
  id: string;
  audit_id: string;
  client_name: string;
  url: string;
  file_url: string;
  format: "pdf";
  created_at: string;
  file_size_bytes: number;
}
