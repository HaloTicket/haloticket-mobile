import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/theme";

export default function SelectGateScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Màn Hình Chọn Cổng Soát Vé (Gate / Zone)
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Ví dụ: Cổng A1 (Khán đài A), Cổng VIP (Khán đài VIP)
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
