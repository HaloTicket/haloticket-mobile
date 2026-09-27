import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useModal } from "@/hooks/useModal";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { CONFIG } from "@/constants/config";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, setAuthenticatedToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { colors: theme } = useAppTheme();
  const { showAlert } = useModal();

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
        showAlert("Lỗi", "Đăng nhập Google thất bại.");
      });
    } else if (response?.type === "error") {
      showAlert("Lỗi", "Đã có lỗi xảy ra khi xác thực.");
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      showAlert("Đăng nhập thất bại", "Tài khoản hoặc mật khẩu không chính xác.");
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
              <Text style={[styles.title, { color: theme.text }]}>Đăng nhập</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Chào mừng bạn quay trở lại!</Text>
            </View>

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
                    placeholder="Nhập mật khẩu của bạn"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>

              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity onPress={() => showAlert("Thông báo", "Quên mật khẩu")}>
                  <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>

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
                <Text style={[styles.footerText, { color: theme.textSecondary }]}>Chưa có tài khoản? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={[styles.registerLink, { color: theme.primary }]}>Đăng ký ngay</Text>
                  </TouchableOpacity>
                </Link>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    padding: 16,
  },
  authPanel: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
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
    paddingLeft: 42,
    paddingRight: 16,
    fontSize: 15,
  },
  inputWithEye: {
    paddingRight: 42,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  forgotPasswordRow: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
