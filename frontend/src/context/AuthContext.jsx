import { createContext, useContext, useState, useEffect } from "react";
import * as api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("mahyco_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("mahyco_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem("mahyco_token", data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    localStorage.setItem("mahyco_token", data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("mahyco_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
