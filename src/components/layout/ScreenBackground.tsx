import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "@/theme";

const AUTH_BG_LIGHT = require("../../../assets/auth-bg-light.png");
const AUTH_BG_DARK = require("../../../assets/auth-bg-dark.jpg");

interface ScreenBackgroundProps {
  children: React.ReactNode;
}

/**
 * Nền dùng chung cho các màn hình ứng dụng: gắn sẵn cả hai lớp nền sáng và tối
 * rồi cross-fade mượt bằng native driver khi đổi giao diện, tránh khựng do giải mã ảnh lại.
 */
export function ScreenBackground({ children }: ScreenBackgroundProps) {
  const { isDark } = useAppTheme();
  const darkOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(darkOpacity, {
      toValue: isDark ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [darkOpacity, isDark]);

  return (
    <View style={[styles.background, { backgroundColor: isDark ? "#050D2E" : "#EEF4FC" }]}>
      <Image
        source={AUTH_BG_LIGHT}
        style={styles.bgLayer}
        resizeMode="cover"
        fadeDuration={0}
      />
      <Animated.Image
        source={AUTH_BG_DARK}
        style={[styles.bgLayer, { opacity: darkOpacity }]}
        resizeMode="cover"
        fadeDuration={0}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  bgLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
});
