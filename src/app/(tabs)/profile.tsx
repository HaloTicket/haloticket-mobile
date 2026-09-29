import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from "react-native";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/hooks/useModal";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/locales/i18n";

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { logout, user } = useAuth();
  const { showConfirm } = useModal();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t, i18n } = useTranslation();

  const handleToggleLanguage = async () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    await changeLanguage(newLang);
  };

  const handleLogout = () => {
    showConfirm(
      t("common.logout"),
      t("common.logout_confirm", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?"),
      async () => {
        setIsLoggingOut(true);
        try {
          await logout();
        } finally {
          setIsLoggingOut(false);
        }
      }
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("common.profile")}</Text>
        </View>

        <View style={styles.profileSection}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={[styles.avatar, { backgroundColor: colors.surface }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>
              {user?.name || user?.preferred_username || t("common.admin")}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {user?.email || "admin@haloticket.com"}
            </Text>
          </View>
        </View>

        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="settings-outline" size={24} color={colors.text} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t("common.settings")}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={toggleTheme}>
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.text} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t("common.theme")}: {isDark ? t("common.dark") : t("common.light")}</Text>
            <Ionicons name="sync-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleToggleLanguage}>
            <Ionicons name="language-outline" size={24} color={colors.text} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t("common.language")}: {i18n.language === "vi" ? t("common.vietnamese") : t("common.english")}</Text>
            <Ionicons name="sync-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={24} color={colors.text} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t("common.help")}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#FF3B30" style={styles.menuIcon} />
            ) : (
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" style={styles.menuIcon} />
            )}
            <Text style={[styles.menuText, { color: "#FF3B30" }]}>
              {isLoggingOut ? "..." : t("common.logout")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  menuSection: {
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
  },
});
