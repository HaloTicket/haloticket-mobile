import axios from "axios";
import { CONFIG } from "@/constants/config";

const axiosClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.TIMEOUT,
});

// Request Interceptor: Attach Bearer Staff Token if present
axiosClient.interceptors.request.use(
  async (config) => {
    // In React Native, get token from storage
    // const token = await storage.getItem(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Catch errors
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
