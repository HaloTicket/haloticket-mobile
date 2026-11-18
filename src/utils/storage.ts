import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/** Lớp lưu trữ khóa-giá trị: dùng `localStorage` trên web và AsyncStorage trên thiết bị; lỗi trên web được bỏ qua. */
export const storage = {
  /** Đọc giá trị theo khóa; trả về null nếu chưa có hoặc không đọc được trên web. */
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
  
  /** Ghi giá trị theo khóa; trên web bỏ qua lỗi (ví dụ chế độ riêng tư). */
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
  
  /** Xóa giá trị theo khóa; trên web bỏ qua lỗi. */
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
