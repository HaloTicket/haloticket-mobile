import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { storage } from "@/utils/storage";
import { authApi } from "@/services/auth/authApi";
import { CONFIG } from "@/constants/config";

interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pin: string) => Promise<void>;
  setAuthenticatedToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // check token on mount
    const checkToken = async () => {
      try {
        const token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
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

  const setAuthenticatedToken = async (token: string) => {
    await storage.setItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN, token);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, setAuthenticatedToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
