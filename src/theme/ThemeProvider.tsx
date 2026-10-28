import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, ThemeColors } from "./colors";

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: "light" | "dark" | "system") => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);
const THEME_STORAGE_KEY = "haloticket_theme_preference";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme() ?? Appearance.getColorScheme() ?? "light";
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeMode(saved);
      }
    });
  }, []);

  const isDark = themeMode === "system" ? systemColorScheme === "dark" : themeMode === "dark";
  const colors = isDark ? darkColors : lightColors;

  const setTheme = async (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
