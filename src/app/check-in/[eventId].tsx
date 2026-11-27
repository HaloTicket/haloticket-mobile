import { useState, useEffect, useRef, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { CheckinAssistantContext } from "@/components/event/CheckinAssistantContext";
import { Ionicons } from "@expo/vector-icons";
import axiosClient from "@/services/api/axiosClient";
import { eventApi } from "@/services/api/eventApi";
import { EventData } from "@/types/event";
import { useAuth } from "@/hooks/useAuth";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { logError } from "@/utils/log";
import { useResponsive } from "@/hooks/useResponsive";

/** Định dạng thời gian sự kiện / suất diễn giống mẫu: "17:30 - 19:30, 01 Tháng 06, 2024". */
function formatEventSchedule(
  startIso: string | undefined,
  endIso: string | undefined,
  language: string
): string {
  if (!startIso) return "";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  let timeRange = startTime;

  if (endIso) {
    const end = new Date(endIso);
    if (!Number.isNaN(end.getTime())) {
      timeRange = `${startTime} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
    }
  }

  if (language.startsWith("vi")) {
    const day = pad(start.getDate());
    const month = pad(start.getMonth() + 1);
    const year = start.getFullYear();
    return `${timeRange}, ${day} Tháng ${month}, ${year}`;
  }

  const datePart = start.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return `${timeRange}, ${datePart}`;
}

/**
 * Màn hình quét QR soát vé cho một sự kiện (và suất diễn nếu có `showtimeId`):
 * hiển thị tên sự kiện, thời gian suất diễn, chế độ Check-in/Redeem, nút bật đèn flash,
 * khung ngắm QR và nút nhập mã vé thủ công.
 */
export default function CheckInScannerScreen() {
  const { eventId, showtimeId, mode } = useLocalSearchParams<{
    eventId: string;
    showtimeId?: string;
    mode?: string;
  }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { scanBoxSize, isCompact, isLandscape, horizontalPadding } = useResponsive();
  const cornerSize = isCompact || isLandscape ? 28 : 38;

  const [permission, requestPermission] = useCameraPermissions();
  const [eventInfo, setEventInfo] = useState<EventData | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "warning">("idle");
  const [message, setMessage] = useState("");
  const { open: assistantOpen } = useContext(CheckinAssistantContext);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const resultPop = useRef(new Animated.Value(0.92)).current;

  // Tải thông tin sự kiện để hiển thị tên & khung giờ suất diễn trên màn quét QR
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    eventApi
      .getEventById(eventId)
      .then((data) => {
        if (active) setEventInfo(data);
      })
      .catch((err) => {
        logError("Fetch event info for scanner error:", err);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const scheduleText = useMemo(() => {
    if (!eventInfo) return "";
    const matchedShowtime = showtimeId
      ? eventInfo.showtimes?.find((st) => st.id === showtimeId)
      : eventInfo.showtimes?.[0];
    const start = matchedShowtime?.startTime || eventInfo.startTime;
    const end = matchedShowtime?.endTime || eventInfo.endTime;
    return formatEventSchedule(start, end, i18n.language || "vi");
  }, [eventInfo, showtimeId, i18n.language]);

  const modeBadgeLabel = mode === "redeem" ? "Redeem" : "Checkin";
  const scannerPaused = scanned || assistantOpen || manualModalOpen || isChecking;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (!scannerPaused && permission?.granted) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: scanBoxSize - 4,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      scanLineAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [scannerPaused, permission?.granted, scanLineAnim, scanBoxSize]);

  useEffect(() => {
    if (scanned) {
      resultPop.setValue(0.92);
      Animated.spring(resultPop, {
        toValue: 1,
        speed: 24,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [scanned, resultPop]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={56} color={colors.primary} style={{ marginBottom: 14 }} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            {t("dashboard.camera_permission_required")}
          </Text>
          <AnimatedPressable
            scaleTo={0.96}
            contentStyle={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>{t("dashboard.grant_permission")}</Text>
          </AnimatedPressable>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const triggerHaptic = (type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(type).catch(() => { });
    }
  };

  /**
   * Xử lý một mã QR vừa quét hoặc nhập tay: gọi API check-in rồi đặt trạng thái và thông điệp theo kết quả.
   * Lỗi 400, 403, 409, 503 được dịch sang thông điệp riêng theo mã lỗi của máy chủ.
   */
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    const code = data?.trim();
    if (!code || isChecking) return;

    setIsChecking(true);
    setScanned(true);
    setStatus("idle");
    try {
      const checkinData = (await axiosClient.post(
        "/tickets/checkin",
        {
          qrCodeHash: code,
          eventId: eventId,
          showtimeId: showtimeId || null,
          deviceInfo: Platform.OS + " " + Platform.Version,
          staffAssignmentId: user?.id || user?.email || "unknown-staff",
        },
        {
          // màn hình tự giải thích các lỗi này theo mã: 400, 403, 409, 503
          skipGlobalError: [400, 403, 409, 503],
        }
      )) as any;

      if (
        checkinData.status === "VALID" ||
        checkinData.status === "SUCCESS" ||
        checkinData.code === "SUCCESS"
      ) {
        setStatus("success");
        setMessage(
          `REDEEM ${t("dashboard.redeem_success")}\n${t("dashboard.ticket_label")}${checkinData.ticketTypeName}\n${checkinData.seatName || t("dashboard.free_zone")}`
        );
        triggerHaptic(Haptics.NotificationFeedbackType.Success);
      } else if (checkinData.status === "DUPLICATED" || checkinData.code === "ALREADY_USED") {
        setStatus("warning");
        setMessage(
          `${t("dashboard.ticket_already_redeemed")}\n${t("dashboard.ticket_label")}${checkinData.ticketTypeName}\n${checkinData.seatName || t("dashboard.free_zone")}`
        );
        triggerHaptic(Haptics.NotificationFeedbackType.Warning);
      } else if (checkinData.code === "TICKET_LOCKED") {
        setStatus("error");
        setMessage(
          `${t("dashboard.ticket_locked")}\n${t("dashboard.ticket_label")}${checkinData.ticketTypeName || ""}\n${checkinData.seatName || t("dashboard.free_zone")}`
        );
        triggerHaptic(Haptics.NotificationFeedbackType.Error);
      } else {
        setStatus("error");
        setMessage(t("dashboard.invalid_ticket"));
        triggerHaptic(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      logError("Checkin Error:", error);
      setStatus("error");

      const resStatus = error.response?.status;
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message || t("dashboard.system_error");

      if (errorCode === "OUTSIDE_CHECKIN_WINDOW") {
        setMessage(t("dashboard.ticket_outside_window"));
      } else if (errorCode === "TICKET_NOT_FOUND") {
        setMessage(t("dashboard.ticket_not_found"));
      } else if (
        errorCode === "WRONG_EVENT" ||
        errorMessage.toLowerCase().includes("does not belong to this event")
      ) {
        setMessage(t("dashboard.ticket_wrong_event"));
      } else if (
        errorCode === "WRONG_SHOWTIME" ||
        errorMessage.toLowerCase().includes("does not belong to this showtime")
      ) {
        setMessage(t("dashboard.ticket_wrong_showtime"));
      } else if (errorCode === "ALREADY_USED") {
        setMessage(t("dashboard.ticket_already_redeemed"));
      } else if (errorCode === "TICKET_LOCKED") {
        setMessage(t("dashboard.ticket_locked"));
      } else if (resStatus === 409 || errorCode === "CONCURRENCY_CONFLICT") {
        setMessage(t("dashboard.ticket_already_used_other_gate"));
      } else if (resStatus === 403) {
        setMessage(t("dashboard.checkin_forbidden"));
      } else if (resStatus === 503 && errorCode === "EVENT_ACCESS_UNAVAILABLE") {
        setMessage(t("dashboard.checkin_access_unavailable"));
      } else {
        setMessage(errorMessage.toUpperCase());
      }
      triggerHaptic(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleTorch = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => { });
    }
    setTorchEnabled((prev) => !prev);
  };

  const handleSubmitManualCode = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setManualModalOpen(false);
    setManualCode("");
    void handleBarCodeScanned({ data: trimmed });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {!assistantOpen && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={scannerPaused ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
      )}

      {/* Lớp phủ tối với ô quét trong suốt ở giữa */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* Vùng trên: header thông tin sự kiện + badge Checkin + hướng dẫn */}
        <View style={styles.overlayTop}>
          <SafeAreaView
            edges={["top"]}
            style={[styles.topSafeArea, isLandscape && { paddingBottom: 8 }]}
          >
            <View
              style={[
                styles.headerRow,
                { paddingHorizontal: horizontalPadding },
                isLandscape && { paddingTop: 4 },
              ]}
            >
              <AnimatedPressable
                scaleTo={0.88}
                contentStyle={styles.circleBtn}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </AnimatedPressable>

              <View style={styles.eventMeta}>
                <Text
                  style={[styles.eventTitle, isCompact && { fontSize: 15 }]}
                  numberOfLines={1}
                >
                  {eventInfo?.title || t("dashboard.scan_qr_title")}
                </Text>
                {Boolean(scheduleText) && (
                  <Text
                    style={[styles.eventSchedule, isCompact && { fontSize: 11.5 }]}
                    numberOfLines={1}
                  >
                    {scheduleText}
                  </Text>
                )}
              </View>

              <AnimatedPressable
                scaleTo={0.88}
                contentStyle={[
                  styles.circleBtn,
                  torchEnabled && styles.circleBtnTorchActive,
                ]}
                onPress={handleToggleTorch}
                accessibilityRole="button"
                accessibilityLabel="Toggle Flash"
              >
                <Ionicons
                  name={torchEnabled ? "flash" : "flash-outline"}
                  size={20}
                  color={torchEnabled ? "#FDE047" : "#FACC15"}
                />
              </AnimatedPressable>
            </View>

            <View style={[styles.guideBlock, isLandscape && { gap: 4 }]}>
              <View style={[styles.modeBadge, isLandscape && { paddingVertical: 4 }]}>
                <Text style={styles.modeBadgeText}>{modeBadgeLabel}</Text>
              </View>
              <Text style={[styles.guideText, isCompact && { fontSize: 13 }]}>
                {t("dashboard.point_camera_qr")}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Hàng giữa: viền tối 2 bên + khung ngắm QR */}
        <View style={[styles.overlayMiddleRow, { height: scanBoxSize }]} pointerEvents="none">
          <View style={styles.overlaySide} />
          <View style={[styles.targetBox, { width: scanBoxSize, height: scanBoxSize }]}>
            {!scannerPaused && (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]}
              />
            )}

            {/* 4 góc khung quét bo tròn trắng sắc nét giống ảnh mẫu */}
            <View style={[styles.corner, { width: cornerSize, height: cornerSize }, styles.topLeft]} />
            <View style={[styles.corner, { width: cornerSize, height: cornerSize }, styles.topRight]} />
            <View style={[styles.corner, { width: cornerSize, height: cornerSize }, styles.bottomLeft]} />
            <View style={[styles.corner, { width: cornerSize, height: cornerSize }, styles.bottomRight]} />

            {isChecking && (
              <View style={styles.checkingBadge}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={styles.checkingText}>{t("dashboard.checking_ticket")}</Text>
              </View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Vùng dưới: nút nhập mã code number thủ công */}
        <View style={styles.overlayBottom}>
          <SafeAreaView
            edges={["bottom"]}
            style={[
              styles.bottomSafeArea,
              { paddingHorizontal: horizontalPadding, paddingBottom: isLandscape ? 10 : 20 },
            ]}
          >
            <View style={styles.manualBtnWrap}>
              <AnimatedPressable
                scaleTo={0.97}
                contentStyle={[styles.manualBtn, isLandscape && { height: 42 }]}
                onPress={() => setManualModalOpen(true)}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={18} color="#38BDF8" style={{ marginRight: 8 }} />
                <Text style={styles.manualBtnText}>{t("dashboard.manual_code_btn")}</Text>
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </View>
      </View>

      {/* Hộp thoại nhập mã vé thủ công */}
      <Modal
        visible={manualModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setManualModalOpen(false)}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.manualModalCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.manualModalHeader}>
                  <Text style={[styles.manualModalTitle, { color: colors.text }]}>
                    {t("dashboard.manual_code_title")}
                  </Text>
                  <TouchableOpacity onPress={() => setManualModalOpen(false)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[
                    styles.manualInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t("dashboard.manual_code_placeholder")}
                  placeholderTextColor={colors.textSecondary}
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="none"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSubmitManualCode}
                />

                <View style={styles.manualModalActions}>
                  <AnimatedPressable
                    scaleTo={0.95}
                    contentStyle={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setManualModalOpen(false)}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: "600", fontSize: 15 }}>
                      {t("common.cancel", "Hủy")}
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.95}
                    contentStyle={[
                      styles.modalBtn,
                      { backgroundColor: manualCode.trim() ? colors.primary : colors.border },
                    ]}
                    onPress={handleSubmitManualCode}
                    disabled={!manualCode.trim()}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                      {t("dashboard.manual_code_submit")}
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Kết quả soát vé */}
      {scanned && !isChecking && (
        <View style={styles.resultAnchor} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.resultOverlay,
              { backgroundColor: colors.surface, transform: [{ scale: resultPop }] },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                status === "success"
                  ? { backgroundColor: "rgba(52, 199, 89, 0.15)" }
                  : status === "warning"
                    ? { backgroundColor: "rgba(255, 204, 0, 0.15)" }
                    : { backgroundColor: "rgba(255, 59, 48, 0.15)" },
              ]}
            >
              {status === "success" && <Ionicons name="checkmark-circle" size={64} color="#34C759" />}
              {status === "warning" && <Ionicons name="warning" size={64} color="#FFCC00" />}
              {status === "error" && <Ionicons name="close-circle" size={64} color="#FF3B30" />}
            </View>

            <Text
              style={[
                styles.resultText,
                {
                  color:
                    status === "success"
                      ? "#34C759"
                      : status === "warning"
                        ? "#FFCC00"
                        : "#FF3B30",
                },
              ]}
            >
              {message}
            </Text>

            <AnimatedPressable
              style={{ width: "100%" }}
              scaleTo={0.97}
              contentStyle={[styles.scanAgainBtn, { backgroundColor: colors.primary }]}
              onPress={() => setScanned(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                {t("dashboard.scan_next")}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  permissionText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 22,
  },
  permissionBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(6, 12, 26, 0.62)",
    justifyContent: "space-between",
  },
  topSafeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnTorchActive: {
    backgroundColor: "rgba(250, 204, 21, 0.24)",
    borderColor: "rgba(250, 204, 21, 0.7)",
  },
  eventMeta: {
    flex: 1,
    alignItems: "center",
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 16.5,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  eventSchedule: {
    color: "rgba(241, 245, 249, 0.9)",
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  guideBlock: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  modeBadge: {
    backgroundColor: "#3898FF",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  modeBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  guideText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayMiddleRow: { flexDirection: "row" },
  overlaySide: { flex: 1, backgroundColor: "rgba(6, 12, 26, 0.62)" },
  targetBox: {
    backgroundColor: "transparent",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 6,
  },
  corner: { position: "absolute", width: 38, height: 38, borderColor: "#FFFFFF" },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  checkingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(6, 12, 26, 0.82)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  checkingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(6, 12, 26, 0.62)",
    justifyContent: "flex-end",
  },
  bottomSafeArea: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  manualBtnWrap: {
    width: "100%",
    maxWidth: 460,
  },
  manualBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "rgba(56, 189, 248, 0.72)",
    backgroundColor: "rgba(10, 20, 44, 0.78)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  manualBtnText: {
    color: "#7DD3FC",
    fontSize: 14.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  manualModalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  manualModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  manualModalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  manualInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },
  manualModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    borderWidth: 1,
  },
  resultAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    zIndex: 20,
  },
  resultOverlay: {
    width: "100%",
    maxWidth: 460,
    padding: 26,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  iconWrapper: {
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 19,
    marginBottom: 26,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 27,
  },
  scanAgainBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
});
