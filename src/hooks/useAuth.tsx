import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DeviceEventEmitter } from "react-native";
import { storage } from "@/utils/storage";
import { authApi } from "@/services/auth/authApi";
import { saveSession, refreshAccessToken } from "@/services/auth/tokenSession";
import { CONFIG } from "@/constants/config";
import { jwtDecode } from "jwt-decode";
import { useModal } from "@/hooks/useModal";
import { logError, logWarn } from "@/utils/log";

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
  setAuthenticatedToken: (token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function isExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    return Boolean(decoded.exp && decoded.exp * 1000 < Date.now());
  } catch {
    return true;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  const processToken = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      
      // check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        logWarn("Token is expired");
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
      logError("Invalid token:", e);
      logout();
    }
  };

  const { showAlert } = useModal();

  useEffect(() => {
    // check token on mount
    const checkToken = async () => {
      try {
        let token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
        if (token && isExpired(token)) {
          // the saved access token ran out while the app was closed: renew it instead of asking for the password again
          token = (await refreshAccessToken()) ?? token;
        }
        if (token) {
          processToken(token);
        }
      } catch (error) {
        logError("Failed to check token:", error);
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
      await authApi.login(username, pin);
      const token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
      if (token) processToken(token);
    } catch (error) {
      logError("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    setIsAuthenticated(false);
    setUser(null);
  };

  // the Google sign-in goes straight to Keycloak, so its refresh token is renewed against Keycloak, not the backend
  const setAuthenticatedToken = async (token: string, refreshToken?: string) => {
    await saveSession({ accessToken: token, refreshToken }, "keycloak");
    processToken(token);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, setAuthenticatedToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
