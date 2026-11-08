import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/locales/i18n";
import { useAppTheme } from "@/theme";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";

interface AuthTopBarProps {
  /** Hiện nút quay lại (dùng cho màn Đăng nhập / Đăng ký để về màn Welcome). */
  showBack?: boolean;
}

/**
 * Thanh trên cùng cho luồng Welcome → Đăng nhập → Đăng ký:
 * nút quay lại (tùy chọn) và nút chuyển ngôn ngữ VI / EN xuyên suốt luồng xác thực.
 */
export function AuthTopBar({ showBack = false }: AuthTopBarProps) {
  const { isDark } = useAppTheme();
  const { i18n } = useTranslation();
  const router = useRouter();
  const langPop = useRef(new Animated.Value(1)).current;

  const isVi = i18n.language?.startsWith("vi");

  const handleToggleLanguage = async () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    Animated.sequence([
      Animated.timing(langPop, { toValue: 0.86, duration: 85, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }),
      Animated.spring(langPop, { toValue: 1, speed: 26, bounciness: 10, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }),
    ]).start();
    await changeLanguage(isVi ? "en" : "vi");
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/welcome");
    }
  };

  const pillBg = isDark ? "rgba(12, 24, 56, 0.78)" : "rgba(255, 255, 255, 0.86)";
  const pillBorder = isDark ? "rgba(96, 165, 250, 0.34)" : "#D6E0EE";
  const textColor = isDark ? "#F8FAFC" : "#091E42";
  const accentColor = isDark ? "#60A5FA" : "#0D63F3";

  return (
    <View style={styles.bar}>
      {showBack ? (
        <AnimatedPressable
          scaleTo={0.88}
          contentStyle={[styles.backBtn, { backgroundColor: pillBg, borderColor: pillBorder }]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </AnimatedPressable>
      ) : (
        <View style={styles.placeholder} />
      )}

      <AnimatedPressable
        scaleTo={0.92}
        contentStyle={[styles.langPill, { backgroundColor: pillBg, borderColor: pillBorder }]}
        onPress={handleToggleLanguage}
        accessibilityRole="button"
        accessibilityLabel="Switch language"
      >
        <Animated.View style={[styles.langInner, { transform: [{ scale: langPop }] }]}>
          <Ionicons name="language-outline" size={16} color={accentColor} />
          <Text style={[styles.langText, { color: textColor }]}>{isVi ? "VI" : "EN"}</Text>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  placeholder: {
    width: 38,
    height: 38,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

