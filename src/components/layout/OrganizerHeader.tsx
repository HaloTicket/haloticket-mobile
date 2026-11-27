import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useEffect, useRef } from "react";
import { Animated, Easing, View, Text, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/locales/i18n";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { useResponsive } from "@/hooks/useResponsive";

const HALO_MARK = require("../../../assets/haloticket-mark.png");

interface OrganizerHeaderProps {
  unreadCount?: number;
}

/** Thanh đầu trang của khu vực tổ chức, có nút hộp thư thông báo, đổi giao diện sáng/tối và đổi ngôn ngữ. */
export function OrganizerHeader({ unreadCount = 0 }: OrganizerHeaderProps) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const { isCompact } = useResponsive();

  const themeSpin = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const themePop = useRef(new Animated.Value(1)).current;
  const langPop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(themeSpin, {
        toValue: isDark ? 1 : 0,
        duration: 320,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(themePop, {
          toValue: 0.78,
          duration: 100,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.spring(themePop, {
          toValue: 1,
          speed: 24,
          bounciness: 10,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
    ]).start();
  }, [isDark, themePop, themeSpin]);

  const themeRotate = themeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const triggerSelectionHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  /** Chuyển giao diện sáng/tối kèm phản hồi rung nhẹ. */
  const handleToggleTheme = () => {
    triggerSelectionHaptic();
    toggleTheme();
  };

  /** Chuyển ngôn ngữ giữa tiếng Việt và tiếng Anh kèm hiệu ứng nảy nhẹ. */
  const handleToggleLanguage = async () => {
    triggerSelectionHaptic();
    Animated.sequence([
      Animated.timing(langPop, { toValue: 0.8, duration: 90, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }),
      Animated.spring(langPop, { toValue: 1, speed: 24, bounciness: 10, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }),
    ]).start();
    const newLang = i18n.language === "vi" ? "en" : "vi";
    await changeLanguage(newLang);
  };

  const haloColor = isDark ? colors.text : "#091E42";
  const ticketColor = isDark ? colors.primary : "#0D63F3";

  return (
    <View style={[styles.header, isCompact && { marginBottom: 14 }]}>
      <View style={[styles.headerLeft, { flex: 1 }]}>
        <Image
          source={HALO_MARK}
          style={[styles.logoMark, isCompact && { width: 40, height: 28, marginRight: 6 }]}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.logoText, isCompact && { fontSize: 19, marginRight: 6 }]} numberOfLines={1}>
            <Text style={{ color: haloColor }}>Halo</Text>
            <Text style={{ color: ticketColor }}>Ticket</Text>
          </Text>
          <Text style={[styles.headerTitle, { color: colors.textSecondary, fontSize: isCompact ? 12 : 13, fontWeight: "500", marginTop: -2 }]} numberOfLines={1}>Organizer Center</Text>
        </View>
      </View>
      <View style={[styles.headerActions, isCompact && { gap: 6 }]}>
        <AnimatedPressable
          contentStyle={styles.headerActionBtn}
          scaleTo={0.86}
          onPress={() => router.push("/notifications")}
          accessibilityRole="button"
          accessibilityLabel={t("notifications.title")}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          contentStyle={styles.headerActionBtn}
          scaleTo={0.86}
          onPress={handleToggleLanguage}
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ scale: langPop }] }}>
            <Ionicons name="language-outline" size={22} color={colors.text} />
          </Animated.View>
        </AnimatedPressable>
        <AnimatedPressable
          contentStyle={styles.headerActionBtn}
          scaleTo={0.86}
          onPress={handleToggleTheme}
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ rotate: themeRotate }, { scale: themePop }] }}>
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
          </Animated.View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: 0,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  logoMark: {
    width: 48,
    height: 34,
    marginRight: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
