import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme";

export function OrganizerHeader() {
  const { colors, isDark, toggleTheme } = useAppTheme();

  return (
    <View style={styles.header}>
      <View style={[styles.headerLeft, { flex: 1 }]}>
        <View style={[styles.logoIconContainer, { backgroundColor: colors.primary }]}>
          <Ionicons name="ticket" size={18} color="#fff" style={{ transform: [{ rotate: '-12deg' }] }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.logoText, { color: colors.primary }]} numberOfLines={1}>HaloTicket</Text>
          <Text style={[styles.headerTitle, { color: colors.textSecondary, fontSize: 13, fontWeight: "500", marginTop: -2 }]} numberOfLines={1}>Organizer Center</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerActionBtn}>
          <Ionicons name="language-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerActionBtn} onPress={toggleTheme}>
          <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
  },
  logoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
