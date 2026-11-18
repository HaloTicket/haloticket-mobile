import React, { createContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "./colors";
import { storage } from "@/utils/storage";

/** Chế độ giao diện: sáng, tối hoặc theo hệ thống. */
export type ThemeType = "light" | "dark" | "system";

/** Giá trị ngữ cảnh giao diện: chế độ chọn, có đang tối không, bảng màu hiện hành và hàm đổi giao diện. */
export interface ThemeContextData {
  theme: ThemeType;
  isDark: boolean;
  colors: typeof Colors.light;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

/** Ngữ cảnh chứa trạng thái giao diện, đọc qua `useAppTheme`. */
export const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

/** Cung cấp giao diện sáng/tối; đọc lựa chọn đã lưu và không dựng cây con cho tới khi đọc xong. */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    storage.getItemAsync("THEME_PREFERENCE").then((val) => {
      if (val === "light" || val === "dark") {
        setThemeState(val as ThemeType);
      }
      setMounted(true);
    });
  }, []);

  /** Đổi chế độ giao diện và lưu lựa chọn để lần mở sau dùng lại. */
  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    storage.setItemAsync("THEME_PREFERENCE", newTheme);
  };

  /** Đảo giữa sáng và tối dựa trên giao diện đang hiển thị (kể cả khi đang theo hệ thống). */
  const toggleTheme = () => {
    const currentIsDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
    setTheme(currentIsDark ? "light" : "dark");
  };

  const isDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
  const activeColors = isDark ? Colors.dark : Colors.light;

  if (!mounted) return null; // đợi đọc xong giao diện đã lưu

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: activeColors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
