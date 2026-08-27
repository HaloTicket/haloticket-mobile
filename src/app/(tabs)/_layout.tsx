import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Khám phá", tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="tickets"
        options={{ title: "Vé của tôi", tabBarLabel: "Tickets" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Cá nhân", tabBarLabel: "Profile" }}
      />
    </Tabs>
  );
}
