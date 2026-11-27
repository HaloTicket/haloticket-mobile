import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Animated, Easing, Platform, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppTheme } from "@/theme";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { CheckinAssistantContext } from "@/components/event/CheckinAssistantContext";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { eventApi } from "@/services/api/eventApi";
import { EventData } from "@/types/event";
import { useTranslation } from "react-i18next";
import { logError } from "@/utils/log";
import { orderStatusInfo } from "@/utils/orderStatus";

/**
 * Bảng điều khiển của một sự kiện với 3 tab: doanh thu, check-in và đơn hàng.
 * Có chọn suất diễn, kéo để làm mới và lối vào màn hình quét QR. Tab nào người dùng không đủ quyền xem
 * thì hiện thông báo thay vì dữ liệu.
 */
export default function EventDashboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { colors, isDark } = useAppTheme();
  const inactiveChipBg = isDark ? "transparent" : "rgba(255, 255, 255, 0.78)";
  const router = useRouter();
  const { t } = useTranslation();
  const isCompact = false;
  const isTablet = false;
  const horizontalPadding = 16;
  const maxContainerWidth = 9999;
  
  const [activeTab, setActiveTab] = useState<"revenue" | "checkin" | "orders">("revenue");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  // người dùng không có quyền xem thống kê (chỉ được quét vé)
  const [analyticsDenied, setAnalyticsDenied] = useState(false);
  const [ordersDenied, setOrdersDenied] = useState(false);
  
  // đơn hàng
  const [orders, setOrders] = useState<any[]>([]);
  const [searchOrder, setSearchOrder] = useState("");
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  
  // lượt check-in
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isCheckinsLoading, setIsCheckinsLoading] = useState(false);
  const [checkinTab, setCheckinTab] = useState<"checkin" | "redeem">("checkin");
  
  // suất diễn
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>("");
  const { setDashboardScope } = useContext(CheckinAssistantContext);
  const selectedShowtimeTitle = event?.showtimes?.find(showtime => showtime.id === selectedShowtimeId)?.name;

  useFocusEffect(useCallback(() => {
    setDashboardScope({ eventId, eventTitle: event?.title, showtimeId: selectedShowtimeId, showtimeTitle: selectedShowtimeTitle });
  }, [eventId, event?.title, selectedShowtimeId, selectedShowtimeTitle, setDashboardScope]));

  /**
   * Tải thông tin sự kiện và thống kê 30 ngày; nếu thống kê bị từ chối (403) thì đánh dấu và chuyển sang tab check-in.
   * @param refresh - true khi người dùng kéo để làm mới (dùng chỉ báo làm mới thay vì vòng tải đầu trang)
   */
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
      const denied = analyticsRes?.forbidden === true;
      setAnalyticsDenied(denied);
      setAnalytics(denied ? null : analyticsRes);
      if (denied) setActiveTab("checkin");
    } catch (e) {
      logError("fetchDashboardData error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /** Tải danh sách check-in của sự kiện, lọc theo suất diễn đang chọn. */
  const fetchCheckins = async () => {
    if (!eventId) return;
    setIsCheckinsLoading(true);
    try {
      const res = await eventApi.getEventCheckins(eventId as string, selectedShowtimeId);
      setCheckins(res);
    } catch (e) {
      logError("fetchCheckins error:", e);
    } finally {
      setIsCheckinsLoading(false);
    }
  };

  /** Làm mới dữ liệu chung cùng dữ liệu của tab đang mở (đơn hàng hoặc check-in). */
  const onRefresh = useCallback(() => {
    fetchDashboardData(true);
    if (activeTab === "orders") {
      fetchOrders();
    }
    if (activeTab === "checkin") {
      fetchCheckins();
    }
  }, [eventId, activeTab, searchOrder, selectedShowtimeId]);

  /** Tải tối đa 100 đơn hàng theo từ khóa và suất diễn; ghi nhận nếu người dùng không có quyền xem đơn. */
  const fetchOrders = async () => {
    if (!eventId) return;
    setIsOrdersLoading(true);
    try {
      const res = await eventApi.getEventBookings(eventId as string, searchOrder, selectedShowtimeId, 0, 100);
      setOrdersDenied(res?.forbidden === true);
      setOrders(res.content || []);
    } catch (e) {
      logError("fetchOrders error:", e);
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

  const tabOpacity = useRef(new Animated.Value(1)).current;
  const tabTranslateY = useRef(new Animated.Value(0)).current;

  /** Đổi tab đang hiển thị kèm hiệu ứng chuyển mượt và rung nhẹ. */
  const handleTabChange = (tab: "revenue" | "checkin" | "orders") => {
    if (tab === activeTab) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setActiveTab(tab);
    tabOpacity.setValue(0);
    tabTranslateY.setValue(8);
    Animated.parallel([
      Animated.timing(tabOpacity, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.timing(tabTranslateY, {
        toValue: 0,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]).start();
  };
  
  /** Vòng tròn tiến độ SVG hiển thị phần trăm (0 đến 100) bằng màu truyền vào. */
  const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => {
    const size = 64;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <View style={[styles.circularProgressContainer, { width: size, height: size, justifyContent: 'center', alignItems: 'center' }]}>
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
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
          />
        </Svg>
        <Text style={[styles.progressText, { color }]}>{percentage}%</Text>
      </View>
    );
  };

  /** Dải nút chọn suất diễn (kèm "Tất cả"); không hiển thị gì nếu sự kiện không có suất diễn. */
  const renderShowtimeSelector = () => {
    if (!event?.showtimes || event.showtimes.length === 0) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>{t("dashboard.showtime")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
          <TouchableOpacity
            style={[
              styles.showtimeBtn,
              selectedShowtimeId === "" ? { backgroundColor: colors.primary } : { backgroundColor: inactiveChipBg, borderColor: colors.border, borderWidth: 1 }
            ]}
            onPress={() => setSelectedShowtimeId("")}
          >
            <Text style={[styles.showtimeText, selectedShowtimeId === "" ? { color: "#fff", fontWeight: "600" } : { color: colors.textSecondary }]}>
              {t("dashboard.all")}
            </Text>
          </TouchableOpacity>
          {event.showtimes.map((st) => (
            <TouchableOpacity
              key={st.id}
              style={[
                styles.showtimeBtn,
                selectedShowtimeId === st.id ? { backgroundColor: colors.primary } : { backgroundColor: inactiveChipBg, borderColor: colors.border, borderWidth: 1 }
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

  /** Tab doanh thu: tiến độ doanh thu và số vé bán so với mục tiêu, giới hạn tối đa 100%. */
  const renderRevenue = () => {
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
        style={[styles.tabContent, { padding: horizontalPadding }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>{t("dashboard.overview")}</Text>
        
        <View style={isTablet ? styles.statGridTablet : undefined}>
          {/* Doanh thu */}
          <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 16 }, isTablet && { flex: 1 }]}>
            <View style={styles.statRow}>
              <View style={styles.statTextCol}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("dashboard.revenue")}</Text>
                <View style={styles.statValueRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text
                    style={[styles.statValue, { color: colors.text }, isCompact && { fontSize: 16 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {currentRev.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
                <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{t("dashboard.target")}{totalTarget.toLocaleString("vi-VN")}đ</Text>
              </View>
              <CircularProgress percentage={revPercent} color="#FFC107" />
            </View>
          </View>

          {/* Số vé bán ra */}
          <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 16 }, isTablet && { flex: 1 }]}>
            <View style={styles.statRow}>
              <View style={styles.statTextCol}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("dashboard.tickets_sold")}</Text>
                <View style={styles.statValueRow}>
                  <View style={[styles.dot, { backgroundColor: "#34C759" }]} />
                  <Text
                    style={[styles.statValue, { color: colors.text }, isCompact && { fontSize: 16 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {currentTicketsSold.toLocaleString("vi-VN")}
                  </Text>
                </View>
                <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{t("dashboard.target")}{totalTicketsTarget.toLocaleString("vi-VN")}</Text>
              </View>
              <CircularProgress percentage={ticketsPercent} color="#34C759" />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  /**
   * Tab check-in: số lượt soát vé so với số vé đã bán, nút mở màn hình quét QR
   * và lịch sử gần đây (chuyển qua lại giữa check-in và redeem).
   */
  const renderCheckIn = () => {
    const filteredCheckins = checkins;
    const totalTicketsSold = analytics?.currentTicketsSold || 0;
    const checkedInCount = filteredCheckins.length;
    let checkinPercent = totalTicketsSold > 0 ? Number(((checkedInCount / totalTicketsSold) * 100).toFixed(1)) : 0;
    if (checkinPercent > 100) checkinPercent = 100;

    return (
      <ScrollView 
        style={[styles.tabContent, { padding: horizontalPadding }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isCheckinsLoading || isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {renderShowtimeSelector()}
        <View style={styles.filterRow}>
           <TouchableOpacity 
             style={[styles.filterBtn, checkinTab === 'checkin' ? { backgroundColor: colors.primary } : { backgroundColor: inactiveChipBg, borderColor: colors.border, borderWidth: 1 }]}
             onPress={() => setCheckinTab('checkin')}
           >
             <Text style={[styles.filterText, checkinTab === 'checkin' ? { color: "#fff", fontWeight: '600' } : { color: colors.textSecondary }]}>Check-in ({filteredCheckins.length})</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.filterBtn, checkinTab === 'redeem' ? { backgroundColor: colors.primary } : { backgroundColor: inactiveChipBg, borderColor: colors.border, borderWidth: 1 }]}
             onPress={() => setCheckinTab('redeem')}
           >
             <Text style={[styles.filterText, checkinTab === 'redeem' ? { color: "#fff", fontWeight: '600' } : { color: colors.textSecondary }]}>Redeem</Text>
           </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 16 }]}>
          <View style={styles.statRow}>
            <View style={styles.statTextCol}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{checkinTab === 'checkin' ? t("dashboard.checked_in") : t("dashboard.redeemed")}</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.statValue, { color: colors.text }]}>{checkedInCount.toLocaleString("vi-VN")}</Text>
              </View>
              {analyticsDenied ? (
                <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{t("dashboard.no_stats_permission")}</Text>
              ) : (
                <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{t("dashboard.of_total_sold")}{totalTicketsSold.toLocaleString("vi-VN")}{t("dashboard.tickets_sold_suffix")}</Text>
              )}
            </View>
            {!analyticsDenied && <CircularProgress percentage={checkinPercent} color={colors.primary} />}
          </View>
        </View>
        <AnimatedPressable
          scaleTo={0.97}
          contentStyle={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, marginTop: 16, alignItems: "center" }}
          onPress={() => router.push({ pathname: `/check-in/${eventId}`, params: { showtimeId: selectedShowtimeId, mode: checkinTab } })}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{checkinTab === 'checkin' ? t("dashboard.scan_qr_checkin") : t("dashboard.scan_qr_redeem")}</Text>
        </AnimatedPressable>
        
        <View style={{ marginTop: 24, paddingBottom: 40 }}>
           <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>{checkinTab === 'checkin' ? t("dashboard.recent_history_checkin") : t("dashboard.recent_history_redeem")}</Text>
           <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
             {filteredCheckins.map((c, idx) => (
               <View key={idx} style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 8, marginBottom: 8 }}>
                 <Text style={{ color: colors.text, fontWeight: '600' }}>{t("dashboard.ticket_type")}{c.ticketTypeName}</Text>
                 {c.seatName && <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{c.seatName}</Text>}
                 <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>{new Date(c.checkedInAt).toLocaleString('vi-VN')}</Text>
               </View>
             ))}
             {filteredCheckins.length === 0 && (
               <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 16 }}>{checkinTab === 'checkin' ? t("dashboard.no_checkin") : t("dashboard.no_redeem")}</Text>
             )}
           </ScrollView>
        </View>
      </ScrollView>
    );
  };

  /** Tab đơn hàng: ô tìm kiếm, số lượng và danh sách đơn kèm trạng thái; hiện thông báo khi không có quyền hoặc không có đơn. */
  const renderOrders = () => (
    <View style={[styles.tabContent, { padding: horizontalPadding }]}>
      {renderShowtimeSelector()}
      
      <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput 
          placeholder={t("dashboard.search_order")}
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
          <Ionicons name={ordersDenied ? "lock-closed-outline" : "receipt-outline"} size={48} color={colors.border} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{ordersDenied ? t("dashboard.no_orders_permission") : t("dashboard.no_orders")}</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.orderCount, { color: colors.text }]}>{t("dashboard.has")}{orders.length}{t("dashboard.order_count")}</Text>
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id || item.bookingCode}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const statusInfo = orderStatusInfo(item.status);
              const statusColor = statusInfo.tone === "success" ? "#34C759" : statusInfo.tone === "danger" ? "#FF3B30" : statusInfo.tone === "warning" ? "#FF9500" : colors.textSecondary;
              return (
              <View style={[styles.orderCard, { backgroundColor: colors.surface }]}>
                <View style={styles.orderCardHeader}>
                  <Text style={[styles.orderCustomerName, { color: colors.text }]} numberOfLines={1}>
                    {item.customerName || t("dashboard.customer")}
                  </Text>
                  <Text style={[styles.orderStatus, { color: statusColor }]}>
                    {statusInfo.labelKey ? t(statusInfo.labelKey) : item.status}
                  </Text>
                </View>
                <Text style={[styles.orderId, { color: colors.textSecondary }]}>{t("dashboard.order_code")}{item.bookingCode}</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={[styles.orderInfoRow, isCompact && styles.orderInfoRowCompact]}>
                  <View style={styles.orderInfoCol}>
                    <Text style={[styles.orderInfoLabel, { color: colors.textSecondary }]}>{t("dashboard.email")}</Text>
                    <Text style={[styles.orderInfoValue, { color: colors.text }]} numberOfLines={2}>
                      {item.customerEmail}
                    </Text>
                  </View>
                  <View style={styles.orderInfoCol}>
                    <Text style={[styles.orderInfoLabel, { color: colors.textSecondary }]}>{t("dashboard.total_amount")}</Text>
                    <Text style={[styles.orderInfoValue, { color: colors.text }]}>{item.totalAmount?.toLocaleString("vi-VN")}đ</Text>
                  </View>
                </View>
              </View>
              );
            }}
          />
        </>
      )}
    </View>
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.responsiveShell, { maxWidth: maxContainerWidth }]}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <AnimatedPressable scaleTo={0.86} onPress={() => router.back()} contentStyle={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </AnimatedPressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {event?.title || t("dashboard.manage_event")}
            </Text>
            <Text style={[styles.headerDate, { color: colors.textSecondary }]} numberOfLines={1}>
              {event?.locationName || t("dashboard.loading")}
            </Text>
          </View>
        </View>

        {/* Tabs Navigation */}
        <View style={[styles.tabNav, { borderBottomColor: colors.border }]}>
          {!analyticsDenied && (
          <AnimatedPressable
            style={{ flex: 1 }}
            scaleTo={0.96}
            contentStyle={[styles.tabNavItem, activeTab === "revenue" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => handleTabChange("revenue")}
          >
            <Text style={[styles.tabNavText, activeTab === "revenue" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>{t("dashboard.revenue")}</Text>
          </AnimatedPressable>
          )}
          <AnimatedPressable
            style={{ flex: 1 }}
            scaleTo={0.96}
            contentStyle={[styles.tabNavItem, activeTab === "checkin" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => handleTabChange("checkin")}
          >
            <Text style={[styles.tabNavText, activeTab === "checkin" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>{t("dashboard.checkin")}</Text>
          </AnimatedPressable>
          {!analyticsDenied && (
          <AnimatedPressable
            style={{ flex: 1 }}
            scaleTo={0.96}
            contentStyle={[styles.tabNavItem, activeTab === "orders" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => handleTabChange("orders")}
          >
            <Text style={[styles.tabNavText, activeTab === "orders" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>{t("dashboard.orders")}</Text>
          </AnimatedPressable>
          )}
        </View>

        {/* Tab Content */}
        <View style={styles.contentContainer}>
          {isLoading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <Animated.View style={{ flex: 1, opacity: tabOpacity, transform: [{ translateY: tabTranslateY }] }}>
              {activeTab === "revenue" && !analyticsDenied && renderRevenue()}
              {activeTab === "checkin" && renderCheckIn()}
              {activeTab === "orders" && !analyticsDenied && renderOrders()}
            </Animated.View>
          )}
        </View>
        </View>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  responsiveShell: { flex: 1, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { marginRight: 16 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  headerDate: { fontSize: 12, marginTop: 2 },
  tabNav: { flexDirection: "row", borderBottomWidth: 1 },
  tabNavItem: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  tabNavText: { fontSize: 14 },
  contentContainer: { flex: 1 },
  tabContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  statGridTablet: { flexDirection: "row", gap: 16 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statTextCol: { flex: 1, paddingRight: 12 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValueRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statValue: { fontSize: 18, fontWeight: "bold", flexShrink: 1 },
  statSubValue: { fontSize: 12 },
  circularProgressContainer: { width: 60, height: 60, justifyContent: "center", alignItems: "center" },
  circularProgress: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, justifyContent: "center", alignItems: "center" },
  progressText: { fontSize: 14, fontWeight: "bold" },
  searchBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 13 },
  orderCount: { fontSize: 14, fontWeight: "600", marginBottom: 16 },
  orderCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 },
  orderCustomerName: { fontSize: 15, fontWeight: "600", flex: 1 },
  orderStatus: { fontSize: 12, fontWeight: "bold" },
  orderId: { fontSize: 13, marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  orderInfoRow: { flexDirection: "row", gap: 12 },
  orderInfoRowCompact: { flexDirection: "column", gap: 8 },
  orderInfoCol: { flex: 1 },
  orderInfoLabel: { fontSize: 12, marginBottom: 2 },
  orderInfoValue: { fontSize: 14, fontWeight: "500" },
  showtimeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  showtimeText: { fontSize: 13 },
});
