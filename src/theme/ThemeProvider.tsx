import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "./colors";
import { storage } from "@/utils/storage";

export type ThemeType = "light" | "dark" | "system";

export interface ThemeContextData {
  theme: ThemeType;
  isDark: boolean;
  colors: typeof Colors.light;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

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

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    storage.setItemAsync("THEME_PREFERENCE", newTheme);
  };

  const toggleTheme = () => {
    const currentIsDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
    setTheme(currentIsDark ? "light" : "dark");
  };

  const isDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
  const activeColors = isDark ? Colors.dark : Colors.light;

  if (!mounted) return null; // Wait for theme load

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: activeColors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
