import { Tabs } from "expo-router";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

/** Thanh tab dưới cùng của nhân viên: tab sự kiện (trang chủ) và tab hồ sơ cá nhân. */
export default function StaffTabLayout() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("common.home"),
          tabBarLabel: t("common.home"),
          /** Biểu tượng lịch của tab sự kiện. */
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("common.profile"),
          tabBarLabel: t("common.profile"),
          /** Biểu tượng người dùng của tab hồ sơ. */
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
