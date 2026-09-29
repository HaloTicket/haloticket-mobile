import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView } from "react-native";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { authApi, AuthChallengeResponse, createIdempotencyKey, getAuthErrorMessage, secondsUntil } from "@/services/auth/authApi";
import { useModal } from "@/hooks/useModal";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { CONFIG } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

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

  const { colors: theme } = useAppTheme();
  const router = useRouter();
  const { showAlert } = useModal();
  const { setAuthenticatedToken } = useAuth();
  const { t } = useTranslation();

  const discovery = AuthSession.useAutoDiscovery(`${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.KEYCLOAK_REALM}`);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "haloticket" });

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
          setAuthenticatedToken(tokenResult.accessToken);
        }
      }).catch((error) => {
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

  const canContinue = email.trim() !== "" && password !== "" && confirmPassword !== "" && password === confirmPassword;

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
      showAlert("Lỗi", key);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      showAlert("Lỗi", "Mã OTP phải gồm 6 chữ số.");
      return;
    }
    if (!challenge || secondsUntil(challenge.expiresAt) === 0) {
      showAlert("Lỗi", "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
      return;
    }

    setIsLoading(true);
    try {
      await authApi.registerVerify(challenge.challengeId, email.trim(), password, otp);
      setStep("done");
    } catch (error) {
      const { key } = getAuthErrorMessage(error, "Mã OTP không hợp lệ hoặc đã hết hạn.");
      showAlert("Lỗi", key);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challenge || cooldown > 0) return;
    setIsLoading(true);
    try {
      const result = await authApi.registerResend(challenge.challengeId);
      setChallenge(result);
      setCooldown(secondsUntil(result.resendAvailableAt));
      showAlert("Thông báo", "Đã gửi lại mã OTP.");
    } catch (error) {
      const { key } = getAuthErrorMessage(error, "Không thể gửi lại mã OTP.");
      showAlert("Lỗi", key);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!request) {
      showAlert("Lỗi", "Đang kết nối tới máy chủ xác thực, vui lòng thử lại sau giây lát.");
      return;
    }
    promptAsync();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.authPanel}>
            
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>
                {step === "form" ? t("auth.register_title") : step === "otp" ? t("auth.register_otp_title") : t("auth.register_done_title")}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {step === "form" 
                  ? t("auth.register_welcome") 
                  : step === "otp" 
                  ? `${t("auth.register_otp_welcome")}${email}` 
                  : t("auth.register_done_welcome")}
              </Text>
            </View>

            {step === "done" ? (
              <View style={styles.doneContainer}>
                <Ionicons name="checkmark-circle" size={64} color={theme.primary} />
                <Text style={[styles.doneText, { color: theme.text }]}>
                  {t("auth.done_success")}
                </Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.primary, width: "100%" }]}
                  onPress={() => router.replace("/(auth)/login")}
                >
                  <Text style={styles.buttonText}>{t("auth.login_now")}</Text>
                </TouchableOpacity>
              </View>
            ) : step === "otp" ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>{t("auth.otp_label")}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, textAlign: "center", fontSize: 20, letterSpacing: 8, paddingLeft: 16 }]}
                    placeholder="000000"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.primary }]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("auth.verify_btn")}</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.secondaryButton, { borderColor: theme.border }]} 
                  onPress={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                >
                  <Text style={[styles.secondaryButtonText, { color: cooldown > 0 ? theme.textSecondary : theme.text }]}>
                    {cooldown > 0 ? `${t("auth.resend_wait")}${cooldown}s` : t("auth.resend_btn")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setStep("form")}>
                  <Text style={[styles.backLinkText, { color: theme.textSecondary }]}>{t("auth.back_email")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>{t("auth.email")}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder={t("auth.email_placeholder")}
                      placeholderTextColor={theme.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>{t("auth.password")}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputWithEye, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder={t("auth.password_placeholder")}
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>{t("auth.reenter_password")}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[
                        styles.input, 
                        styles.inputWithEye, 
                        { backgroundColor: theme.background, color: theme.text },
                        confirmPassword && password !== confirmPassword 
                          ? { borderColor: theme.danger } 
                          : { borderColor: theme.border }
                      ]}
                      placeholder={t("auth.reenter_password")}
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword && password !== confirmPassword ? (
                    <Text style={[styles.errorText, { color: theme.danger }]}>{t("auth.password_mismatch")}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[
                    styles.button, 
                    { backgroundColor: canContinue ? theme.primary : theme.border }
                  ]}
                  onPress={handleRequestOtp}
                  disabled={!canContinue || isLoading}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, { color: canContinue ? "#fff" : theme.textSecondary }]}>{t("auth.continue")}</Text>}
                </TouchableOpacity>

                <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                  {t("auth.agree_terms")}<Text style={{ color: theme.primary, fontWeight: "600" }}>{t("auth.terms")}</Text>{t("auth.and")}<Text style={{ color: theme.primary, fontWeight: "600" }}>{t("auth.privacy")}</Text>{t("auth.of_us")}
                </Text>

                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>{t("auth.or")}</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={handleGoogleLogin}
                >
                  <Ionicons name="logo-google" size={20} color={theme.text} />
                  <Text style={[styles.googleButtonText, { color: theme.text }]}>{t("auth.continue_with_google")}</Text>
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={[styles.footerText, { color: theme.textSecondary }]}>{t("auth.has_account")}</Text>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity>
                      <Text style={[styles.loginLink, { color: theme.primary }]}>{t("auth.login_now")}</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 16 },
  authPanel: {
    padding: 24,
  },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  form: { width: "100%" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputWrapper: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 14, zIndex: 1 },
  eyeIcon: { position: "absolute", right: 14, zIndex: 1, padding: 4 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingLeft: 42, paddingRight: 16, fontSize: 15 },
  inputWithEye: { paddingRight: 42 },
  errorText: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  button: {
    height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  secondaryButton: {
    height: 50, borderWidth: 1, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 12,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
  backLink: { alignItems: "center", marginTop: 20 },
  backLinkText: { fontSize: 14, fontWeight: "500" },
  termsText: { fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 12, fontWeight: "600" },
  googleButton: { flexDirection: "row", height: 50, borderWidth: 1, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  googleButtonText: { fontSize: 15, fontWeight: "700", marginLeft: 10 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: "700" },
  doneContainer: { alignItems: "center", paddingVertical: 24 },
  doneText: { fontSize: 15, textAlign: "center", marginVertical: 20, lineHeight: 22 },
});
