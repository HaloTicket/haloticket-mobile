import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/theme";

export default function QRScannerScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Màn Hình Quét Mã QR Soát Vé
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Camera QR Code Scanner & Tra cứu mã vé trực tiếp tại Cổng
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
