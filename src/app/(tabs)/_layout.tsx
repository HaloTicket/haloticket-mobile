import { Tabs } from "expo-router";
import { useAppTheme } from "@/theme";

export default function StaffTabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Quét Mã", tabBarLabel: "Quét Mã" }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: "Ca Trực", tabBarLabel: "Ca Trực" }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "Lịch Sử", tabBarLabel: "Lịch Sử" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Nhân Viên", tabBarLabel: "Nhân Viên" }}
      />
    </Tabs>
  );
}
