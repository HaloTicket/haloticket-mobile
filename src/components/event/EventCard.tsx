import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { EventData } from "@/types/event";
import { useTranslation } from "react-i18next";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";

/** Props của {@code EventCard}: sự kiện cần hiển thị và thứ tự để tạo hiệu ứng vào lần lượt. */
interface EventCardProps {
  event: EventData;
  index?: number;
}

/** Thẻ sự kiện trong danh sách: ảnh, tiêu đề và các nút hành động điều hướng tới trang chi tiết sự kiện. */
export function EventCard({ event, index = 0 }: EventCardProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <FadeSlideIn delay={Math.min(index, 6) * 45} distance={14} duration={250}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardContent}>
          <Image
            source={{ uri: event.image }}
            style={styles.eventImage}
          />
          <Text
            style={[styles.eventTitle, { color: colors.text }]}
            numberOfLines={3}
          >
            {event.title}
          </Text>
        </View>
        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <AnimatedPressable
            style={styles.actionFlex}
            scaleTo={0.97}
            contentStyle={[
              styles.actionButton,
              { borderColor: colors.border, borderRightWidth: 1 },
            ]}
            onPress={() => router.push(`/events/${event.id}`)}
          >
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary} style={styles.actionIcon} />
            <Text
              style={[styles.actionText, { color: colors.primary, fontWeight: "600" }]}
              numberOfLines={1}
            >
              {t("dashboard.manage")}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.actionFlex}
            scaleTo={0.97}
            contentStyle={[
              styles.actionButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => router.push(`/check-in/${event.id}`)}
          >
            <Ionicons name="scan-outline" size={18} color={"#fff"} style={styles.actionIcon} />
            <Text
              style={[styles.actionText, { color: "#fff", fontWeight: "600" }]}
              numberOfLines={1}
            >
              {t("dashboard.scan_ticket")}
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionFlex: {
    flex: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
  },
});
