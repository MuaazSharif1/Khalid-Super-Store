import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("kss_token") || null);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("kss_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me(token)
      .then(({ user }) => {
        setUser(user);
        localStorage.setItem("kss_user", JSON.stringify(user));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("kss_token");
        localStorage.removeItem("kss_user");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(token, user) {
    setToken(token);
    setUser(user);
    localStorage.setItem("kss_token", token);
    localStorage.setItem("kss_user", JSON.stringify(user));
  }

  async function login(email, password) {
    const { token, user } = await api.login(email, password);
    persist(token, user);
    return user;
  }

  async function register(payload) {
    const { token, user } = await api.register(payload);
    persist(token, user);
    return user;
  }

  async function googleLogin(credential) {
    const { token, user } = await api.googleLogin(credential);
    persist(token, user);
    return user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("kss_token");
    localStorage.removeItem("kss_user");
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
