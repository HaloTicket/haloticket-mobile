import axios from "axios";
import { DeviceEventEmitter } from "react-native";
import { CONFIG } from "@/constants/config";
import { storage } from "@/utils/storage";
import { logError } from "@/utils/log";
import { refreshAccessToken, clearSession } from "@/services/auth/tokenSession";
import i18n from "@/locales/i18n";
import {
  classifyApiError,
  createErrorThrottler,
  extractHost,
  ErrorClassification,
} from "./errorClassification";

export { classifyApiError, extractHost, ErrorClassification };

declare module "axios" {
  interface AxiosRequestConfig {
    skipGlobalError?: boolean | number[];
  }
}

const throttler = createErrorThrottler(3000);

/** Kiểm tra yêu cầu có tắt hộp thoại lỗi chung không: `skipGlobalError` là true, hoặc là danh sách mã HTTP chứa mã của phản hồi. */
function skipsGlobalError(error: any): boolean {
  const skip = error?.config?.skipGlobalError;
  if (skip === true) return true;
  return Array.isArray(skip) && skip.includes(error?.response?.status);
}

/** Đặt lại bộ chặn lỗi trùng (dùng khi cần cho phép hiện lại cùng một lỗi ngay). */
export function resetErrorThrottle(): void {
  throttler.reset();
}

/**
 * Phát sự kiện `onApiError` để hiện hộp thoại lỗi, bỏ qua lỗi trùng trong cửa sổ chặn.
 * @param title - tiêu đề lỗi
 * @param message - nội dung lỗi
 * @returns true nếu đã phát sự kiện, false nếu bị chặn vì trùng
 */
export function emitApiError(title: string, message: string): boolean {
  const key = `${title}:::${message}`;
  if (!throttler.shouldEmit(key)) {
    return false;
  }
  DeviceEventEmitter.emit("onApiError", { title, message });
  return true;
}

const axiosClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.TIMEOUT || 10000,
});

// interceptor yêu cầu: gắn token Bearer của nhân viên nếu có
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
      if (token && config.headers) {
        if (typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token.trim()}`);
        } else {
          config.headers.Authorization = `Bearer ${token.trim()}`;
        }
      }
    } catch (error) {
      logError("Error retrieving token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** Cờ gắn thêm vào cấu hình yêu cầu để đánh dấu yêu cầu đã được thử lại sau lỗi 401, tránh lặp vô hạn. */
interface AuthRequestMetadata {
  _retry?: boolean;
}

// interceptor phản hồi: bắt lỗi, làm mới token khi gặp 401 và thử lại như yêu cầu công khai nếu token vẫn không hợp lệ
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & AuthRequestMetadata) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // access token hết hạn: làm mới bằng refresh token và gửi lại yêu cầu một lần (không áp dụng cho chính các
      // lệnh đăng nhập, vì ở đó 401 nghĩa là sai thông tin đăng nhập)
      const isAuthCall = String(originalRequest.url || "").startsWith("/auth/");
      if (!isAuthCall) {
        const freshToken = await refreshAccessToken();
        if (freshToken) {
          if (typeof originalRequest.headers?.set === "function") {
            originalRequest.headers.set("Authorization", `Bearer ${freshToken}`);
          } else {
            originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${freshToken}` };
          }
          return axiosClient(originalRequest);
        }
      }

      // không có refresh token hoặc bị từ chối: bỏ token và gửi lại như yêu cầu công khai
      if (originalRequest.headers) {
        if (typeof originalRequest.headers.delete === "function") {
          originalRequest.headers.delete("Authorization");
          originalRequest.headers.delete("authorization");
        } else {
          delete (originalRequest.headers as Record<string, unknown>).Authorization;
          delete (originalRequest.headers as Record<string, unknown>).authorization;
        }
      }

      try {
        const retryRes = await axios({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: undefined,
            authorization: undefined,
          },
        });
        return retryRes.data;
      } catch (retryErr: any) {
        if (retryErr?.response?.status === 401) {
          clearSession().catch(() => {});
          DeviceEventEmitter.emit("onTokenExpired");
        }
        return Promise.reject(retryErr);
      }
    }

    const classification = classifyApiError(error, {
      baseUrl: error.config?.baseURL || CONFIG.API_BASE_URL,
      /** Dịch khóa lỗi bằng i18n hiện tại. */
      t: (key, opts) => String(i18n.t(key, opts)),
    });

    if (!skipsGlobalError(error) && classification.shouldEmitModal && classification.title && classification.message) {
      emitApiError(classification.title, classification.message);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
