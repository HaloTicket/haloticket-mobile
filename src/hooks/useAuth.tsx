import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DeviceEventEmitter } from "react-native";
import { storage } from "@/utils/storage";
import { authApi } from "@/services/auth/authApi";
import { CONFIG } from "@/constants/config";
import { jwtDecode } from "jwt-decode";
import { useModal } from "@/hooks/useModal";

interface User {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  preferred_username?: string;
}

interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (username: string, pin: string) => Promise<void>;
  setAuthenticatedToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  const processToken = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      
      // check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.warn("Token is expired");
        logout();
        return;
      }
      
      setUser({
        id: decoded.sub,
        name: decoded.name || decoded.given_name || decoded.preferred_username,
        email: decoded.email,
        picture: decoded.picture,
        preferred_username: decoded.preferred_username,
      });
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Invalid token:", e);
      logout();
    }
  };

  const { showAlert } = useModal();

  useEffect(() => {
    // check token on mount
    const checkToken = async () => {
      try {
        const token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
        if (token) {
          processToken(token);
        }
      } catch (error) {
        console.error("Failed to check token:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();

    const tokenExpiredSub = DeviceEventEmitter.addListener('onTokenExpired', () => {
      showAlert(
        "Phiên đăng nhập hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục.",
        () => logout()
      );
    });

    const apiErrorSub = DeviceEventEmitter.addListener('onApiError', (errorData: { title: string, message: string }) => {
      showAlert(
        errorData.title,
        errorData.message
      );
    });

    return () => {
      tokenExpiredSub.remove();
      apiErrorSub.remove();
    };
  }, []);

  const login = async (username: string, pin: string) => {
    try {
      const response = await authApi.login(username, pin);
      const token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
      if (token) processToken(token);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    setIsAuthenticated(false);
    setUser(null);
    await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
  };

  const setAuthenticatedToken = async (token: string) => {
    await storage.setItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN, token);
    processToken(token);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, setAuthenticatedToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
