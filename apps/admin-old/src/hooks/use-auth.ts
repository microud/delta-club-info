import { useState, useEffect, useCallback } from 'react';
import { getMe } from '@/lib/api';

interface Admin {
  id: string;
  username: string;
  role: string;
}

export function useAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setAdmin(me);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAdmin(null);
  }, []);

  return { admin, loading, logout, checkAuth };
}
