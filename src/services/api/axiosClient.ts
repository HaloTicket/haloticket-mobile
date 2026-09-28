import axios from "axios";
import { CONFIG } from "@/constants/config";
import { storage } from "@/utils/storage";

const axiosClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.TIMEOUT,
});

// request interceptor: attach bearer staff token if present
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
      if (token && config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token.trim()}`);
        } else {
          config.headers.Authorization = `Bearer ${token.trim()}`;
        }
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

interface AuthRequestMetadata {
  _retry?: boolean;
}

// response interceptor: catch errors and retry public calls if token is invalid/expired
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    console.warn("API Error:", error.config?.url, error.response?.status);
    const originalRequest = error.config as (typeof error.config & AuthRequestMetadata) | undefined;
    
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Remove token and retry
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
           storage.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN).catch(console.warn);
        }
        return Promise.reject(retryErr);
      }
    }
    
    return Promise.reject(error);
  },
);

export default axiosClient;
