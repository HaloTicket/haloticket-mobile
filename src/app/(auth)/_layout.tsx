import { Stack } from "expo-router";

/** Bố cục Stack cho nhóm màn hình xác thực (bắt đầu, đăng nhập, đăng ký), ẩn header mặc định. */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="welcome" options={{ title: "Chào mừng" }} />
      <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
      <Stack.Screen name="register" options={{ title: "Đăng ký" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Quên mật khẩu" }} />
    </Stack>
  );
}
