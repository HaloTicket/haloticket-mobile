import { Stack, useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useRef, useState } from "react";
import { View, LogBox } from "react-native";
import { ThemeProvider } from "@/theme";
import { ModalProvider } from "@/hooks/useModal";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CheckinAssistant } from "@/components/event/CheckinAssistant";
import { CheckinAssistantLauncher } from "@/components/event/CheckinAssistantLauncher";
import { CheckinAssistantContext, type AssistantScope } from "@/components/event/CheckinAssistantContext";

import "@/locales/i18n"; // khởi tạo i18n

LogBox.ignoreAllLogs(); // ẩn mọi cảnh báo và lỗi khỏi lớp phủ trên màn hình

/**
 * Điều hướng theo trạng thái đăng nhập: chưa đăng nhập thì chuyển về màn hình bắt đầu (Welcome),
 * đã đăng nhập mà đang ở nhóm xác thực thì chuyển sang tab chính. Hiện màn hình khởi động (Splash)
 * khi mở app và cả khi vừa đăng xuất trước khi tự vào màn hình Welcome.
 */
function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const route = useGlobalSearchParams<{ eventId?: string; showtimeId?: string }>();
  const router = useRouter();
  const [dashboardScope, setDashboardScope] = useState<AssistantScope>({});
  const [openScope, setOpenScope] = useState<string | null>(null);
  const [assistantSide, setAssistantSide] = useState<"left" | "right">("right");
  const [assistantAnchorY, setAssistantAnchorY] = useState(0);
  const openScopeRef = useRef<string | null>(null);
  const onScanner = segments[0] === "check-in";
  const onEvent = segments[0] === "events";
  const eventId = (onScanner || onEvent) && typeof route.eventId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(route.eventId)
    ? route.eventId : undefined;
  const scope = onEvent && eventId && dashboardScope.eventId === eventId ? dashboardScope : {
    eventId,
    showtimeId: onScanner && typeof route.showtimeId === "string" ? route.showtimeId : undefined,
  };
  const scopeKey = JSON.stringify([user?.id, eventId, scope.showtimeId || null]);
  const showAssistant = Boolean(isAuthenticated && user?.id && !isLoading && segments[0] !== "(auth)" &&
    (!(onScanner || onEvent) || eventId));
  const assistantOpen = showAssistant && openScope === scopeKey;
  const isAssistantOpen = useCallback(() => openScopeRef.current === scopeKey, [scopeKey]);
  const setAssistantOpen = useCallback((visible: boolean) => {
    openScopeRef.current = visible ? scopeKey : null;
    setOpenScope(openScopeRef.current);
  }, [scopeKey]);

  useEffect(() => {
    if (!showAssistant || openScopeRef.current !== scopeKey) setAssistantOpen(false);
  }, [showAssistant, scopeKey, setAssistantOpen]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <CheckinAssistantContext.Provider value={{ open: assistantOpen, isOpen: isAssistantOpen, setDashboardScope }}>
      <View style={{ flex: 1 }}>
        {!isLoading && (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="notifications" />
          </Stack>
        )}
          />
        )}
        {showAssistant && (
          <>
            <CheckinAssistantLauncher
              key={user?.id}
              onPress={y => {
                setAssistantAnchorY(y);
                setAssistantOpen(true);
              }}
              onDock={setAssistantSide}
              hidden={assistantOpen}
              onTabs={segments[0] === "(tabs)"}
              onScanner={onScanner}
            />
            <CheckinAssistant key={`general-${user?.id}`} side={assistantSide} anchorY={assistantAnchorY}
              open={assistantOpen && !eventId} onClose={() => setAssistantOpen(false)} />
            {eventId && (
              <CheckinAssistant key={scopeKey} {...scope} side={assistantSide} anchorY={assistantAnchorY}
                open={assistantOpen} onClose={() => setAssistantOpen(false)} />
            )}
          </>
        )}
      </View>
    </CheckinAssistantContext.Provider>
  );
}

/** Gốc ứng dụng: nạp phông biểu tượng rồi bọc theme, hộp thoại và xác thực quanh {@code RootLayoutNav}. */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <ModalProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </AuthProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}
