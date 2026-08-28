import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="check-in/[ticketCode]/index"
          options={{ headerShown: true, title: "Kết Quả Soát Vé" }}
        />
        <Stack.Screen
          name="events/select-gate"
          options={{ headerShown: true, title: "Chọn Cổng Soát Vé" }}
        />
      </Stack>
    </>
  );
}
