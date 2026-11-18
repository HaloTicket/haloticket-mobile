import axios from "axios";
import { CONFIG } from "@/constants/config";
import { storage } from "@/utils/storage";
import { createTokenRefresher, TokenSet, TokenSource } from "./tokenRefresher";

/**
 * Làm mới token qua backend (`/auth/refresh`).
 * Dùng axios thuần có chủ đích: interceptor của axiosClient gọi refreshAccessToken nên dùng nó ở đây sẽ gây vòng lặp.
 */
async function refreshViaBackend(refreshToken: string): Promise<TokenSet> {
  const res = await axios.post(
    `${CONFIG.API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { timeout: CONFIG.TIMEOUT },
  );
  return { accessToken: res.data?.accessToken, refreshToken: res.data?.refreshToken };
}

/** Làm mới token trực tiếp tại Keycloak bằng grant `refresh_token`. */
async function refreshViaKeycloak(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CONFIG.KEYCLOAK_CLIENT_ID,
    refresh_token: refreshToken,
  }).toString();
  const res = await axios.post(
    `${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.KEYCLOAK_REALM}/protocol/openid-connect/token`,
    body,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: CONFIG.TIMEOUT },
  );
  return { accessToken: res.data?.access_token, refreshToken: res.data?.refresh_token };
}

/** Lưu access token, nguồn token và refresh token (nếu có) vào bộ nhớ cục bộ. */
export async function saveSession(tokens: TokenSet, source: TokenSource): Promise<void> {
  await storage.setItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN, tokens.accessToken);
  await storage.setItemAsync(CONFIG.STORAGE_KEYS.TOKEN_SOURCE, source);
  if (tokens.refreshToken) {
    await storage.setItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }
}

/** Xóa toàn bộ token và nguồn token đã lưu. */
export async function clearSession(): Promise<void> {
  await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
  await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
  await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.TOKEN_SOURCE);
}

/** Lấy access token mới từ refresh token đã lưu (dùng chung giữa các lời gọi đồng thời); null nếu không làm mới được. */
export const refreshAccessToken = createTokenRefresher({
  store: {
    /** Đọc refresh token đã lưu. */
    getRefreshToken: () => storage.getItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
    /** Đọc nguồn token đã lưu; mặc định là `backend` nếu không phải `keycloak`. */
    getSource: async () => ((await storage.getItemAsync(CONFIG.STORAGE_KEYS.TOKEN_SOURCE)) === "keycloak" ? "keycloak" : "backend"),
    save: saveSession,
    /** Xóa refresh token đã lưu. */
    clearRefreshToken: () => storage.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
  },
  refreshViaBackend,
  refreshViaKeycloak,
});
