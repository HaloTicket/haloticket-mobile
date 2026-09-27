import { Platform } from "react-native";

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8888/api";
const rawKeycloakUrl = process.env.EXPO_PUBLIC_KEYCLOAK_URL || "http://10.0.2.2:9080";

const isWeb = Platform.OS === "web";
const API_BASE_URL = isWeb ? rawApiUrl.replace("10.0.2.2", "localhost") : rawApiUrl;
const KEYCLOAK_URL = isWeb ? rawKeycloakUrl.replace("10.0.2.2", "localhost") : rawKeycloakUrl;

export const CONFIG = {
  API_BASE_URL,
  KEYCLOAK_URL,
  KEYCLOAK_REALM: process.env.EXPO_PUBLIC_KEYCLOAK_REALM || "haloticket-realm",
  KEYCLOAK_CLIENT_ID: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || "haloticket-mobile",
  TIMEOUT: 10000,
  STORAGE_KEYS: {
    STAFF_TOKEN: "halo_staff_token",
    STAFF_INFO: "halo_staff_info",
    ACTIVE_GATE: "halo_active_gate",
    THEME: "halo_theme",
  },
};
