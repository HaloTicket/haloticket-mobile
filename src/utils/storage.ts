import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return await AsyncStorage.getItem(key);
  },
  
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // ignore
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  }
};
