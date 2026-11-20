import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/theme";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { AuthTopBar } from "@/components/layout/AuthTopBar";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";
import { PasswordRequirementsCard } from "@/components/auth/PasswordRequirementsCard";
import {
  authApi,
  AuthChallengeResponse,
  createIdempotencyKey,
  getAuthErrorMessage,
  PasswordResetVerificationResponse,
  secondsUntil,
} from "@/services/auth/authApi";
import { isPasswordValid } from "@/utils/passwordRules";

const HALO_LOGO_LIGHT = require("../../../assets/haloticket-logo.png");
const HALO_LOGO_DARK = require("../../../assets/haloticket-logo-dark.png");

type ForgotStep = "form" | "otp" | "reset" | "done";

/**
 * Luồng quên mật khẩu tương tự haloticket-web:
 * 1) Nhập email / SĐT để nhận OTP → 2) Xác minh OTP 6 số → 3) Đặt mật khẩu mới (kiểm tra đủ 4 quy tắc + khớp) → 4) Hoàn tất.
 */
export default function ForgotPasswordScreen() {
  const { colors: theme, isDark } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const logoWidth = 176;
  const logoHeight = 110;

  const [step, setStep] = useState<ForgotStep>("form");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);
  const [recovery, setRecovery] = useState<PasswordResetVerificationResponse | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage(t("auth.forgot_empty_identifier"));
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const idempotencyKey = createIdempotencyKey("forgot-start");
      const res = await authApi.forgotStart(trimmed, idempotencyKey);
      setChallenge(res);
      setCooldown(secondsUntil(res.resendAvailableAt));
      setOtp("");
      setStep("otp");
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, t("auth.forgot_send_error")).key);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage(t("auth.otp_invalid_length"));
      return;
    }
    if (!challenge || secondsUntil(challenge.expiresAt) === 0) {
      setErrorMessage(t("auth.otp_expired"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.forgotVerify(challenge.challengeId, otp);
      setRecovery(res);
      setStep("reset");
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, t("auth.otp_invalid")).key);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challenge || cooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await authApi.forgotResend(challenge.challengeId);
      setChallenge(res);
      setCooldown(secondsUntil(res.resendAvailableAt));
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, t("auth.otp_resend_error")).key);
    } finally {
      setIsLoading(false);
    }
  };

  const canReset =
    Boolean(recovery?.resetToken) &&
    secondsUntil(recovery?.expiresAt) > 0 &&
    isPasswordValid(password) &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (!recovery?.resetToken || secondsUntil(recovery.expiresAt) === 0) {
      setErrorMessage(t("auth.reset_session_expired"));
      return;
    }
    if (!canReset) return;
    setIsLoading(true);
    try {
      await authApi.resetPassword(recovery.resetToken, password);
      setStep("done");
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, t("auth.reset_error")).key);
    } finally {
      setIsLoading(false);
    }
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
        secondaryBg: "rgba(12, 24, 56, 0.84)",
        secondaryBorder: "rgba(96, 165, 250, 0.32)",
        danger: theme.danger,
        errorBg: "rgba(225, 29, 72, 0.16)",
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
        secondaryBg: "#FFFFFF",
        secondaryBorder: "#CBD5E1",
        danger: theme.danger,
        errorBg: "rgba(225, 29, 72, 0.08)",
      };

  const headerTitle =
    step === "form"
      ? t("auth.forgot_title")
      : step === "otp"
        ? t("auth.forgot_otp_title")
        : step === "reset"
          ? t("auth.reset_title")
          : t("auth.reset_done_title");

  const headerSubtitle =
    step === "form"
      ? t("auth.forgot_subtitle")
      : step === "otp"
        ? t("auth.forgot_otp_subtitle")
        : step === "reset"
          ? `${t("auth.reset_subtitle_prefix")}${identifier.trim()}`
          : t("auth.reset_done_subtitle");

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
                      { color: ui.title, fontSize: 28 },
                    ]}
                  >
                    {headerTitle}
                  </Text>
                  <Text style={[styles.subtitle, { color: ui.subtitle }]}>{headerSubtitle}</Text>
                </View>
              </FadeSlideIn>

              <FadeSlideIn delay={60} distance={14} duration={280}>
                {errorMessage && step !== "done" && (
                  <View
                    style={[
                      styles.errorBanner,
                      { backgroundColor: ui.errorBg, borderColor: ui.danger },
                    ]}
                  >
                    <Ionicons name="alert-circle-outline" size={18} color={ui.danger} />
                    <Text style={[styles.errorBannerText, { color: ui.danger }]}>
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {step === "done" ? (
                  <View style={styles.doneContainer}>
                    <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                    <Text style={[styles.doneText, { color: ui.title }]}>
                      {t("auth.reset_done_message")}
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
                ) : step === "reset" ? (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: ui.label }]}>{t("auth.new_password")}</Text>
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
                                  ? isPasswordValid(password)
                                    ? "#22C55E"
                                    : ui.danger
                                  : ui.inputBorder,
                              color: ui.inputText,
                            },
                          ]}
                          placeholder={t("auth.new_password_placeholder")}
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
                      <Text style={[styles.label, { color: ui.label }]}>{t("auth.confirm_new_password")}</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={ui.icon} style={styles.inputIcon} />
                        <TextInput
                          style={[
                            styles.input,
                            styles.inputWithEye,
                            {
                              backgroundColor: ui.inputBg,
                              color: ui.inputText,
                              borderColor:
                                confirmPassword.length > 0
                                  ? password === confirmPassword
                                    ? "#22C55E"
                                    : ui.danger
                                  : ui.inputBorder,
                            },
                          ]}
                          placeholder={t("auth.confirm_new_password_placeholder")}
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
                      {confirmPassword.length > 0 && password !== confirmPassword ? (
                        <Text style={[styles.errorText, { color: ui.danger }]}>
                          {t("auth.password_mismatch")}
                        </Text>
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
                        { backgroundColor: canReset ? ui.primary : ui.disabledBg },
                      ]}
                      onPress={handleResetPassword}
                      disabled={!canReset || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            { color: canReset ? "#FFFFFF" : ui.disabledText },
                          ]}
                        >
                          {t("auth.reset_btn")}
                        </Text>
                      )}
                    </AnimatedPressable>

                    <View style={styles.footerRow}>
                      <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                          <Text style={[styles.backLoginLink, { color: ui.primary }]}>
                            {t("auth.back_to_login")}
                          </Text>
                        </TouchableOpacity>
                      </Link>
                    </View>
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
                          {t("auth.forgot_verify_btn")}
                        </Text>
                      )}
                    </AnimatedPressable>

                    <AnimatedPressable
                      scaleTo={0.97}
                      contentStyle={[
                        styles.secondaryButton,
                        { backgroundColor: ui.secondaryBg, borderColor: ui.secondaryBorder },
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

                    <AnimatedPressable
                      scaleTo={0.96}
                      contentStyle={styles.backLink}
                      onPress={() => {
                        setErrorMessage(null);
                        setStep("form");
                      }}
                    >
                      <Text style={[styles.backLinkText, { color: ui.primary }]}>
                        {t("auth.forgot_change_identifier")}
                      </Text>
                    </AnimatedPressable>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: ui.label }]}>
                        {t("auth.forgot_identifier_label")}
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={20} color={ui.icon} style={styles.inputIcon} />
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: ui.inputBg,
                              borderColor: ui.inputBorder,
                              color: ui.inputText,
                            },
                          ]}
                          placeholder={t("auth.forgot_identifier_placeholder")}
                          placeholderTextColor={ui.placeholder}
                          value={identifier}
                          onChangeText={setIdentifier}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                      </View>
                    </View>

                    <AnimatedPressable
                      scaleTo={0.97}
                      contentStyle={[
                        styles.button,
                        { backgroundColor: identifier.trim() ? ui.primary : ui.disabledBg },
                      ]}
                      onPress={handleRequestOtp}
                      disabled={!identifier.trim() || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            { color: identifier.trim() ? "#FFFFFF" : ui.disabledText },
                          ]}
                        >
                          {t("auth.forgot_send_btn")}
                        </Text>
                      )}
                    </AnimatedPressable>

                    <View style={styles.footerRow}>
                      <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                          <Text style={[styles.backLoginLink, { color: ui.primary }]}>
                            {t("auth.back_to_login")}
                          </Text>
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
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
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  backLoginLink: { fontSize: 14, fontWeight: "700" },
  doneContainer: { alignItems: "center", paddingVertical: 20 },
  doneText: { fontSize: 15, textAlign: "center", marginVertical: 20, lineHeight: 22 },
});

