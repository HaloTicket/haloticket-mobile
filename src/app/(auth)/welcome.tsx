import { useEffect, useRef } from "react";
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/theme";
import { useResponsive } from "@/hooks/useResponsive";
import { AuthTopBar } from "@/components/layout/AuthTopBar";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";

const HALO_LOGO_LIGHT = require("../../../assets/haloticket-logo.png");
const HALO_LOGO_DARK = require("../../../assets/haloticket-logo-dark.png");
const WELCOME_BG_LIGHT = require("../../../assets/welcome-bg-light.jpg");
const WELCOME_BG_DARK = require("../../../assets/welcome-bg-dark.jpg");

/**
 * Màn hình bắt đầu (Welcome Screen): giới thiệu HaloTicket Event Management
 * cùng hai nút điều hướng tới Đăng nhập và Đăng ký, tự co giãn theo kích thước & hướng xoay màn hình.
 */
export default function WelcomeScreen() {
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { height, isCompact, isLandscape, authMaxWidth } = useResponsive();

  const darkOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(darkOpacity, {
      toValue: isDark ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [darkOpacity, isDark]);

  const logoWidth = isLandscape ? 154 : isCompact ? 166 : 196;
  const logoHeight = Math.round(logoWidth * (122 / 196));
  const bottomReserve = isLandscape ? 28 : Math.round(Math.min(Math.max(height * 0.19, 96), 185));

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#050D2E" : "#F5F8FF" }]}>
      <Image
        source={WELCOME_BG_LIGHT}
        style={styles.bgLayer}
        resizeMode="cover"
        fadeDuration={0}
      />
      <Animated.Image
        source={WELCOME_BG_DARK}
        style={[styles.bgLayer, { opacity: darkOpacity }]}
        resizeMode="cover"
        fadeDuration={0}
      />
      <StatusBar style={isDark ? "light" : "dark"} />

      <SafeAreaView style={styles.safeArea}>
        <AuthTopBar />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: isCompact ? 20 : 28,
              paddingTop: isLandscape ? 8 : 20,
              paddingBottom: bottomReserve,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { maxWidth: authMaxWidth }]}>
            <FadeSlideIn distance={14} duration={280}>
              <View style={[styles.brandBlock, { marginBottom: isLandscape ? 14 : 24 }]}>
                <View style={[styles.logoBox, { width: logoWidth, height: logoHeight }]}>
                  <Image
                    source={HALO_LOGO_LIGHT}
                    style={[{ width: logoWidth, height: logoHeight }, StyleSheet.absoluteFill]}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                  <Animated.Image
                    source={HALO_LOGO_DARK}
                    style={[
                      { width: logoWidth, height: logoHeight },
                      StyleSheet.absoluteFill,
                      { opacity: darkOpacity },
                    ]}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                </View>

                <View style={[styles.badge, isDark ? styles.badgeDark : styles.badgeLight]}>
                  <Text style={[styles.badgeText, { color: isDark ? "#F8FAFC" : "#1B3B7B" }]}>
                    Event Management
                  </Text>
                </View>
              </View>
            </FadeSlideIn>

            <FadeSlideIn delay={70} distance={14} duration={280}>
              <View style={[styles.copyBlock, { marginBottom: isLandscape ? 18 : 28 }]}>
                <Text
                  style={[
                    styles.headline,
                    {
                      color: isDark ? "#F8FAFC" : "#091E42",
                      fontSize: isCompact ? 19 : 22,
                    },
                  ]}
                >
                  {t("auth.welcome_headline")}
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? "#CBD5E1" : "#64748B" }]}>
                  {t("auth.welcome_subtitle")}
                </Text>
              </View>
            </FadeSlideIn>

            <FadeSlideIn delay={130} distance={16} duration={300}>
              <View style={styles.actionsBlock}>
                <AnimatedPressable
                  scaleTo={0.97}
                  contentStyle={[
                    styles.primaryBtn,
                    { backgroundColor: isDark ? "#1D6CF2" : "#0D63F3" },
                  ]}
                  onPress={() => router.push("/(auth)/login")}
                >
                  <Ionicons name="person-outline" size={19} color="#FFFFFF" style={styles.btnIcon} />
                  <Text style={styles.primaryBtnText}>{t("auth.login_btn")}</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  scaleTo={0.97}
                  contentStyle={[
                    styles.secondaryBtn,
                    isDark ? styles.secondaryBtnDark : styles.secondaryBtnLight,
                  ]}
                  onPress={() => router.push("/(auth)/register")}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={19}
                    color={isDark ? "#F8FAFC" : "#0D63F3"}
                    style={styles.btnIcon}
                  />
                  <Text
                    style={[
                      styles.secondaryBtnText,
                      { color: isDark ? "#F8FAFC" : "#0D63F3" },
                    ]}
                  >
                    {t("auth.register_btn")}
                  </Text>
                </AnimatedPressable>
              </View>
            </FadeSlideIn>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    alignSelf: "center",
  },
  brandBlock: {
    alignItems: "center",
  },
  logoBox: {
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeLight: {
    backgroundColor: "#E4EEFE",
  },
  badgeDark: {
    backgroundColor: "rgba(37, 99, 235, 0.36)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.42)",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  copyBlock: {
    alignItems: "center",
  },
  headline: {
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  actionsBlock: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D63F3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnLight: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "#3B82F6",
  },
  secondaryBtnDark: {
    backgroundColor: "rgba(7, 19, 52, 0.78)",
    borderColor: "rgba(148, 163, 184, 0.45)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  btnIcon: {
    marginRight: 8,
  },
});
