/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authMe } from "../services/legalApi";
import {
  clearAuthSession,
  readCurrentUserFromStorage,
  saveAuthSession,
  CURRENT_USER_KEY,
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "../utils/authSession";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => readCurrentUserFromStorage());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const onStorage = (event) => {
      if (
        event.key === CURRENT_USER_KEY ||
        event.key === AUTH_TOKEN_KEY ||
        event.key === REFRESH_TOKEN_KEY
      ) {
        setCurrentUser(readCurrentUserFromStorage());
      }
    };
    const onAuthUpdated = () => {
      setCurrentUser(readCurrentUserFromStorage());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-updated", onAuthUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-updated", onAuthUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncSession = async () => {
      const hasAccessToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
      const hasRefreshToken = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
      if (!hasAccessToken && !hasRefreshToken) return;
      setIsSyncing(true);
      try {
        const response = await authMe();
        if (cancelled) return;
        const user = response?.user || null;
        if (user) {
          saveAuthSession({ user });
          setCurrentUser(user);
        }
      } catch {
        if (cancelled) return;
        clearAuthSession();
        setCurrentUser(null);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    void syncSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (session) => {
    const user = session?.user || null;
    const accessToken = session?.accessToken || "";
    const refreshToken = session?.refreshToken || "";
    if (!user) return;
    saveAuthSession({
      user: {
        ...user,
        role: user.role || "user",
      },
      accessToken,
      refreshToken,
    });
    setCurrentUser({
      ...user,
      role: user.role || "user",
    });
  };

  const logout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  const refreshFromStorage = () => {
    setCurrentUser(readCurrentUserFromStorage());
  };

  const value = useMemo(
    () => ({
      currentUser,
      isLoggedIn: Boolean(currentUser),
      isSyncing,
      login,
      logout,
      refreshFromStorage,
    }),
    [currentUser, isSyncing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
