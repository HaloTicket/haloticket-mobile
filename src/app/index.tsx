import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { View } from "react-native";

/** Trang gốc `/`: tùy trạng thái đăng nhập mà chuyển tới tab chính hoặc màn hình bắt đầu. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
