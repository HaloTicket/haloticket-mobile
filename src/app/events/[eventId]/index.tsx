import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

export default function EventDashboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"revenue" | "checkin" | "orders">("revenue");
  
  // custom circular progress bar component (simplified)
  const CircularProgress = ({ percentage, color }: { percentage: number, color: string }) => (
    <View style={styles.circularProgressContainer}>
      <View style={[styles.circularProgress, { borderColor: color }]}>
        <Text style={[styles.progressText, { color }]}>{percentage}%</Text>
      </View>
    </View>
  );

  const renderRevenue = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tổng quan</Text>
      
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.statRow}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Doanh thu</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statValue, { color: colors.text }]}>500.000.000đ</Text>
            </View>
            <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Tổng: 600.000.000đ</Text>
          </View>
          <CircularProgress percentage={78} color="#FFC107" />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statRow}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Số lượng vé đã bán</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statValue, { color: colors.text }]}>1.235 vé</Text>
            </View>
            <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Tổng: 2000 vé</Text>
          </View>
          <CircularProgress percentage={87} color={colors.primary} />
        </View>
      </View>

      {/* Fake Chart Area */}
      <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 16, height: 200, justifyContent: 'center', alignItems: 'center' }]}>
         <Text style={{ color: colors.textSecondary }}>[Biểu đồ doanh thu]</Text>
      </View>
    </ScrollView>
  );

  const renderCheckIn = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.filterRow}>
         <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
           <Text style={[styles.filterText, { color: "#000", fontWeight: '600' }]}>Check-in</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.filterBtn, { borderColor: colors.border, borderWidth: 1 }]}>
           <Text style={[styles.filterText, { color: colors.textSecondary }]}>Redeem</Text>
         </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 16 }]}>
        <View style={styles.statRow}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đã check-in</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statValue, { color: colors.text }]}>1.235 vé</Text>
            </View>
            <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Đã bán 2000</Text>
          </View>
          <CircularProgress percentage={87} color={colors.primary} />
        </View>

        <View style={[styles.statDetailRow, { backgroundColor: '#2C2C2E', marginTop: 16 }]}>
          <View style={styles.statDetailLeft}>
            <Ionicons name="people" size={16} color="#0A84FF" />
            <Text style={[styles.statDetailText, { color: colors.textSecondary }]}>Trong sự kiện</Text>
          </View>
          <Text style={[styles.statDetailValue, { color: colors.text }]}>1.200</Text>
        </View>

        <View style={[styles.statDetailRow, { backgroundColor: '#2C2C2E', marginTop: 8 }]}>
          <View style={styles.statDetailLeft}>
            <Ionicons name="person-remove" size={16} color="#FF453A" />
            <Text style={[styles.statDetailText, { color: colors.textSecondary }]}>Đã ra ngoài</Text>
          </View>
          <Text style={[styles.statDetailValue, { color: colors.text }]}>35</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Chi tiết</Text>
      
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.statRow}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ticket Type 1</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statValue, { color: colors.text }]}>250 vé</Text>
            </View>
            <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Đã bán 280</Text>
          </View>
          <CircularProgress percentage={87} color={colors.primary} />
        </View>
      </View>
    </ScrollView>
  );

  const renderOrders = () => (
    <View style={styles.tabContent}>
      <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput 
          placeholder="Search orders" 
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <View style={styles.filterRow}>
         <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
           <Text style={[styles.filterText, { color: "#000", fontWeight: '600' }]}>Tất cả</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.filterBtn, { borderColor: colors.border, borderWidth: 1 }]}>
           <Text style={[styles.filterText, { color: colors.textSecondary }]}>Đã checkin</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.filterBtn, { borderColor: colors.border, borderWidth: 1 }]}>
           <Text style={[styles.filterText, { color: colors.textSecondary }]}>Chưa checkin</Text>
         </TouchableOpacity>
      </View>

      <Text style={[styles.orderCount, { color: colors.text }]}>Có 1.324 đơn hàng</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {[1,2,3,4].map((item) => (
          <View key={item} style={[styles.orderCard, { backgroundColor: colors.surface }]}>
            <View style={styles.orderCardHeader}>
              <Text style={[styles.orderCustomerName, { color: colors.text }]}>Hoàng Trung</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
            <Text style={[styles.orderId, { color: colors.textSecondary }]}>Mã đơn hàng: 123454</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.orderInfoRow}>
              <View style={styles.orderInfoCol}>
                <Text style={[styles.orderInfoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.orderInfoValue, { color: colors.text }]}>h***05@gmail.com</Text>
              </View>
              <View style={styles.orderInfoCol}>
                <Text style={[styles.orderInfoLabel, { color: colors.textSecondary }]}>Số điện thoại</Text>
                <Text style={[styles.orderInfoValue, { color: colors.text }]}>+84353***166</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
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
          <Text style={[styles.headerDate, { color: colors.text }]}>28 Tháng 02, 2025 - 16:00</Text>
          <Text style={[styles.headerTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Nhà Hát Kịch IDECAF
          </Text>
        </View>
      </View>

      {/* Tabs Navigation */}
      <View style={[styles.tabNav, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tabNavItem, activeTab === "revenue" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("revenue")}
        >
          <Text style={[styles.tabNavText, activeTab === "revenue" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Doanh thu</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabNavItem, activeTab === "checkin" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("checkin")}
        >
          <Text style={[styles.tabNavText, activeTab === "checkin" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabNavItem, activeTab === "orders" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("orders")}
        >
          <Text style={[styles.tabNavText, activeTab === "orders" ? { color: colors.text, fontWeight: 'bold' } : { color: colors.textSecondary }]}>Đơn hàng</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === "revenue" && renderRevenue()}
        {activeTab === "checkin" && renderCheckIn()}
        {activeTab === "orders" && renderOrders()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerDate: {
    fontSize: 14,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
  },
  tabNav: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabNavItem: {
    marginRight: 24,
    paddingVertical: 12,
  },
  tabNavText: {
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statSubValue: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  circularProgressContainer: {
    width: 60,
    height: 60,
  },
  circularProgress: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 12,
  },
  statDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  statDetailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statDetailText: {
    fontSize: 12,
  },
  statDetailValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  orderCount: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 16,
  },
  orderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderCustomerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  orderId: {
    fontSize: 12,
  },
  orderInfoRow: {
    flexDirection: "row",
  },
  orderInfoCol: {
    flex: 1,
  },
  orderInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  orderInfoValue: {
    fontSize: 14,
  },
});
