import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { eventApi } from "@/services/api/eventApi";
import { EventData } from "@/types/event";

export default function EventDashboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { colors } = useAppTheme();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"revenue" | "checkin" | "orders">("revenue");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // orders
  const [orders, setOrders] = useState<any[]>([]);
  const [searchOrder, setSearchOrder] = useState("");
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  
  // checkins
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isCheckinsLoading, setIsCheckinsLoading] = useState(false);
  
  // showtimes
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>("");

  const fetchDashboardData = async (refresh = false) => {
    if (!eventId) return;
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [eventRes, analyticsRes] = await Promise.all([
        eventApi.getEventById(eventId as string),
        eventApi.getEventAnalytics(eventId as string, "30d"),
      ]);
      setEvent(eventRes);
      setAnalytics(analyticsRes);
    } catch (e) {
      console.error("fetchDashboardData error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchCheckins = async () => {
    if (!eventId) return;
    setIsCheckinsLoading(true);
    try {
      const res = await eventApi.getEventCheckins(eventId as string, "");
      setCheckins(res);
    } catch (e) {
      console.error("fetchCheckins error:", e);
    } finally {
      setIsCheckinsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchDashboardData(true);
    if (activeTab === "orders") {
      fetchOrders();
    }
    if (activeTab === "checkin") {
      fetchCheckins();
    }
  }, [eventId, activeTab, searchOrder, selectedShowtimeId]);

  const fetchOrders = async () => {
    if (!eventId) return;
    setIsOrdersLoading(true);
    try {
      const res = await eventApi.getEventBookings(eventId as string, searchOrder, selectedShowtimeId, 0, 100);
      setOrders(res.content || []);
    } catch (e) {
      console.error("fetchOrders error:", e);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [eventId])
  );

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
    if (activeTab === "checkin") {
      fetchCheckins();
    }
  }, [activeTab, searchOrder, selectedShowtimeId]);

  const handleTabChange = (tab: "revenue" | "checkin" | "orders") => {
    setActiveTab(tab);
  };
  
  const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => {
    const size = 64;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <View style={[styles.circularProgressContainer, { width: size, height: size, justifyContent: 'center', alignItems: 'center' }]}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle
            stroke={colors.border}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            stroke={color}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            originX={size / 2}
            originY={size / 2}
            rotation="-90"
          />
        </Svg>
        <Text style={[styles.progressText, { color }]}>{percentage}%</Text>
      </View>
    );
  };

  const renderShowtimeSelector = () => {
    if (!event?.showtimes || event.showtimes.length === 0) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>Suất diễn</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
          <TouchableOpacity
            style={[
              styles.showtimeBtn,
              selectedShowtimeId === "" ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 }
            ]}
            onPress={() => setSelectedShowtimeId("")}
          >
            <Text style={[styles.showtimeText, selectedShowtimeId === "" ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          {event.showtimes.map((st) => (
            <TouchableOpacity
              key={st.id}
              style={[
                styles.showtimeBtn,
                selectedShowtimeId === st.id ? { backgroundColor: colors.primary } : { borderColor: colors.border, borderWidth: 1 }
              ]}
              onPress={() => setSelectedShowtimeId(st.id)}
            >
              <Text style={[styles.showtimeText, selectedShowtimeId === st.id ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
                {st.name || new Date(st.startTime).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRevenue = () => {
    console.log("Analytics Data:", analytics);
    const totalTarget = analytics?.totalRevenueTarget || 0;
    const currentRev = analytics?.currentRevenue || 0;
    let revPercent = totalTarget > 0 ? Number(((currentRev / totalTarget) * 100).toFixed(1)) : (currentRev > 0 ? 100 : 0);
    if (revPercent > 100) revPercent = 100;
    
    const totalTicketsTarget = analytics?.totalTicketsTarget || 0;
    const currentTicketsSold = analytics?.currentTicketsSold || 0;
    let ticketsPercent = totalTicketsTarget > 0 ? Number(((currentTicketsSold / totalTicketsTarget) * 100).toFixed(1)) : (currentTicketsSold > 0 ? 100 : 0);
    if (ticketsPercent > 100) ticketsPercent = 100;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Tổng quan</Text>
        
        {/* Doanh thu */}
        <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 16 }]}>
          <View style={styles.statRow}>
            <View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Doanh thu</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.statValue, { color: colors.text }]}>{currentRev.toLocaleString("vi-VN")}đ</Text>
              </View>
              <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Mục tiêu: {totalTarget.toLocaleString("vi-VN")}đ</Text>
            </View>
            <CircularProgress percentage={revPercent} color="#FFC107" />
          </View>
        </View>

        {/* Số vé bán ra */}
        <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 16 }]}>
          <View style={styles.statRow}>
            <View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Số vé bán ra</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.dot, { backgroundColor: "#34C759" }]} />
                <Text style={[styles.statValue, { color: colors.text }]}>{currentTicketsSold.toLocaleString("vi-VN")} vé</Text>
              </View>
              <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Mục tiêu: {totalTicketsTarget.toLocaleString("vi-VN")} vé</Text>
            </View>
            <CircularProgress percentage={ticketsPercent} color="#34C759" />
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderCheckIn = () => {
    const filteredCheckins = selectedShowtimeId ? checkins.filter(c => c.showtimeId === selectedShowtimeId) : checkins;
    const totalTicketsSold = analytics?.currentTicketsSold || 0;
    const checkedInCount = filteredCheckins.length;
    let checkinPercent = totalTicketsSold > 0 ? Number(((checkedInCount / totalTicketsSold) * 100).toFixed(1)) : 0;
    if (checkinPercent > 100) checkinPercent = 100;

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isCheckinsLoading || isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {renderShowtimeSelector()}
        <View style={styles.filterRow}>
           <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
             <Text style={[styles.filterText, { color: "#fff", fontWeight: '600' }]}>Check-in ({filteredCheckins.length})</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.filterBtn, { borderColor: colors.border, borderWidth: 1 }]}>
             <Text style={[styles.filterText, { color: colors.textSecondary }]}>Redeem (0)</Text>
           </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 16 }]}>
          <View style={styles.statRow}>
            <View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đã check-in</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.statValue, { color: colors.text }]}>{checkedInCount.toLocaleString("vi-VN")} vé</Text>
              </View>
              <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Trên tổng: {totalTicketsSold.toLocaleString("vi-VN")} vé đã bán</Text>
            </View>
            <CircularProgress percentage={checkinPercent} color={colors.primary} />
          </View>
        </View>
        <TouchableOpacity 
          style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, marginTop: 16, alignItems: "center" }}
          onPress={() => router.push({ pathname: `/check-in/${eventId}`, params: { showtimeId: selectedShowtimeId } })}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Quét mã QR Check-in</Text>
        </TouchableOpacity>
        
        <View style={{ marginTop: 24, paddingBottom: 40 }}>
           <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Lịch sử Check-in mới nhất</Text>
           {filteredCheckins.slice(0, 20).map((c, idx) => (
             <View key={idx} style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 8, marginBottom: 8 }}>
               <Text style={{ color: colors.text, fontWeight: '600' }}>Loại vé: {c.ticketTypeName}</Text>
               {c.seatName && <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Ghế: {c.seatName}</Text>}
               <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>{new Date(c.checkedInAt).toLocaleString('vi-VN')}</Text>
             </View>
           ))}
           {filteredCheckins.length === 0 && (
             <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 16 }}>Chưa có lượt check-in nào.</Text>
           )}
        </View>
      </ScrollView>
    );
  };

  const renderOrders = () => (
    <View style={styles.tabContent}>
      {renderShowtimeSelector()}
      
      <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput 
          placeholder="Tìm đơn hàng..." 
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchOrder}
          onChangeText={setSearchOrder}
        />
      </View>

      {isOrdersLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
      ) : orders.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Ionicons name="receipt-outline" size={48} color={colors.border} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Chưa có đơn hàng nào</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.orderCount, { color: colors.text }]}>Có {orders.length} đơn hàng</Text>
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id || item.bookingCode}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.orderCard, { backgroundColor: colors.surface }]}>
                <View style={styles.orderCardHeader}>
                  <Text style={[styles.orderCustomerName, { color: colors.text }]}>{item.customerName || "Khách hàng"}</Text>
                  <Text style={[styles.orderStatus, { color: item.status === "COMPLETED" ? "#34C759" : colors.textSecondary }]}>
                    {item.status}
                  </Text>
                </View>
                <Text style={[styles.orderId, { color: colors.textSecondary }]}>Mã đơn: {item.bookingCode}</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.orderInfoRow}>
                  <View style={styles.orderInfoCol}>
                    <Text style={[styles.orderInfoLabel, { color: colors.textSecondary }]}>Email</Text>
                    <Text style={[styles.orderInfoValue, { color: colors.text }]}>{item.customerEmail}</Text>
                  </View>
                  <View style={styles.orderInfoCol}>
                    <Text style={[styles.orderInfoLabel, { color: colors.textSecondary }]}>Tổng tiền</Text>
                    <Text style={[styles.orderInfoValue, { color: colors.text }]}>{item.totalAmount?.toLocaleString("vi-VN")}đ</Text>
                  </View>
                </View>
              </View>
            )}
          />
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {event?.title || "Quản lý sự kiện"}
          </Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]} numberOfLines={1}>
            {event?.locationName || "Đang tải..."}
          </Text>
        </View>
      </View>

      {/* Tabs Navigation */}
      <View style={[styles.tabNav, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tabNavItem, activeTab === "revenue" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabChange("revenue")}
        >
          <Text style={[styles.tabNavText, activeTab === "revenue" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Doanh thu</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabNavItem, activeTab === "checkin" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabChange("checkin")}
        >
          <Text style={[styles.tabNavText, activeTab === "checkin" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabNavItem, activeTab === "orders" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabChange("orders")}
        >
          <Text style={[styles.tabNavText, activeTab === "orders" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Đơn hàng</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {activeTab === "revenue" && renderRevenue()}
            {activeTab === "checkin" && renderCheckIn()}
            {activeTab === "orders" && renderOrders()}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { marginRight: 16 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  headerDate: { fontSize: 12, marginTop: 2 },
  tabNav: { flexDirection: "row", borderBottomWidth: 1 },
  tabNavItem: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabNavText: { fontSize: 14 },
  contentContainer: { flex: 1 },
  tabContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValueRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statSubValue: { fontSize: 12 },
  circularProgressContainer: { width: 60, height: 60, justifyContent: "center", alignItems: "center" },
  circularProgress: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, justifyContent: "center", alignItems: "center" },
  progressText: { fontSize: 14, fontWeight: "bold" },
  searchBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 13 },
  orderCount: { fontSize: 14, fontWeight: "600", marginBottom: 16 },
  orderCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  orderCustomerName: { fontSize: 15, fontWeight: "600" },
  orderStatus: { fontSize: 12, fontWeight: "bold" },
  orderId: { fontSize: 13, marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  orderInfoRow: { flexDirection: "row" },
  orderInfoCol: { flex: 1 },
  orderInfoLabel: { fontSize: 12, marginBottom: 2 },
  orderInfoValue: { fontSize: 14, fontWeight: "500" },
  showtimeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  showtimeText: { fontSize: 13 },
});
