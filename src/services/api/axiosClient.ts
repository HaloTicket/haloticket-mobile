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
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// response interceptor: catch errors
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[Staff App] Unauthorized or expired session!");
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
