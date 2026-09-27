import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { CONFIG } from "@/constants/config";

const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL || "http://10.0.2.2:8081/realms/haloticket";

// For mobile apps connecting to Keycloak, we usually use Resource Owner Password Credentials (direct grant)
// Note: In a real production app, PKCE flow with a web view is recommended for better security.
export const authApi = {
  login: async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append("client_id", "haloticket-web"); // Assuming the same client or create a mobile specific one
    params.append("grant_type", "password");
    params.append("username", username);
    params.append("password", password);

    const response = await axios.post(`${KEYCLOAK_URL}/protocol/openid-connect/token`, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.data.access_token) {
      await SecureStore.setItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN, response.data.access_token);
      // await SecureStore.setItemAsync("refresh_token", response.data.refresh_token);
    }

    return response.data;
  },

  logout: async () => {
    // Optionally call keycloak logout endpoint
    await SecureStore.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
    // await SecureStore.deleteItemAsync("refresh_token");
  },
};
