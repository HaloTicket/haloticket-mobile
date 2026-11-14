import axios from "axios";
import { CONFIG } from "@/constants/config";
import { storage } from "@/utils/storage";
import { createTokenRefresher, TokenSet, TokenSource } from "./tokenRefresher";

// plain axios on purpose: axiosClient's own interceptors call refreshAccessToken, so using it here would loop
async function refreshViaBackend(refreshToken: string): Promise<TokenSet> {
  const res = await axios.post(
    `${CONFIG.API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { timeout: CONFIG.TIMEOUT },
  );
  return { accessToken: res.data?.accessToken, refreshToken: res.data?.refreshToken };
}

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

export async function saveSession(tokens: TokenSet, source: TokenSource): Promise<void> {
  await storage.setItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN, tokens.accessToken);
  await storage.setItemAsync(CONFIG.STORAGE_KEYS.TOKEN_SOURCE, source);
  if (tokens.refreshToken) {
    await storage.setItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }
}

export async function clearSession(): Promise<void> {
  await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
  await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
  await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.TOKEN_SOURCE);
}

export const refreshAccessToken = createTokenRefresher({
  store: {
    getRefreshToken: () => storage.getItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
    getSource: async () => ((await storage.getItemAsync(CONFIG.STORAGE_KEYS.TOKEN_SOURCE)) === "keycloak" ? "keycloak" : "backend"),
    save: saveSession,
    clearRefreshToken: () => storage.deleteItemAsync(CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
  },
  refreshViaBackend,
  refreshViaKeycloak,
});
