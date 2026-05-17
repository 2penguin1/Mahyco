import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const TOKEN_KEY = 'mahyco_access_token';
const USER_KEY = 'mahyco_user';
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_name?: string | null;
  picture?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: string;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  getAccessTokenSilently: () => Promise<string>;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  company_name?: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [isLoading] = useState(false);

  const saveAuth = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || 'Login failed');
    }

    const data = await res.json();
    const u = data.user;
    const authUser: AuthUser = {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      company_name: u.company_name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=16a34a&color=fff`,
    };
    saveAuth(data.access_token, authUser);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || 'Registration failed');
    }

    const resp = await res.json();
    const u = resp.user;
    const authUser: AuthUser = {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      company_name: u.company_name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=16a34a&color=fff`,
    };
    saveAuth(resp.access_token, authUser);
  }, []);

  const getAccessTokenSilently = useCallback(async () => token, [token]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      isLoading,
      user,
      token,
      login,
      register,
      logout,
      getAccessTokenSilently,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Alias for compatibility across components
export const useAuth0 = useAuth;
