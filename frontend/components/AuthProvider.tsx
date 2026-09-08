'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Role = 'super_admin' | 'grid_operator' | 'research_analyst';

type User = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
};

type LoginCredentials = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

type AuthResponse = {
  access_token: string;
  user: User;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseResponse(response: Response): Promise<AuthResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || 'Unable to authenticate');
  }
  return response.json();
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!response.ok) {
        setUser(null);
        setAccessToken(null);
        return false;
      }
      const payload = await response.json() as AuthResponse;
      setAccessToken(payload.access_token);
      setUser(payload.user);
      return true;
    } catch {
      setUser(null);
      setAccessToken(null);
      return false;
    }
  };

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await fetch('/api/auth/login', {
      body: JSON.stringify(credentials),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    });
    const payload = await parseResponse(response);
    setAccessToken(payload.access_token);
    setUser(payload.user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const value = useMemo(() => ({ user, accessToken, loading, login, logout, refreshSession }), [user, accessToken, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export type { Role, User };
