import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { authApi } from "@/services/auth/authApi";

import { CONFIG } from "@/constants/config";

interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check token on mount
    const checkToken = async () => {
      try {
        const token = await SecureStore.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
        if (token) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Failed to check token:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  const login = async (username: string, pin: string) => {
    try {
      await authApi.login(username, pin);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    await authApi.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
