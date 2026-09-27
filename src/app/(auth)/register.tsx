import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView, ScrollView } from "react-native";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";

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

  const { colors: theme } = useAppTheme();
  const router = useRouter();

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
      // TODO: Call API to register and request OTP
      // Mocking API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep("otp");
      setCooldown(60);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi mã xác minh.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert("Lỗi", "Mã OTP phải gồm 6 chữ số.");
      return;
    }
    setIsLoading(true);
    try {
      // TODO: Call API to verify OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep("done");
    } catch (error) {
      Alert.alert("Lỗi", "Mã OTP không hợp lệ hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      // TODO: Call API to resend OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCooldown(60);
      Alert.alert("Thông báo", "Đã gửi lại mã OTP.");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi lại mã OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Thông báo", "Tính năng đăng nhập Google đang được phát triển.");
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
                {step === "form" ? "Đăng ký tài khoản" : step === "otp" ? "Xác minh email" : "Hoàn tất đăng ký"}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {step === "form" 
                  ? "Tạo tài khoản để bắt đầu đặt vé" 
                  : step === "otp" 
                  ? `Nhập mã 6 số đã gửi tới ${email}` 
                  : "Tài khoản của bạn đã được tạo thành công."}
              </Text>
            </View>

            {step === "done" ? (
              <View style={styles.doneContainer}>
                <Ionicons name="checkmark-circle" size={64} color={theme.primary} />
                <Text style={[styles.doneText, { color: theme.text }]}>
                  Email của bạn đã được xác minh thành công! Bây giờ bạn có thể đăng nhập.
                </Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.primary, width: "100%" }]}
                  onPress={() => router.replace("/(auth)/login")}
                >
                  <Text style={styles.buttonText}>Đăng nhập ngay</Text>
                </TouchableOpacity>
              </View>
            ) : step === "otp" ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Mã OTP 6 số</Text>
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
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Xác minh và tạo tài khoản</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.secondaryButton, { borderColor: theme.border }]} 
                  onPress={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                >
                  <Text style={[styles.secondaryButtonText, { color: cooldown > 0 ? theme.textSecondary : theme.text }]}>
                    {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setStep("form")}>
                  <Text style={[styles.backLinkText, { color: theme.textSecondary }]}>← Thay đổi email đăng ký</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Nhập email của bạn"
                      placeholderTextColor={theme.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Mật khẩu</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputWithEye, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Nhập mật khẩu"
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
                  <Text style={[styles.label, { color: theme.text }]}>Nhập lại mật khẩu</Text>
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
                      placeholder="Nhập lại mật khẩu"
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
                    <Text style={[styles.errorText, { color: theme.danger }]}>Mật khẩu xác nhận chưa khớp.</Text>
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
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, { color: canContinue ? "#fff" : theme.textSecondary }]}>Tiếp tục</Text>}
                </TouchableOpacity>

                <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                  Bằng việc đăng ký, bạn đồng ý với <Text style={{ color: theme.primary, fontWeight: "600" }}>Điều khoản dịch vụ</Text> và <Text style={{ color: theme.primary, fontWeight: "600" }}>Chính sách bảo mật</Text> của chúng tôi.
                </Text>

                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>HOẶC</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={handleGoogleLogin}
                >
                  <Ionicons name="logo-google" size={20} color={theme.text} />
                  <Text style={[styles.googleButtonText, { color: theme.text }]}>Tiếp tục với Google</Text>
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={[styles.footerText, { color: theme.textSecondary }]}>Đã có tài khoản? </Text>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity>
                      <Text style={[styles.loginLink, { color: theme.primary }]}>Đăng nhập ngay</Text>
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
