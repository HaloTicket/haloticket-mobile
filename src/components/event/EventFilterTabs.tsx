import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useEffect, useRef } from "react";
import { Animated, Easing, View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";

/** Props của thanh lọc: tab đang chọn, hàm đổi tab và trạng thái ô tìm kiếm. */
interface EventFilterTabsProps {
  filter: "upcoming" | "past";
  onFilterChange: (filter: "upcoming" | "past") => void;
  isSearchVisible: boolean;
  onToggleSearch: () => void;
}

/** Thanh chọn tab sự kiện sắp diễn ra hoặc đã qua, kèm nút bật tắt ô tìm kiếm. */
export function EventFilterTabs({ filter, onFilterChange, isSearchVisible, onToggleSearch }: EventFilterTabsProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const inactiveChipBg = isDark ? "rgba(12, 24, 56, 0.72)" : "rgba(255, 255, 255, 0.78)";
  const searchRotate = useRef(new Animated.Value(isSearchVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(searchRotate, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    }).start();
  }, [isSearchVisible, searchRotate]);

  const iconSpin = searchRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const handleSelectFilter = (next: "upcoming" | "past") => {
    if (next !== filter && Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    onFilterChange(next);
  };

  return (
    <View style={styles.filterRow}>
      <AnimatedPressable
        scaleTo={0.88}
        contentStyle={[
          styles.searchIcon,
          { backgroundColor: isSearchVisible ? colors.primary : colors.surface },
        ]}
        onPress={onToggleSearch}
      >
        <Animated.View style={{ transform: [{ rotate: iconSpin }] }}>
          <Ionicons
            name={isSearchVisible ? "close" : "search"}
            size={20}
            color={isSearchVisible ? "#fff" : colors.text}
          />
        </Animated.View>
      </AnimatedPressable>
      <AnimatedPressable
        scaleTo={0.94}
        contentStyle={[
          styles.filterBtn,
          filter === "upcoming"
            ? { backgroundColor: colors.primary }
            : { backgroundColor: inactiveChipBg, borderColor: colors.border, borderWidth: 1 },
        ]}
        onPress={() => handleSelectFilter("upcoming")}
      >
        <Text
          style={[
            styles.filterText,
            filter === "upcoming"
              ? { color: "#fff", fontWeight: "600" }
              : { color: colors.textSecondary },
          ]}
        >
          {t("dashboard.upcoming")}
        </Text>
      </AnimatedPressable>
      <AnimatedPressable
        scaleTo={0.94}
        contentStyle={[
          styles.filterBtn,
          filter === "past"
            ? { backgroundColor: colors.primary }
            : { backgroundColor: inactiveChipBg, borderColor: colors.border, borderWidth: 1 },
        ]}
        onPress={() => handleSelectFilter("past")}
      >
        <Text
          style={[
            styles.filterText,
            filter === "past"
              ? { color: "#fff", fontWeight: "600" }
              : { color: colors.textSecondary },
          ]}
        >
          {t("dashboard.past")}
        </Text>
      </AnimatedPressable>
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
