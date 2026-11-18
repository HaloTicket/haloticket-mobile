import { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { eventApi } from "@/services/api/eventApi";
import { EventData } from "@/types/event";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { OrganizerHeader } from "@/components/layout/OrganizerHeader";
import { EventFilterTabs } from "@/components/event/EventFilterTabs";
import { EventCard } from "@/components/event/EventCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { logError } from "@/utils/log";

/**
 * Màn hình trung tâm tổ chức: liệt kê sự kiện được phân công cho người dùng, lọc theo tab
 * sắp diễn ra hoặc đã qua và theo từ khóa tìm kiếm theo tiêu đề. Tải lại mỗi khi màn hình được focus.
 */
export default function OrganizerCenterScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /** Tải danh sách sự kiện của tôi từ API; lỗi chỉ được ghi log, danh sách giữ nguyên. */
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await eventApi.getMyEvents();
      setEvents(data);
    } catch (error) {
      logError("Fetch events error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [user])
  );

  /** Phân sự kiện vào tab `past` nếu đã quá giờ kết thúc hoặc trạng thái là kết thúc, ngược lại là `upcoming`. */
  const getEventTabStatus = (ev: EventData): string => {
    if (ev.endTime && new Date(ev.endTime) < new Date()) {
      return "past";
    }
    const status = (ev.eventApprovalStatus || ev.eventStatus || "").toUpperCase();
    if (status === "ENDED" || status === "PASSED" || status === "COMPLETED") return "past";
    return "upcoming";
  };

  const filteredEvents = events.filter((ev) => {
    const matchesFilter = getEventTabStatus(ev) === filter;
    const matchesSearch = ev.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  /** Bật hoặc tắt ô tìm kiếm; khi đóng thì xóa từ khóa đang nhập. */
  const handleToggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery("");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <OrganizerHeader />

        <EventFilterTabs 
          filter={filter} 
          onFilterChange={setFilter} 
          isSearchVisible={isSearchVisible}
          onToggleSearch={handleToggleSearch}
        />

        {isSearchVisible && (
          <SearchBar 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            placeholder={t("dashboard.search_event")} 
          />
        )}

        {/* Event List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="calendar-clear-outline" size={64} color={colors.border} />
            <Text style={{ marginTop: 16, fontSize: 16, color: colors.textSecondary }}>{t("dashboard.no_events")}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  listContent: {
    paddingBottom: 24,
  },
});
