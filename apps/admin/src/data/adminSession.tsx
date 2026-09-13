import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readUseMockData, writeUseMockData } from "../dataMode";
import { clearAdminToken, getAdminToken, setAdminToken } from "./http";

interface AdminSession {
  useMock: boolean;
  setUseMock: (v: boolean) => void;
  loggedIn: boolean;
  onLoggedIn: (token: string) => void;
  logout: () => void;
}

const Ctx = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [useMock, setUseMockState] = useState(readUseMockData());
  const [loggedIn, setLoggedIn] = useState(!!getAdminToken());

  useEffect(() => {
    const onUnauthorized = () => setLoggedIn(false);
    window.addEventListener("lumi-admin-unauthorized", onUnauthorized);
    return () => window.removeEventListener("lumi-admin-unauthorized", onUnauthorized);
  }, []);

  const setUseMock = useCallback((v: boolean) => {
    writeUseMockData(v);
    setUseMockState(v);
  }, []);

  const onLoggedIn = useCallback((token: string) => {
    setAdminToken(token);
    setLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({ useMock, setUseMock, loggedIn, onLoggedIn, logout }),
    [useMock, setUseMock, loggedIn, onLoggedIn, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminSession must be used within AdminSessionProvider");
  return ctx;
}
