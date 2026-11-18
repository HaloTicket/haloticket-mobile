import { Stack } from "expo-router";

/** Bố cục Stack cho nhóm màn hình xác thực (đăng nhập, đăng ký), ẩn header mặc định. */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
      <Stack.Screen name="register" options={{ title: "Đăng ký" }} />
    </Stack>
  );
}
