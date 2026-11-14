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

function skipsGlobalError(error: any): boolean {
  const skip = error?.config?.skipGlobalError;
  if (skip === true) return true;
  return Array.isArray(skip) && skip.includes(error?.response?.status);
}

export function resetErrorThrottle(): void {
  throttler.reset();
}

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

// request interceptor: attach bearer staff token if present
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

interface AuthRequestMetadata {
  _retry?: boolean;
}

// response interceptor: catch errors and retry public calls if token is invalid/expired
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & AuthRequestMetadata) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // an expired access token: renew it with the refresh token and replay the call once (not for the login calls
      // themselves, where a 401 means wrong credentials)
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

      // no refresh token, or it was refused: remove the token and retry as a public call
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
      t: (key, opts) => String(i18n.t(key, opts)),
    });

    if (!skipsGlobalError(error) && classification.shouldEmitModal && classification.title && classification.message) {
      emitApiError(classification.title, classification.message);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
