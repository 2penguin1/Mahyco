import { createContext, useContext, useEffect, useState, useCallback } from "react";

const TOKEN_KEY = "mahyco_access_token";
const USER_KEY = "mahyco_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token;

  const saveAuth = useCallback((newToken, newUser) => {
    setToken(newToken);
    window.localStorage.setItem(TOKEN_KEY, newToken);
    setUser(newUser);
    window.localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const clearAuth = useCallback(() => {
    setToken("");
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }, []);

  const getToken = useCallback(async () => token, [token]);

  const value = {
    token,
    user,
    isAuthenticated,
    saveAuth,
    clearAuth,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return ctx;
}

