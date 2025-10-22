'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import apiService, { User } from '@/app/services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    tenantName: string,
  ) => Promise<void>;
  completeInvitation: (token: string, name: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      apiService.setToken(token);
      apiService.getAuthenticatedUser()
        .then(response => {
          if (response.success) {
            setUser(response.user);
          }
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem('authToken');
          apiService.setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.success) {
        const token = response.token;
        localStorage.setItem('authToken', token);
        apiService.setToken(token);
        setUser(response.user);
        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    tenantName: string,
  ) => {
    try {
      const response = await apiService.register(name, email, password, passwordConfirmation, tenantName);
      if (response.success) {
        return response;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const completeInvitation = async (token: string, name: string, password: string, passwordConfirmation: string) => {
    const response = await apiService.completeInvitation(token, {
      name,
      password,
      password_confirmation: passwordConfirmation,
    });

    if (response.success) {
      const authToken: string = response.token;
      localStorage.setItem('authToken', authToken);
      apiService.setToken(authToken);
      setUser(response.user);
      return;
    }

    throw new Error(response.message || 'Failed to complete invitation');
  };

  const logout = () => {
    apiService.logout().finally(() => {
      localStorage.removeItem('authToken');
      apiService.setToken(null);
      setUser(null);
    });
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.roles?.some(role => role.name === 'admin') || false;
  const isSuperAdmin = user?.roles?.some(role => role.name === 'super-admin') || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        completeInvitation,
        logout,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
