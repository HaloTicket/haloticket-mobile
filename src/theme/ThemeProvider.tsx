import React, { createContext, useState, useEffect } from "react";
import { Appearance, ColorSchemeName, useColorScheme } from "react-native";
import { Colors } from "./colors";

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

/**
 * Cung cấp giao diện sáng/tối: mặc định luôn theo chế độ sáng/tối của thiết bị ngay từ khung hình Splash đầu tiên,
 * tự động đồng bộ khi người dùng đổi giao diện trên thiết bị, đồng thời vẫn cho phép đảo nhanh trong phiên.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const hookScheme = useColorScheme();
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(
    () => hookScheme ?? Appearance.getColorScheme() ?? "light"
  );
  const [theme, setThemeState] = useState<ThemeType>("system");

  useEffect(() => {
    if (hookScheme) {
      setSystemScheme(hookScheme);
    }
  }, [hookScheme]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? "light");
      // Tự động quay về đồng bộ theo thiết bị khi người dùng đổi Light/Dark ở cấp hệ điều hành
      setThemeState("system");
    });
    return () => subscription.remove();
  }, []);

  /** Đổi chế độ giao diện cho phiên hiện tại. */
  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  /** Đảo giữa sáng và tối dựa trên giao diện đang hiển thị (kể cả khi đang theo hệ thống). */
  const toggleTheme = () => {
    const currentIsDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
    setTheme(currentIsDark ? "light" : "dark");
  };

  const isDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
  const activeColors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: activeColors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
