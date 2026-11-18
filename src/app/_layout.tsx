import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { View, ActivityIndicator, LogBox } from "react-native";
import { useAppTheme, ThemeProvider } from "@/theme";
import { ModalProvider } from "@/hooks/useModal";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";

import "@/locales/i18n"; // khởi tạo i18n

LogBox.ignoreAllLogs(); // ẩn mọi cảnh báo và lỗi khỏi lớp phủ trên màn hình

/**
 * Điều hướng theo trạng thái đăng nhập: chưa đăng nhập thì chuyển về trang đăng nhập,
 * đã đăng nhập mà đang ở nhóm xác thực thì chuyển sang tab chính. Hiện vòng tải khi còn khôi phục phiên.
 */
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useAppTheme();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // chuyển về trang đăng nhập.
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // chuyển sang trang tab chính.
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

/** Gốc ứng dụng: nạp phông biểu tượng rồi bọc theme, hộp thoại và xác thực quanh {@code RootLayoutNav}. */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <ModalProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </AuthProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}
