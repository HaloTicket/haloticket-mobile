import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, Text, StyleSheet, Image, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/hooks/useModal";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/locales/i18n";

/** Màn hình hồ sơ: thông tin tài khoản, đổi giao diện sáng/tối, đổi ngôn ngữ Việt/Anh và đăng xuất. */
export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { logout, user } = useAuth();
  const { showConfirm } = useModal();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t, i18n } = useTranslation();

  const themeSpin = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const langSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(themeSpin, {
      toValue: isDark ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    }).start();
  }, [isDark, themeSpin]);

  const themeRotate = themeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const langRotate = langSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const triggerSelectionHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  /** Đổi giao diện sáng/tối kèm rung nhẹ. */
  const handleToggleTheme = () => {
    triggerSelectionHaptic();
    toggleTheme();
  };

  /** Chuyển ngôn ngữ giữa tiếng Việt và tiếng Anh kèm hiệu ứng xoay biểu tượng. */
  const handleToggleLanguage = async () => {
    triggerSelectionHaptic();
    langSpin.setValue(0);
    Animated.timing(langSpin, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    }).start();
    const newLang = i18n.language === "vi" ? "en" : "vi";
    await changeLanguage(newLang);
  };

  /** Hỏi xác nhận rồi đăng xuất, hiển thị trạng thái đang đăng xuất trong lúc chờ. */
  const handleLogout = () => {
    showConfirm(
      t("common.logout"),
      t("common.logout_confirm", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?"),
      async () => {
        setIsLoggingOut(true);
        try {
          await logout();
        } finally {
          setIsLoggingOut(false);
        }
      }
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
            <FadeSlideIn distance={10} duration={240}>
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {t("common.profile")}
                </Text>
              </View>

              <View style={styles.profileSection}>
                {user?.picture ? (
                  <Image
                    source={{ uri: user.picture }}
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.surface },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons name="person" size={40} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {user?.name || user?.preferred_username || t("common.admin")}
                  </Text>
                  <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
                    {user?.email || "admin@haloticket.com"}
                  </Text>
                </View>
              </View>
            </FadeSlideIn>

          <FadeSlideIn delay={60} distance={14} duration={260}>
            <View style={[styles.menuSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AnimatedPressable scaleTo={0.985} contentStyle={[styles.menuItem, { borderBottomColor: colors.border }]}>
                <Ionicons name="settings-outline" size={24} color={colors.text} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t("common.settings")}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.985}
                contentStyle={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={handleToggleTheme}
              >
                <Animated.View style={[styles.menuIcon, { transform: [{ rotate: themeRotate }] }]}>
                  <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.text} />
                </Animated.View>
                <Text style={[styles.menuText, { color: colors.text }]}>{t("common.theme")}: {isDark ? t("common.dark") : t("common.light")}</Text>
                <Animated.View style={{ transform: [{ rotate: themeRotate }] }}>
                  <Ionicons name="sync-outline" size={20} color={colors.textSecondary} />
                </Animated.View>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.985}
                contentStyle={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={handleToggleLanguage}
              >
                <Ionicons name="language-outline" size={24} color={colors.text} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t("common.language")}: {i18n.language === "vi" ? t("common.vietnamese") : t("common.english")}</Text>
                <Animated.View style={{ transform: [{ rotate: langRotate }] }}>
                  <Ionicons name="sync-outline" size={20} color={colors.textSecondary} />
                </Animated.View>
              </AnimatedPressable>
              <AnimatedPressable scaleTo={0.985} contentStyle={[styles.menuItem, { borderBottomColor: colors.border }]}>
                <Ionicons name="help-circle-outline" size={24} color={colors.text} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t("common.help")}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.985}
                contentStyle={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FF3B30" style={styles.menuIcon} />
                ) : (
                  <Ionicons name="log-out-outline" size={24} color="#FF3B30" style={styles.menuIcon} />
                )}
                <Text style={[styles.menuText, { color: "#FF3B30" }]}>
                  {isLoggingOut ? "..." : t("common.logout")}
                </Text>
              </AnimatedPressable>
            </View>
          </FadeSlideIn>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 28,
  },
  container: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  menuSection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
  },
});
