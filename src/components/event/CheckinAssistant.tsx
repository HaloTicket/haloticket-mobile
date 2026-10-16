import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import axiosClient from "@/services/api/axiosClient";
import { useAppTheme } from "@/theme";
import { useCheckinVoice } from "@/hooks/useCheckinVoice";
import type { EventData } from "@/types/event";
import type { AssistantScope } from "./CheckinAssistantContext";

const mark = require("../../../assets/logo-ai.png");
const messageLimit = 1600;
const guideKeys = ["used", "wrongScope", "locked", "window", "access", "camera", "network"] as const;

type Props = AssistantScope & { open: boolean; side: "left" | "right"; anchorY: number; onClose: () => void };
type Turn = { role: "user" | "assistant"; content: string };
type Message = Turn & { time: Date };
type Counts = { total: number; checkedIn: number };
type Summary = Counts & { eventId: string; byShowtime: (Counts & { id: string | null })[] };
type AssignedEvent = { id: string; title?: string };
type Panel = "chat" | "stats" | "guide";

export function CheckinAssistant({ eventId, showtimeId, eventTitle, showtimeTitle, open, side, anchorY, onClose }: Props) {
  const { colors, isDark } = useAppTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const expansion = useRef(new Animated.Value(0)).current;
  const [panel, setPanel] = useState<Panel>("chat");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<Counts | null>(null);
  const [statsError, setStatsError] = useState("");
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
  const [statsEvent, setStatsEvent] = useState("");
  const chatRequest = useRef<AbortController | null>(null);
  const statsRequest = useRef<AbortController | null>(null);
  const chatScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en" : "vi";
  const text = (key: string) => t(`checkinAssistant.${key}`);
  const appendTranscript = useCallback((transcript: string) => {
    setDraft(previous => [previous.trimEnd(), transcript].filter(Boolean).join(" ").slice(0, messageLimit));
  }, []);
  const voice = useCheckinVoice(open && panel === "chat", locale === "vi" ? "vi-VN" : "en-US", appendTranscript);
  const voiceActive = voice.phase !== "idle";

  useEffect(() => () => {
    chatRequest.current?.abort();
    statsRequest.current?.abort();
  }, []);

  const close = () => {
    voice.cancel();
    Keyboard.dismiss();
    onClose();
  };

  useEffect(() => {
    const animation = Animated.timing(expansion, { toValue: expanded ? 1 : 0, duration: 200, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [expanded, expansion]);

  async function send() {
    const content = draft.trim();
    if (!content || chatRequest.current || voiceActive) return;
    const controller = new AbortController();
    chatRequest.current = controller;
    const turn = { role: "user", content, time: new Date() } as const;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, messageLimit) }));
    setDraft("");
    setChatError("");
    setSending(true);
    setMessages([...messages, turn]);
    try {
      const { reply } = await axiosClient.post<unknown, { reply: string }>("/organizer/checkin-chat", {
        event_id: eventId || null, showtime_id: showtimeId || null, locale, message: content, history,
      }, { signal: controller.signal, skipGlobalError: true, timeout: 60000 });
      if (typeof reply !== "string" || !reply.trim()) throw new Error("Empty assistant reply");
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous, { role: "assistant", content: reply, time: new Date() }]);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setChatError(status === 403 ? "accessError" : status === 429 ? "rateLimit" : "chatError");
      setMessages(previous => previous.filter(message => message !== turn));
      setDraft(previous => previous || content);
    } finally {
      if (chatRequest.current === controller) chatRequest.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  async function loadStats({ targetEvent = eventId || statsEvent, refreshAssignments = false } = {}) {
    statsRequest.current?.abort();
    const controller = new AbortController();
    statsRequest.current = controller;
    setStats(null);
    setStatsError("");
    setLoadingStats(true);
    try {
      if (!eventId && refreshAssignments) {
        setAssignedEvents([]);
        const events = await axiosClient.get<unknown, EventData[]>("/events/my-events", {
          signal: controller.signal, skipGlobalError: true,
        });
        if (!Array.isArray(events)) throw new Error("Invalid assigned events");
        if (controller.signal.aborted) return;
        const assigned = events.filter((event): event is EventData & { id: string } =>
          typeof event?.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(event.id));
        setAssignedEvents(assigned);
        if (targetEvent && !assigned.some(event => event.id === targetEvent)) {
          setStatsEvent("");
          return;
        }
      }
      if (!targetEvent) return;
      const summary = await axiosClient.get<unknown, Summary>(
        `/tickets/checkin/events/${encodeURIComponent(targetEvent)}/summary`,
        { signal: controller.signal, skipGlobalError: true },
      );
      if (controller.signal.aborted) return;
      if (summary.eventId !== targetEvent) throw new Error("Unexpected event summary");
      let counts: Counts | undefined = showtimeId ? summary.byShowtime.find(group => group.id === showtimeId) : summary;
      if (!counts && showtimeId) {
        const event = await axiosClient.get<unknown, Pick<EventData, "id" | "showtimes">>(
          `/events/${encodeURIComponent(targetEvent)}`, { signal: controller.signal, skipGlobalError: true },
        );
        if (controller.signal.aborted) return;
        if (event.id === targetEvent && event.showtimes?.some(showtime => showtime.id === showtimeId)) {
          counts = { total: 0, checkedIn: 0 };
        }
      }
      if (!counts) {
        setStatsError("noShowtimeStats");
      } else if (Number.isSafeInteger(counts.total) && counts.total >= 0 &&
                 Number.isSafeInteger(counts.checkedIn) && counts.checkedIn >= 0) {
        setStats(counts);
      } else {
        throw new Error("Invalid check-in counts");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatsError(isAxiosError(error) && error.response?.status === 403 ? "accessError" : "statsError");
    } finally {
      if (statsRequest.current === controller) {
        statsRequest.current = null;
        if (!controller.signal.aborted) setLoadingStats(false);
      }
    }
  }

  function choosePanel(next: Panel) {
    setPanel(next);
    if (next !== "chat") {
      voice.cancel();
      Keyboard.dismiss();
    }
  }

  useEffect(() => {
    if (open && panel === "stats") void loadStats({ refreshAssignments: true });
    return () => statsRequest.current?.abort();
  }, [open, panel, eventId, showtimeId]);

  const scope = showtimeTitle || text(eventId ? (showtimeId ? "selectedShowtime" : "wholeEvent") : "assignedScope");
  const wide = width > 600;
  const below = wide && !expanded && anchorY + 27 < height / 2;
  const top = Math.max(14, insets.top);
  const availableHeight = height - top;
  const compactHeight = Math.min(690, height * 0.83);
  const dockInset = wide ? Math.max(0, Math.min(availableHeight - compactHeight, below ? anchorY + 60 - top : height - anchorY + 6)) : 0;
  return (
      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modal, { paddingTop: top }, wide && {
            paddingHorizontal: 10, alignItems: side === "left" ? "flex-start" : "flex-end",
            justifyContent: below ? "flex-start" : "flex-end",
            paddingTop: top + (below ? dockInset : 0), paddingBottom: !below && !expanded ? dockInset : 0,
          }]}
        >
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close} />
          <Animated.View accessibilityViewIsModal style={[styles.sheet, {
            backgroundColor: colors.surface, paddingBottom: Math.max(12, insets.bottom),
            maxHeight: expansion.interpolate({
              inputRange: [0, 1], outputRange: [compactHeight, availableHeight],
            }),
          }]}>
            <View style={[styles.header, { backgroundColor: isDark ? "#1E40AF" : colors.primary }]}>
              <Image source={mark} style={styles.mark} />
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={styles.title}>{text("title")}</Text>
                <Text numberOfLines={1} style={styles.scope}>{[eventTitle, scope].filter(Boolean).join(" · ")}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={text(expanded ? "collapse" : "expand")}
                style={styles.iconButton} onPress={() => setExpanded(previous => !previous)}>
                <Ionicons name={expanded ? "contract-outline" : "expand-outline"} size={20} color="#fff" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={4}
                style={styles.iconButton} onPress={close}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <View style={[styles.actions, { borderBottomColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}
                keyboardShouldPersistTaps="handled">
                {([
                  ["chat", "chatbubble-ellipses-outline"],
                  ["stats", "stats-chart-outline"],
                  ["guide", "help-circle-outline"],
                ] as const).map(([key, icon]) => (
                  <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: panel === key }}
                    onPress={() => choosePanel(key)} style={[styles.pill, {
                      backgroundColor: panel === key ? colors.background : colors.surface,
                      borderColor: panel === key ? colors.primary : colors.border,
                    }]}>
                    <Ionicons name={icon} size={16} color={panel === key ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.pillLabel, { color: colors.text }]}>{text(key)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {panel === "chat" && (
              <>
                <ScrollView ref={chatScroll} style={styles.body} contentContainerStyle={styles.bodyContent}
                  keyboardShouldPersistTaps="handled" onContentSizeChange={() => chatScroll.current?.scrollToEnd()}>
                  <Text style={[styles.copy, { color: colors.textSecondary }]}>{text(eventId ? "welcome" : "assignedWelcome")}</Text>
                  {messages.map((message, index) => (
                    <View key={index} style={[styles.message, message.role === "user"
                      ? { alignSelf: "flex-end", backgroundColor: "#1D4ED8" }
                      : { alignSelf: "flex-start", backgroundColor: colors.background }]}>
                      <Text style={[styles.copy, { color: message.role === "user" ? "#fff" : colors.text }]}>{message.content}</Text>
                      {message.role === "user" && (
                        <Text style={styles.time}>{message.time.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</Text>
                      )}
                    </View>
                  ))}
                  {sending && <TypingDots label={text("typing")} />}
                  {!!chatError && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{text(chatError)}</Text>}
                </ScrollView>
                {!sending && !voiceActive && (
                  <View style={styles.suggestions}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionRow} keyboardShouldPersistTaps="handled">
                      {[eventId ? "suggestStats" : "suggestAssigned", "suggestDuplicate"].map(key => (
                        <Pressable key={key} accessibilityRole="button" onPress={() => setDraft(text(key))}
                          style={[styles.pill, { borderColor: colors.border }]}>
                          <Text style={[styles.pillLabel, { color: colors.primary }]}>{text(key)}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {(voiceActive || voice.error) && (
                  <Text accessibilityLiveRegion="polite" style={[styles.voiceStatus, {
                    color: voice.error ? colors.danger : colors.textSecondary,
                  }]}>
                    {text(voice.error ?? (voice.phase === "starting" ? "voiceStarting" :
                      voice.phase === "stopping" ? "voiceStopping" : "voiceListening"))}
                  </Text>
                )}
                <View style={[styles.composer, { borderTopColor: colors.border }]}>
                  <TextInput
                    value={draft} onChangeText={setDraft} editable={!sending} maxLength={messageLimit} multiline
                    accessibilityLabel={text("placeholder")} placeholder={text("placeholder")}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel={text(voiceActive ? "stopVoice" : "startVoice")}
                    accessibilityState={{ selected: voiceActive }} disabled={sending || voice.phase === "stopping"}
                    onPress={() => {
                      Keyboard.dismiss();
                      void voice.toggle();
                    }}
                    style={[styles.iconButton, {
                      backgroundColor: voiceActive ? colors.danger : colors.background, opacity: sending ? 0.5 : 1,
                    }]}>
                    <Ionicons name={voiceActive ? "stop-circle-outline" : "mic-outline"} size={23}
                      color={voiceActive ? "#fff" : colors.primary} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={text("send")} onPress={send}
                    disabled={sending || voiceActive || !draft.trim()}
                    style={[styles.iconButton, { backgroundColor: colors.primary, opacity: sending || voiceActive || !draft.trim() ? 0.5 : 1 }]}>
                    <Ionicons name="send" size={19} color="#fff" />
                  </Pressable>
                </View>
              </>
            )}
            {panel === "stats" && (
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{text("statsTitle")}</Text>
                {!eventId && assignedEvents.length > 0 && (
                  <View>
                    <Text style={[styles.copy, { color: colors.textSecondary }]}>{text("chooseEvent")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRow}>
                      {assignedEvents.map(event => (
                        <Pressable key={event.id} accessibilityRole="button" accessibilityState={{ selected: statsEvent === event.id }}
                          onPress={() => {
                            setStatsEvent(event.id);
                            void loadStats({ targetEvent: event.id });
                          }} style={[styles.pill, {
                            maxWidth: 280, borderColor: statsEvent === event.id ? colors.primary : colors.border,
                          }]}>
                          <Text numberOfLines={2} style={[styles.pillLabel, { flexShrink: 1, color: colors.text }]}>{event.title || event.id}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {!eventId && !loadingStats && !statsError && assignedEvents.length === 0 && (
                  <Text style={[styles.copy, { color: colors.textSecondary }]}>{text("noAssignedEvents")}</Text>
                )}
                {loadingStats && <ActivityIndicator color={colors.primary} accessibilityLabel={text("loadingStats")} />}
                {!!statsError && <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: colors.textSecondary }]}>{text(statsError)}</Text>}
                {stats && [
                  ["total", stats.total], ["checkedIn", stats.checkedIn], ["remaining", Math.max(0, stats.total - stats.checkedIn)],
                ].map(([key, value]) => (
                  <View key={key} style={[styles.metric, { backgroundColor: colors.background }]}>
                    <Text style={[styles.copy, { color: colors.text }]}>{text(String(key))}</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{value.toLocaleString(locale)}</Text>
                  </View>
                ))}
                {!loadingStats && (
                  <Pressable accessibilityRole="button" style={[styles.pill, styles.refresh, { borderColor: colors.border }]}
                    onPress={() => loadStats({ refreshAssignments: true })}>
                    <Ionicons name="refresh" size={17} color={colors.primary} />
                    <Text style={[styles.pillLabel, { color: colors.text }]}>{text("refresh")}</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
            {panel === "guide" && (
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{text("guideTitle")}</Text>
                {guideKeys.map(key => (
                  <View key={key} style={[styles.guideItem, { backgroundColor: colors.background }]}>
                    <Text style={[styles.pillLabel, { color: colors.text }]}>{text(`guides.${key}.title`)}</Text>
                    <Text style={[styles.copy, { color: colors.textSecondary }]}>{text(`guides.${key}.detail`)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
  );
}

function TypingDots({ label }: { label: string }) {
  const { colors } = useAppTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1050, useNativeDriver: USE_NATIVE_ANIMATION_DRIVER }));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite"
      style={[styles.typing, { backgroundColor: colors.background }]}>
      {[0, 1, 2].map(index => (
        <Animated.View key={index} style={[styles.typingDot, {
          backgroundColor: colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 0.2 + index * 0.22, 1], outputRange: [0.35, 1, 0.35] }),
        }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "#02061780" },
  sheet: { width: "100%", maxWidth: 560, flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  mark: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff" },
  heading: { flex: 1, gap: 3 },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  scope: { color: "#DBEAFE", fontSize: 13 },
  iconButton: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actions: { borderBottomWidth: StyleSheet.hairlineWidth },
  actionRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  eventRow: { paddingVertical: 8, gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderRadius: 22 },
  pillLabel: { fontSize: 14, fontWeight: "600" },
  body: { flex: 1 },
  bodyContent: { padding: 14, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  message: { maxWidth: "91%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 4 },
  copy: { fontSize: 15, lineHeight: 22 },
  time: { alignSelf: "flex-end", fontSize: 11, color: "#DBEAFE" },
  typing: { flexDirection: "row", alignSelf: "flex-start", borderRadius: 14, padding: 12, gap: 5 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },
  suggestions: { flexShrink: 0 },
  suggestionRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  voiceStatus: { paddingHorizontal: 14, paddingBottom: 8, fontSize: 13 },
  composer: { flexDirection: "row", alignItems: "flex-end", paddingTop: 10, paddingHorizontal: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  metric: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 12, gap: 10 },
  metricValue: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  refresh: { alignSelf: "flex-start" },
  guideItem: { borderRadius: 12, padding: 12, gap: 4 },
});
