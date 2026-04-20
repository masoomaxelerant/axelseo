import { useEffect, useState } from "react";
import { getAuthToken, setAuthToken, clearAuthToken } from "~/src/lib/api";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthToken().then((t) => {
      setToken(t);
      setLoading(false);
    });
  }, []);

  const login = async (newToken: string) => {
    await setAuthToken(newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await clearAuthToken();
    setToken(null);
  };

  return { token, isLoggedIn: !!token, loading, login, logout };
}
