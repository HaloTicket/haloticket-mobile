import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { EventData } from "@/types/event";
import { useTranslation } from "react-i18next";

interface EventCardProps {
  event: EventData;
}

export function EventCard({ event }: EventCardProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardContent}>
        <Image source={{ uri: event.image }} style={styles.eventImage} />
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={3}>
          {event.title}
        </Text>
      </View>
      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.actionButton, { borderColor: colors.border, borderRightWidth: 1 }]}
          onPress={() => router.push(`/events/${event.id}`)}
        >
          <Ionicons name="stats-chart-outline" size={18} color={colors.textSecondary} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t("dashboard.manage")}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/check-in/${event.id}`)}
        >
          <Ionicons name="scan-outline" size={18} color={"#fff"} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: "#fff", fontWeight: "600" }]}>{t("dashboard.scan_ticket")}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
