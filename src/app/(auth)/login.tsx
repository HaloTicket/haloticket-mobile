import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useState, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/theme";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { AuthTopBar } from "@/components/layout/AuthTopBar";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useModal } from "@/hooks/useModal";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { CONFIG } from "@/constants/config";
import { storage } from "@/utils/storage";

WebBrowser.maybeCompleteAuthSession();

const HALO_LOGO_LIGHT = require("../../../assets/haloticket-logo.png");
const HALO_LOGO_DARK = require("../../../assets/haloticket-logo-dark.png");

/**
 * Màn hình đăng nhập: email và mật khẩu qua `useAuth().login` (có tùy chọn ghi nhớ đăng nhập),
 * hoặc Google qua Keycloak (PKCE).
 */
export default function LoginScreen() {
  const { login, setAuthenticatedToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { colors: theme, isDark } = useAppTheme();
  const { showAlert } = useModal();
  const { t } = useTranslation();
  const router = useRouter();
  const logoWidth = 192;
  const logoHeight = 120;

  const discovery = AuthSession.useAutoDiscovery(`${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.KEYCLOAK_REALM}`);
  const redirectUri = AuthSession.makeRedirectUri({ path: "login" });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.KEYCLOAK_CLIENT_ID,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      extraParams: {
        kc_idp_hint: "google",
      },
    },
    discovery
  );

  const isExchanging = useRef(false);
  const rememberMeRef = useRef(rememberMe);
  rememberMeRef.current = rememberMe;

  const darkLogoOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const checkPop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(darkLogoOpacity, {
      toValue: isDark ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    }).start();
  }, [darkLogoOpacity, isDark]);

  // Nạp lại tùy chọn ghi nhớ đăng nhập & email đã lưu (nếu có)
  useEffect(() => {
    let active = true;
    const loadRemembered = async () => {
      try {
        const [savedPref, savedEmail] = await Promise.all([
          storage.getItemAsync(CONFIG.STORAGE_KEYS.REMEMBER_ME),
          storage.getItemAsync(CONFIG.STORAGE_KEYS.REMEMBERED_EMAIL),
        ]);
        if (!active) return;
        const shouldRemember = savedPref !== "false";
        setRememberMe(shouldRemember);
        if (shouldRemember && savedEmail) {
          setEmail(savedEmail);
        }
      } catch {}
    };
    loadRemembered();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (response?.type === "success" && !isExchanging.current) {
      isExchanging.current = true;
      const { code } = response.params;

      AuthSession.exchangeCodeAsync(
        {
          clientId: CONFIG.KEYCLOAK_CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request?.codeVerifier || "",
          },
        },
        discovery!
      ).then((tokenResult) => {
        if (tokenResult.accessToken) {
          setAuthenticatedToken(tokenResult.accessToken, tokenResult.refreshToken, rememberMeRef.current);
        }
      }).catch(() => {
        isExchanging.current = false;
        showAlert(t("auth.error_title"), t("auth.error_google"));
      });
    } else if (response?.type === "error") {
      showAlert(t("auth.error_title"), t("auth.auth_error"));
    }
  }, [response]);

  /** Bật/tắt ghi nhớ đăng nhập kèm hiệu ứng nảy nhẹ. */
  const handleToggleRememberMe = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setRememberMe((prev) => !prev);
    Animated.sequence([
      Animated.timing(checkPop, { toValue: 0.82, duration: 75, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }),
      Animated.spring(checkPop, { toValue: 1, speed: 30, bounciness: 12, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }),
    ]).start();
  };

  /** Kiểm tra email và mật khẩu không rỗng rồi đăng nhập; lỗi được báo bằng hộp thoại. */
  const handleLogin = async () => {
    if (!email || !password) {
      showAlert(t("auth.error_title"), t("auth.error_empty"));
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (error) {
      showAlert(t("auth.login_error"), t("auth.error_login"));
    } finally {
      setIsLoading(false);
    }
  };

  /** Mở luồng đăng nhập Google; nếu yêu cầu xác thực chưa sẵn sàng thì báo người dùng thử lại. */
  const handleGoogleLogin = () => {
    if (!request) {
      showAlert(t("auth.error_title"), "Đang kết nối tới máy chủ xác thực, vui lòng thử lại sau giây lát.");
      return;
    }
    promptAsync();
  };

  const ui = isDark
    ? {
      title: theme.text,
      subtitle: theme.textSecondary,
      label: theme.text,
      inputBg: "rgba(12, 24, 56, 0.78)",
      inputBorder: "rgba(96, 165, 250, 0.28)",
      inputText: theme.text,
      placeholder: theme.textSecondary,
      icon: theme.textSecondary,
      primary: theme.primary,
      dividerLine: "rgba(148, 163, 184, 0.28)",
      dividerText: theme.textSecondary,
      googleBg: "rgba(12, 24, 56, 0.84)",
      googleBorder: "rgba(96, 165, 250, 0.32)",
      googleText: theme.text,
      footerText: theme.textSecondary,
      checkboxBorder: "rgba(148, 163, 184, 0.55)",
      checkboxUncheckedBg: "rgba(12, 24, 56, 0.65)",
    }
    : {
      title: "#091E42",
      subtitle: "#64748B",
      label: "#0F172A",
      inputBg: "#EEF3FA",
      inputBorder: "#D6E0EE",
      inputText: "#0F172A",
      placeholder: "#8A98AD",
      icon: "#64748B",
      primary: "#0D63F3",
      dividerLine: "#DCE4F0",
      dividerText: "#64748B",
      googleBg: "#FFFFFF",
      googleBorder: "#CBD5E1",
      googleText: "#0F172A",
      footerText: "#64748B",
      checkboxBorder: "#94A3B8",
      checkboxUncheckedBg: "#FFFFFF",
    };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <AuthTopBar showBack />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: 20,
                paddingBottom: 60,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.authPanel}>
              <FadeSlideIn distance={14} duration={280}>
                <View style={styles.header}>
                  <View style={[styles.logoWrapper, { width: logoWidth, height: logoHeight }]}>
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
                        { opacity: darkLogoOpacity },
                      ]}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                  </View>
                  <Text
                    style={[
                      styles.title,
                      { color: ui.title, fontSize: 30 },
                    ]}
                  >
                    {t("auth.login_title")}
                  </Text>
                  <Text style={[styles.subtitle, { color: ui.subtitle }]}>{t("auth.welcome")}</Text>
                </View>
              </FadeSlideIn>

              <FadeSlideIn delay={70} distance={16} duration={300}>
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: ui.label }]}>{t("auth.email")}</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={20} color={ui.icon} style={styles.inputIcon} />
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: ui.inputBg,
                            borderColor: ui.inputBorder,
                            color: ui.inputText,
                          },
                        ]}
                        placeholder={t("auth.email_placeholder")}
                        placeholderTextColor={ui.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.passwordGroup}>
                    <Text style={[styles.label, { color: ui.label }]}>{t("auth.password")}</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color={ui.icon} style={styles.inputIcon} />
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputWithEye,
                          {
                            backgroundColor: ui.inputBg,
                            borderColor: ui.inputBorder,
                            color: ui.inputText,
                          },
                        ]}
                        placeholder={t("auth.password_placeholder")}
                        placeholderTextColor={ui.placeholder}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <AnimatedPressable
                        style={styles.eyeIcon}
                        scaleTo={0.85}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color={ui.icon}
                        />
                      </AnimatedPressable>
                    </View>
                  </View>

                  <View style={styles.optionsRow}>
                    <AnimatedPressable
                      scaleTo={0.95}
                      contentStyle={styles.rememberRow}
                      onPress={handleToggleRememberMe}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: rememberMe }}
                    >
                      <Animated.View
                        style={[
                          styles.checkbox,
                          {
                            transform: [{ scale: checkPop }],
                            backgroundColor: rememberMe ? ui.primary : ui.checkboxUncheckedBg,
                            borderColor: rememberMe ? ui.primary : ui.checkboxBorder,
                          },
                        ]}
                      >
                        {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </Animated.View>
                      <Text style={[styles.rememberText, { color: ui.subtitle }]}>
                        {t("auth.remember_me")}
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable scaleTo={0.95} onPress={() => router.push("/(auth)/forgot-password")}>
                      <Text style={[styles.forgotPasswordText, { color: ui.primary }]}>{t("auth.forgot_password")}</Text>
                    </AnimatedPressable>
                  </View>

                  <AnimatedPressable
                    scaleTo={0.97}
                    contentStyle={[styles.button, { backgroundColor: ui.primary }]}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>{t("auth.login_btn")}</Text>
                    )}
                  </AnimatedPressable>

                  <View style={styles.dividerContainer}>
                    <View style={[styles.dividerLine, { backgroundColor: ui.dividerLine }]} />
                    <Text style={[styles.dividerText, { color: ui.dividerText }]}>{t("auth.or")}</Text>
                    <View style={[styles.dividerLine, { backgroundColor: ui.dividerLine }]} />
                  </View>

                  <AnimatedPressable
                    scaleTo={0.97}
                    contentStyle={[
                      styles.googleButton,
                      { backgroundColor: ui.googleBg, borderColor: ui.googleBorder },
                    ]}
                    onPress={handleGoogleLogin}
                  >
                    <GoogleIcon size={20} />
                    <Text style={[styles.googleButtonText, { color: ui.googleText }]}>
                      {t("auth.continue_with_google")}
                    </Text>
                  </AnimatedPressable>

                  <View style={styles.footerRow}>
                    <Text style={[styles.footerText, { color: ui.footerText }]}>{t("auth.no_account")}</Text>
                    <Link href="/(auth)/register" asChild>
                      <TouchableOpacity>
                        <Text style={[styles.registerLink, { color: ui.primary }]}>{t("auth.register_now")}</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>
              </FadeSlideIn>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 60,
  },
  authPanel: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoWrapper: {
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 192,
    height: 120,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 16,
  },
  passwordGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 15,
  },
  inputWithEye: {
    paddingRight: 44,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 18,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  forgotPasswordText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  button: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D63F3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13.5,
    fontWeight: "500",
  },
  googleButton: {
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
