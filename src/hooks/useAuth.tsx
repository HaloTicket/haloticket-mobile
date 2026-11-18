import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DeviceEventEmitter } from "react-native";
import { storage } from "@/utils/storage";
import { authApi } from "@/services/auth/authApi";
import { saveSession, refreshAccessToken } from "@/services/auth/tokenSession";
import { CONFIG } from "@/constants/config";
import { jwtDecode } from "jwt-decode";
import { useModal } from "@/hooks/useModal";
import { logError, logWarn } from "@/utils/log";

/** Thông tin người dùng lấy từ các claim của JWT. */
interface User {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  preferred_username?: string;
}

/** Giá trị của ngữ cảnh xác thực: trạng thái đăng nhập, người dùng và các hàm đăng nhập, đăng xuất. */
interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (username: string, pin: string) => Promise<void>;
  setAuthenticatedToken: (token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/** Kiểm tra JWT đã hết hạn chưa theo claim `exp`; token không giải mã được coi là đã hết hạn. */
function isExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    return Boolean(decoded.exp && decoded.exp * 1000 < Date.now());
  } catch {
    return true;
  }
}

/**
 * Cung cấp ngữ cảnh xác thực cho ứng dụng: khôi phục phiên từ bộ nhớ khi khởi động
 * và lắng nghe sự kiện hết hạn phiên hoặc lỗi API để hiện hộp thoại.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  /** Giải mã token để lấy thông tin người dùng và đánh dấu đã đăng nhập; token hết hạn hoặc sai thì đăng xuất. */
  const processToken = (token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      
      // kiểm tra token đã hết hạn chưa
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
    // kiểm tra token khi khởi động
    /** Đọc token đã lưu, làm mới nếu hết hạn rồi khôi phục phiên; luôn tắt trạng thái đang tải khi xong. */
    const checkToken = async () => {
      try {
        let token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
        if (token && isExpired(token)) {
          // access token đã lưu hết hạn lúc ứng dụng đang đóng: làm mới thay vì bắt nhập lại mật khẩu
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

  /**
   * Đăng nhập bằng tên đăng nhập và mật khẩu rồi nạp phiên từ token đã lưu.
   * @param username - tên đăng nhập hoặc email
   * @param pin - mật khẩu
   * @throws lỗi từ API đăng nhập được ném lại cho nơi gọi xử lý
   */
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

  /** Đăng xuất: gọi API (bỏ qua lỗi) rồi xóa trạng thái đăng nhập và người dùng cục bộ. */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    setIsAuthenticated(false);
    setUser(null);
  };

  /**
   * Lưu phiên có sẵn token (đăng nhập Google qua Keycloak) rồi nạp thông tin người dùng.
   * Đăng nhập Google đi thẳng tới Keycloak nên refresh token được làm mới ở Keycloak, không qua backend.
   * @param token - access token
   * @param refreshToken - refresh token (nếu có)
   */
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

/** Hook truy cập ngữ cảnh xác thực; cần nằm trong {@code AuthProvider}. */
export const useAuth = () => useContext(AuthContext);
