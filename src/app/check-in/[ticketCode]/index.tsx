import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAppTheme } from "@/theme";

export default function TicketVerificationResultScreen() {
  const { ticketCode } = useLocalSearchParams<{ ticketCode: string }>();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Kết Quả Kiểm Tra Vé #{ticketCode}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Trạng thái: Vé Hợp Lệ ✅ / Đã Sử Dụng ⚠️ / Không Hợp Lệ ❌
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
