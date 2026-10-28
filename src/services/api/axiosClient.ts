import axios from "axios";
import { DeviceEventEmitter } from "react-native";
import { CONFIG } from "@/constants/config";
import { storage } from "@/utils/storage";
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
      console.error("Error retrieving token:", error);
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

      // remove token and retry
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
          storage.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN).catch(() => {});
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
