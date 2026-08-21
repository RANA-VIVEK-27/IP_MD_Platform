'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from './types';
import { ApiClient } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; role: UserRole; license_number?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_REDIRECTS: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  admin: '/admin',
  user_admin: '/user-admin',
  super_admin: '/super-admin',
  pharmacy_staff_owned: '/admin',
  partner_pharmacy: '/admin',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('ipmd_user');
      const storedToken = localStorage.getItem('ipmd_access_token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (e) {
      console.warn('Auth restoration failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await ApiClient.login(email, password);
    setUser(res.user);
    setToken(res.access_token);
    localStorage.setItem('ipmd_user', JSON.stringify(res.user));
    localStorage.setItem('ipmd_access_token', res.access_token);
    if (res.refresh_token) {
      localStorage.setItem('ipmd_refresh_token', res.refresh_token);
    }
  };

  const register = async (data: { email: string; password: string; full_name: string; role: UserRole; license_number?: string }) => {
    await ApiClient.register({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      role: data.role,
      ...(data.license_number ? { license_number: data.license_number } : {}),
    });
    await ApiClient.verifyEmail(data.email);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ipmd_user');
    localStorage.removeItem('ipmd_access_token');
    localStorage.removeItem('ipmd_refresh_token');
  }, []);

  const refreshUser = async () => {
    try {
      const me = await ApiClient.getMe();
      setUser(me);
      localStorage.setItem('ipmd_user', JSON.stringify(me));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export { ROLE_REDIRECTS };
