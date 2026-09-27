import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, SafeAreaView, ActivityIndicator } from "react-native";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const MOCK_EVENTS = [
  {
    id: "1",
    title: "[TP.HCM] Những Thành Phố Mơ Màng Year End 2024",
    image: "https://images.unsplash.com/photo-1540039155732-68473678c48a?w=400&q=80",
  },
  {
    id: "2",
    title: "[Nhà Hát THANH NIÊN] Hài kịch: Lạc lối ở BangKok",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
  },
  {
    id: "3",
    title: "1900 Future Hits #61: Quang Hùng MasterD | Thursday 21.11.2024",
    image: "https://images.unsplash.com/photo-1470229722913-7c090be5c5a5?w=400&q=80",
  },
];

export default function OrganizerCenterScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState(false);

  const handleFilter = (newFilter: "upcoming" | "past") => {
    setFilter(newFilter);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const renderEvent = ({ item }: { item: typeof MOCK_EVENTS[0] }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardContent}>
        <Image source={{ uri: item.image }} style={styles.eventImage} />
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={3}>
          {item.title}
        </Text>
      </View>
      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.actionButton, { borderColor: colors.border, borderRightWidth: 1 }]}
          onPress={() => router.push(`/events/${item.id}`)}
        >
          <Ionicons name="stats-chart-outline" size={18} color={colors.textSecondary} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Quản lý</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/check-in/${item.id}`)}
        >
          <Ionicons name="scan-outline" size={18} color={"#fff"} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: "#fff", fontWeight: "600" }]}>Quét vé</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
                {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
                        <View style={[styles.logoIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="ticket" size={18} color="#fff" style={{ transform: [{ rotate: '-12deg' }] }} />
            </View>
            <Text style={[styles.logoText, { color: colors.primary }]}>HaloTicket</Text>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>Organizer Center</Text>
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

        {/* Filters */}
        <View style={styles.filterRow}>
          <View style={[styles.searchIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.text} />
          </View>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === "upcoming" ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => handleFilter("upcoming")}
          >
            <Text style={[styles.filterText, filter === "upcoming" ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
              Sắp tới
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === "past" ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => handleFilter("past")}
          >
            <Text style={[styles.filterText, filter === "past" ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
              Đã qua
            </Text>
          </TouchableOpacity>
        </View>

        {/* Event List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={MOCK_EVENTS}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
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
  listContent: {
    paddingBottom: 20,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  eventImage: {
    width: 100,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontSize: 14,
  },
});





