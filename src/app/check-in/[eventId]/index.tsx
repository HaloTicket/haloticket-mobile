import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";

export default function ScanTicketScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Kịch Huyền Thoại Mắt Thần
          </Text>
          <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
            17:30 - 19:30, 01 Tháng 06, 2024
          </Text>
        </View>
        <TouchableOpacity style={styles.flashButton}>
          <Ionicons name="flash" size={20} color="#FFD60A" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={[styles.checkinBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.checkinText, { color: "#000", fontWeight: 'bold' }]}>Checkin</Text>
        </View>
        
        <Text style={[styles.instruction, { color: colors.text }]}>Hướng Camera về phía mã QR</Text>

        <View style={styles.scannerContainer}>
          {/* Fake Scanner View */}
          <View style={styles.scannerOverlay}>
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
            
            {/* Fake QR Code Content inside */}
            <View style={styles.fakeQR}>
              <Ionicons name="qr-code-outline" size={150} color={colors.text} />
            </View>
          </View>
          
          <View style={styles.scannedInfo}>
            <Text style={[styles.scannedCode, { color: colors.text }]}>363152519735</Text>
            <Text style={[styles.scannedStatus, { color: colors.textSecondary }]}>Đã check-in</Text>
            <Text style={[styles.scannedTime, { color: colors.textSecondary }]}>19:49, 19 Tháng 05, 2024</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.manualInputButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <Text style={[styles.manualInputText, { color: colors.primary }]}>Nhập mã code number</Text>
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerDate: {
    fontSize: 12,
    marginTop: 2,
  },
  flashButton: {
    padding: 8,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
  },
  checkinBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  checkinText: {
    fontSize: 14,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 40,
  },
  scannerContainer: {
    alignItems: "center",
  },
  scannerOverlay: {
    width: 250,
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  fakeQR: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  scannedInfo: {
    marginTop: 32,
    alignItems: "center",
  },
  scannedCode: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scannedStatus: {
    fontSize: 14,
    marginBottom: 2,
  },
  scannedTime: {
    fontSize: 14,
  },
  bottomBar: {
    padding: 16,
  },
  manualInputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  manualInputText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
