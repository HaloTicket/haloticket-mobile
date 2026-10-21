import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "@/theme";

const AUTH_BG_LIGHT = require("../../../assets/auth-bg-light.png");
const AUTH_BG_DARK = require("../../../assets/auth-bg-dark.jpg");

interface ScreenBackgroundProps {
  children: React.ReactNode;
}

/** Nền sáng/tối dùng chung cho các màn hình ứng dụng. */
export function ScreenBackground({ children }: ScreenBackgroundProps) {
  const { isDark } = useAppTheme();

  return (
    <ImageBackground
      source={isDark ? AUTH_BG_DARK : AUTH_BG_LIGHT}
      style={[styles.background, { backgroundColor: isDark ? "#050D2E" : "#EEF4FC" }]}
      resizeMode="cover"
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
