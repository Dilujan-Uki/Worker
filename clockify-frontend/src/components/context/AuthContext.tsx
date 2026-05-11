import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'WORKER_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on mount ───────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Basic validation: must have a token
        if (parsed && parsed.token) {
          setUser(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Persist user to localStorage whenever it changes ──────────────────
  const persistUser = useCallback((userData: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  // ── Email/password login ───────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post('/auth/login', { email, password });
    const userData: User = res.data.data;
    persistUser(userData);
  };

  // ── Email/password register ────────────────────────────────────────────
  const register = async (name: string, email: string, password: string): Promise<void> => {
    const res = await api.post('/auth/register', { name, email, password });
    const userData: User = res.data.data;
    persistUser(userData);
  };

  // ── Google OAuth login/register ────────────────────────────────────────
  const googleLogin = async (credential: string): Promise<void> => {
    const res = await api.post('/auth/google', { credential });
    const userData: User = res.data.data;
    persistUser(userData);
  };

  // ── Logout: clear storage AND state ───────────────────────────────────
  // This is the fix for the "can't login after logout" bug:
  // We clear both the state and localStorage cleanly.
  const logout = useCallback((): void => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
