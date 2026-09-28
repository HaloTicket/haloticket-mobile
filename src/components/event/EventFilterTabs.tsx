import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme";

interface EventFilterTabsProps {
  filter: "upcoming" | "past";
  onFilterChange: (filter: "upcoming" | "past") => void;
  isSearchVisible: boolean;
  onToggleSearch: () => void;
}

export function EventFilterTabs({ filter, onFilterChange, isSearchVisible, onToggleSearch }: EventFilterTabsProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.filterRow}>
      <TouchableOpacity 
        style={[styles.searchIcon, { backgroundColor: colors.surface }]}
        onPress={onToggleSearch}
      >
        <Ionicons name="search" size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterBtn, filter === "upcoming" ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 }]}
        onPress={() => onFilterChange("upcoming")}
      >
        <Text style={[styles.filterText, filter === "upcoming" ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
          Sắp tới
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterBtn, filter === "past" ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 }]}
        onPress={() => onFilterChange("past")}
      >
        <Text style={[styles.filterText, filter === "past" ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
          Đã qua
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  searchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
  },
});
