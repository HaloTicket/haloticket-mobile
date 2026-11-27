import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useState, useCallback, useEffect } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/theme";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/hooks/useModal";
import { notificationApi } from "@/services/api/notificationApi";
import { StaffNotification } from "@/types/notification";
import {
  countUnreadNotifications,
  formatNotificationDateTime,
  markNotificationReadInList,
} from "@/utils/notifications";
import { logError } from "@/utils/log";

/**
 * Màn hình hộp thư thông báo kênh STAFF dành cho nhân viên/ban tổ chức.
 * Hỗ trợ tải lại khi focus, kéo để làm mới, trạng thái tải/lỗi/rỗng, chỉ báo chưa đọc và đánh dấu đã đọc.
 */
export default function StaffNotificationsScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { showAlert } = useModal();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inboxEntrance] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const preference = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduceMotion) => {
      if (reduceMotion) {
        animation?.stop();
        inboxEntrance.setValue(1);
      }
    });

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active || reduceMotion) return;
      inboxEntrance.setValue(0);
      animation = Animated.timing(inboxEntrance, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      });
      animation.start();
    }).catch(() => {
      // Keep the inbox visible if the platform cannot read the preference.
    });

    return () => {
      active = false;
      preference.remove();
      animation?.stop();
      inboxEntrance.setValue(1);
    };
  }, [inboxEntrance, isLoading]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (refresh = false) => {
      if (!user?.id) {
        setErrorMessage(t("notifications.missing_user"));
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const items = await notificationApi.getStaffNotifications(user.id);
        setNotifications(items);
      } catch (error) {
        logError("Fetch staff notifications error:", error);
        setErrorMessage(t("notifications.error_description"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id, t]
  );

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(false);
    }, [fetchNotifications])
  );

  const handleMarkAsRead = async (notificationId: string) => {
    if (markingId) return;
    setMarkingId(notificationId);
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) => markNotificationReadInList(prev, notificationId));
    } catch (error) {
      logError("Mark notification read error:", error);
      showAlert(t("auth.error_title"), t("notifications.mark_read_error"));
    } finally {
      setMarkingId(null);
    }
  };

  const unreadCount = countUnreadNotifications(notifications);

  const renderItem = ({ item }: { item: StaffNotification }) => {
    const isUnread = !item.readStatus;
    const isMarking = markingId === item.id;
    const formattedTime = formatNotificationDateTime(item.createdAt, i18n.language);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isUnread ? colors.primary : colors.border,
            borderLeftWidth: isUnread ? 4 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text, fontWeight: isUnread ? "700" : "600" },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isUnread ? `${colors.primary}1A` : colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isUnread ? colors.primary : colors.textSecondary },
              ]}
            >
              {isUnread ? t("notifications.unread_badge") : t("notifications.read_badge")}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardMessage, { color: colors.textSecondary }]}>{item.message}</Text>

        <View style={styles.metaRow}>
          {Boolean(item.eventTitle) && (
            <View style={[styles.metaChip, { backgroundColor: colors.background }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.eventTitle}
              </Text>
            </View>
          )}
          {Boolean(item.category) && (
            <View style={[styles.metaChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formattedTime}</Text>
          {isUnread && (
            <TouchableOpacity style={[styles.markReadBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleMarkAsRead(item.id)}
              disabled={isMarking}
              accessibilityRole="button"
              accessibilityLabel={t("notifications.mark_read")}
            >
              {isMarking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                  <Text style={styles.markReadBtnText}>{t("notifications.mark_read")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.container,
            { opacity: inboxEntrance, paddingHorizontal: 16 },
          ]}
        >
        <View style={[styles.header, false]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.headerTitle, { color: colors.text }, false]} numberOfLines={1}>
              {t("notifications.title")}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {t("notifications.subtitle")}
            </Text>
          </View>
          <View
            style={[
              styles.unreadSummaryPill,
              {
                
                backgroundColor: unreadCount > 0 ? `${colors.primary}1A` : colors.surface,
                borderColor: unreadCount > 0 ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.unreadSummaryText,
                { color: unreadCount > 0 ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {unreadCount > 0
                ? t("notifications.unread_count", { count: unreadCount })
                : t("notifications.all_read")}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              {t("notifications.error_title")}
            </Text>
            <Text style={[styles.stateDescription, { color: colors.textSecondary }]}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => fetchNotifications(false)}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.retryBtnText}>{t("notifications.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyListContent : styles.listContent
            }
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchNotifications(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>
                  {t("notifications.empty_title")}
                </Text>
                <Text style={[styles.stateDescription, { color: colors.textSecondary }]}>
                  {t("notifications.empty_description")}
                </Text>
              </View>
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  unreadSummaryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  unreadSummaryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  stateDescription: {
    marginTop: 6,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: "100%",
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  timeText: {
    fontSize: 12,
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minHeight: 32,
    justifyContent: "center",
  },
  markReadBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
