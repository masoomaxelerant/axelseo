const API_BASE = "http://localhost:8000";
const APP_BASE = "http://localhost:3000";

export { APP_BASE };

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get("axelseo_token");
  return result.axelseo_token || null;
}

export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ axelseo_token: token });
}

export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove("axelseo_token");
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      await clearAuthToken();
      throw new Error("Session expired — please log in again");
    }
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "API request failed");
  }
  return res.json();
}
