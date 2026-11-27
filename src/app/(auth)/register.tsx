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
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { AuthTopBar } from "@/components/layout/AuthTopBar";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { PasswordRequirementsCard } from "@/components/auth/PasswordRequirementsCard";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import {
  authApi,
  AuthChallengeResponse,
  createIdempotencyKey,
  getAuthErrorMessage,
  secondsUntil,
} from "@/services/auth/authApi";
import { useModal } from "@/hooks/useModal";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { CONFIG } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { isPasswordValid } from "@/utils/passwordRules";
import { useResponsive } from "@/hooks/useResponsive";

WebBrowser.maybeCompleteAuthSession();

const HALO_LOGO_LIGHT = require("../../../assets/haloticket-logo.png");
const HALO_LOGO_DARK = require("../../../assets/haloticket-logo-dark.png");

/**
 * Màn hình đăng ký theo 3 bước: nhập email và mật khẩu, xác minh OTP 6 chữ số gửi qua email, rồi hoàn tất.
 * Giao diện sáng/tối đồng bộ với màn hình đăng nhập; cũng hỗ trợ đăng ký/đăng nhập bằng Google qua Keycloak.
 */
export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [cooldown, setCooldown] = useState(0);
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);

  const { colors: theme, isDark } = useAppTheme();
  const router = useRouter();
  const { showAlert } = useModal();
  const { setAuthenticatedToken } = useAuth();
  const { t } = useTranslation();
  const { authMaxWidth, horizontalPadding, isCompact, isLandscape } = useResponsive();
  const logoWidth = isCompact || isLandscape ? 140 : 176;
  const logoHeight = Math.round(logoWidth * 0.625);

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
  const darkLogoOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(darkLogoOpacity, {
      toValue: isDark ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    }).start();
  }, [darkLogoOpacity, isDark]);

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
          setAuthenticatedToken(tokenResult.accessToken, tokenResult.refreshToken, true);
        }
      }).catch(() => {
        isExchanging.current = false;
        showAlert(t("auth.error_title"), t("auth.error_google"));
      });
    } else if (response?.type === "error") {
      showAlert(t("auth.error_title"), t("auth.auth_error"));
    }
  }, [response]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const passwordValid = isPasswordValid(password);

  const canContinue =
    email.trim() !== "" &&
    passwordValid &&
    confirmPassword !== "" &&
    password === confirmPassword;

  /** Gửi yêu cầu đăng ký (kèm khóa idempotency) để nhận mã OTP, chuyển sang bước OTP và đặt thời gian chờ gửi lại. */
  const handleRequestOtp = async () => {
    if (!canContinue) return;
    setIsLoading(true);
    try {
      const idempotencyKey = createIdempotencyKey("register-start");
      const result = await authApi.registerStart(email.trim(), password, idempotencyKey);
      setChallenge(result);
      setStep("otp");
      setCooldown(secondsUntil(result.resendAvailableAt));
    } catch (error) {
      const { key } = getAuthErrorMessage(error, "Không thể gửi mã xác minh.");
      showAlert(t("auth.error_title"), key);
    } finally {
      setIsLoading(false);
    }
  };

  /** Kiểm tra OTP đủ 6 số và chưa hết hạn, rồi xác minh với máy chủ; thành công thì sang bước hoàn tất. */
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      showAlert(t("auth.error_title"), "Mã OTP phải gồm 6 chữ số.");
      return;
    }
    if (!challenge || secondsUntil(challenge.expiresAt) === 0) {
      showAlert(t("auth.error_title"), "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.registerVerify(challenge.challengeId, email.trim(), password, otp);
      setStep("done");
    } catch (error) {
      const { key } = getAuthErrorMessage(error, "Mã OTP không hợp lệ hoặc đã hết hạn.");
      showAlert(t("auth.error_title"), key);
    } finally {
      setIsLoading(false);
    }
  };

  /** Yêu cầu gửi lại OTP cho thử thách hiện tại; bỏ qua khi chưa có thử thách hoặc còn đang chờ cooldown. */
  const handleResendOtp = async () => {
    if (!challenge || cooldown > 0) return;
    setIsLoading(true);
    try {
      const result = await authApi.registerResend(challenge.challengeId);
      setChallenge(result);
      setCooldown(secondsUntil(result.resendAvailableAt));
      showAlert(t("auth.notice_title"), "Đã gửi lại mã OTP.");
    } catch (error) {
      const { key } = getAuthErrorMessage(error, "Không thể gửi lại mã OTP.");
      showAlert(t("auth.error_title"), key);
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
      disabledBg: "rgba(30, 51, 92, 0.75)",
      disabledText: theme.textSecondary,
      dividerLine: "rgba(148, 163, 184, 0.28)",
      dividerText: theme.textSecondary,
      googleBg: "rgba(12, 24, 56, 0.84)",
      googleBorder: "rgba(96, 165, 250, 0.32)",
      googleText: theme.text,
      footerText: theme.textSecondary,
      danger: theme.danger,
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
      disabledBg: "#CBD5E1",
      disabledText: "#64748B",
      dividerLine: "#DCE4F0",
      dividerText: "#64748B",
      googleBg: "#FFFFFF",
      googleBorder: "#CBD5E1",
      googleText: "#0F172A",
      footerText: "#64748B",
      danger: theme.danger,
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
                paddingHorizontal: horizontalPadding,
                paddingBottom: isLandscape ? 28 : 48,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.authPanel, { maxWidth: authMaxWidth }]}>
              <FadeSlideIn distance={14} duration={280}>
                <View style={[styles.header, isLandscape && { marginBottom: 14 }]}>
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
                      { color: ui.title, fontSize: isCompact ? 24 : 28 },
                    ]}
                  >
                    {step === "form"
                      ? t("auth.register_title")
                      : step === "otp"
                        ? t("auth.register_otp_title")
                        : t("auth.register_done_title")}
                  </Text>
                  <Text style={[styles.subtitle, { color: ui.subtitle }]}>
                    {step === "form"
                      ? t("auth.register_welcome")
                      : step === "otp"
                        ? `${t("auth.register_otp_welcome")}${email}`
                        : t("auth.register_done_welcome")}
                  </Text>
                </View>
              </FadeSlideIn>

              <FadeSlideIn delay={70} distance={16} duration={300}>
                {step === "done" ? (
                  <View style={styles.doneContainer}>
                    <Ionicons name="checkmark-circle" size={64} color={ui.primary} />
                    <Text style={[styles.doneText, { color: ui.title }]}>
                      {t("auth.done_success")}
                    </Text>
                    <AnimatedPressable
                      style={{ width: "100%" }}
                      scaleTo={0.97}
                      contentStyle={[styles.button, { backgroundColor: ui.primary }]}
                      onPress={() => router.replace("/(auth)/login")}
                    >
                      <Text style={styles.buttonText}>{t("auth.login_now")}</Text>
                    </AnimatedPressable>
                  </View>
                ) : step === "otp" ? (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: ui.label }]}>{t("auth.otp_label")}</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: ui.inputBg,
                            borderColor: ui.inputBorder,
                            color: ui.inputText,
                            textAlign: "center",
                            fontSize: 22,
                            fontWeight: "700",
                            letterSpacing: 8,
                            paddingLeft: 16,
                          },
                        ]}
                        placeholder="000000"
                        placeholderTextColor={ui.placeholder}
                        keyboardType="numeric"
                        maxLength={6}
                        value={otp}
                        onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ""))}
                      />
                    </View>

                    <AnimatedPressable
                      scaleTo={0.97}
                      contentStyle={[
                        styles.button,
                        { backgroundColor: otp.length === 6 ? ui.primary : ui.disabledBg },
                      ]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            { color: otp.length === 6 ? "#FFFFFF" : ui.disabledText },
                          ]}
                        >
                          {t("auth.verify_btn")}
                        </Text>
                      )}
                    </AnimatedPressable>

                    <AnimatedPressable
                      scaleTo={0.97}
                      contentStyle={[
                        styles.secondaryButton,
                        { backgroundColor: ui.googleBg, borderColor: ui.googleBorder },
                      ]}
                      onPress={handleResendOtp}
                      disabled={cooldown > 0 || isLoading}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: cooldown > 0 ? ui.subtitle : ui.title },
                        ]}
                      >
                        {cooldown > 0 ? `${t("auth.resend_wait")}${cooldown}s` : t("auth.resend_btn")}
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable scaleTo={0.96} contentStyle={styles.backLink} onPress={() => setStep("form")}>
                      <Text style={[styles.backLinkText, { color: ui.primary }]}>{t("auth.back_email")}</Text>
                    </AnimatedPressable>
                  </View>
                ) : (
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

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: ui.label }]}>{t("auth.password")}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={ui.icon} style={styles.inputIcon} />
                        <TextInput
                          style={[
                            styles.input,
                            styles.inputWithEye,
                            {
                              backgroundColor: ui.inputBg,
                              borderColor:
                                password.length > 0
                                  ? passwordValid
                                    ? "#22C55E"
                                    : ui.danger
                                  : ui.inputBorder,
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

                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: ui.label }]}>{t("auth.reenter_password")}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={ui.icon} style={styles.inputIcon} />
                        <TextInput
                          style={[
                            styles.input,
                            styles.inputWithEye,
                            { backgroundColor: ui.inputBg, color: ui.inputText },
                            confirmPassword.length > 0
                              ? password === confirmPassword
                                ? { borderColor: "#22C55E" }
                                : { borderColor: ui.danger }
                              : { borderColor: ui.inputBorder },
                          ]}
                          placeholder={t("auth.reenter_password")}
                          placeholderTextColor={ui.placeholder}
                          secureTextEntry={!showConfirmPassword}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                        />
                        <AnimatedPressable
                          style={styles.eyeIcon}
                          scaleTo={0.85}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <Ionicons
                            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color={ui.icon}
                          />
                        </AnimatedPressable>
                      </View>
                      {confirmPassword && password !== confirmPassword ? (
                        <Text style={[styles.errorText, { color: ui.danger }]}>{t("auth.password_mismatch")}</Text>
                      ) : null}
                    </View>

                    <PasswordRequirementsCard
                      password={password}
                      confirmPassword={confirmPassword}
                    />

                    <AnimatedPressable
                      scaleTo={0.97}
                      contentStyle={[
                        styles.button,
                        { backgroundColor: canContinue ? ui.primary : ui.disabledBg },
                      ]}
                      onPress={handleRequestOtp}
                      disabled={!canContinue || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            { color: canContinue ? "#FFFFFF" : ui.disabledText },
                          ]}
                        >
                          {t("auth.continue")}
                        </Text>
                      )}
                    </AnimatedPressable>

                    <Text style={[styles.termsText, { color: ui.subtitle }]}>
                      {t("auth.agree_terms")}
                      <Text style={{ color: ui.primary, fontWeight: "600" }}>{t("auth.terms")}</Text>
                      {t("auth.and")}
                      <Text style={{ color: ui.primary, fontWeight: "600" }}>{t("auth.privacy")}</Text>
                      {t("auth.of_us")}
                    </Text>

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
                      <Text style={[styles.footerText, { color: ui.footerText }]}>{t("auth.has_account")}</Text>
                      <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                          <Text style={[styles.loginLink, { color: ui.primary }]}>{t("auth.login_now")}</Text>
                        </TouchableOpacity>
                      </Link>
                    </View>
                  </View>
                )}
              </FadeSlideIn>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
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
  header: { alignItems: "center", marginBottom: 22 },
  logoWrapper: {
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 176,
    height: 110,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { fontSize: 14.5, textAlign: "center", lineHeight: 21 },
  form: { width: "100%" },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 7 },
  inputWrapper: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 14, zIndex: 1 },
  eyeIcon: { position: "absolute", right: 14, zIndex: 1, padding: 4 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 15,
  },
  inputWithEye: { paddingRight: 44 },
  rulesBox: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  rulesHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ruleItemText: {
    fontSize: 12.5,
    flex: 1,
  },
  errorText: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  button: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#0D63F3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  secondaryButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
  backLink: { alignItems: "center", marginTop: 20 },
  backLinkText: { fontSize: 14, fontWeight: "600" },
  termsText: { fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 18 },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 14, fontSize: 13.5, fontWeight: "500" },
  googleButton: {
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  googleButtonText: { fontSize: 15, fontWeight: "700", marginLeft: 10 },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  footerText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: "700" },
  doneContainer: { alignItems: "center", paddingVertical: 24 },
  doneText: { fontSize: 15, textAlign: "center", marginVertical: 20, lineHeight: 22 },
});
