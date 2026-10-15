import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated, Image, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View,
  type ViewProps, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/theme";

const size = 54;
const aiLogo = require("../../../assets/logo-ai.png");
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function CheckinAssistantLauncher({ onPress, onDock, onTabs, onScanner, hidden }: {
  onPress: (y: number) => void;
  onDock: (side: "left" | "right") => void;
  onTabs: boolean;
  onScanner: boolean;
  hidden: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const left = insets.left + 10;
  const right = Math.max(left, width - insets.right - size - 10);
  const top = insets.top + 12;
  const bottom = Math.max(top, height - size - Math.max(insets.bottom + 12, onTabs ? 74 : 18));
  const defaultY = onScanner ? Math.min(bottom, Math.max(top, insets.top + 105)) : bottom;
  const point = useRef(new Animated.ValueXY()).current;
  const position = useRef<{ side: "left" | "right"; fraction: number } | null>(null);
  const [side, setSide] = useState<"left" | "right">("right");
  const [hovered, setHovered] = useState(false);
  const suppressPress = useRef(false);
  const label = t("checkinAssistant.open");

  useLayoutEffect(() => {
    onDock("right");
  }, [onDock]);

  useLayoutEffect(() => {
    point.stopAnimation();
    point.setValue({
      x: position.current?.side === "left" ? left : right,
      y: position.current ? top + (bottom - top) * position.current.fraction : defaultY,
    });
  }, [point, left, right, top, bottom, defaultY]);

  const gestures = useMemo(() => {
    let origin = { x: 0, y: 0 };
    const move = (dx: number, dy: number) => ({
      x: clamp(origin.x + dx, left, right),
      y: clamp(origin.y + dy, top, bottom),
    });
    const dock = (dx: number, dy: number) => {
      const { x, y } = move(dx, dy);
      const edge = x <= (left + right) / 2 ? "left" : "right";
      position.current = { side: edge, fraction: bottom === top ? 0 : (y - top) / (bottom - top) };
      setSide(edge);
      onDock(edge);
      Animated.spring(point, {
        toValue: { x: edge === "left" ? left : right, y },
        overshootClamping: true, useNativeDriver: false,
      }).start();
    };
    const start = () => {
      setHovered(false);
      point.stopAnimation(value => { origin = value; });
    };
    if (Platform.OS === "web") {
      let pointer: { id: number; x: number; y: number; delta?: { x: number; y: number } } | null = null;
      const end: ViewProps["onPointerUp"] = ({ nativeEvent, type }) => {
        if (!pointer || nativeEvent.pointerId !== pointer.id) return;
        if (pointer.delta) {
          const { x, y } = type === "pointerup"
            ? { x: nativeEvent.clientX - pointer.x, y: nativeEvent.clientY - pointer.y } : pointer.delta;
          dock(x, y);
          setTimeout(() => { suppressPress.current = false; }, 0);
        }
        pointer = null;
      };
      return {
        onPointerDown: ({ nativeEvent, target }) => {
          if (nativeEvent.button !== 0 || pointer) return;
          suppressPress.current = false;
          pointer = { id: nativeEvent.pointerId, x: nativeEvent.clientX, y: nativeEvent.clientY };
          (target as unknown as HTMLElement).setPointerCapture?.(pointer.id);
          point.stopAnimation(value => { origin = value; });
        },
        onPointerMove: ({ nativeEvent }) => {
          if (!pointer || nativeEvent.pointerId !== pointer.id) return;
          const dx = nativeEvent.clientX - pointer.x;
          const dy = nativeEvent.clientY - pointer.y;
          if (!pointer.delta && Math.hypot(dx, dy) <= 7) return;
          pointer.delta = { x: dx, y: dy };
          suppressPress.current = true;
          setHovered(false);
          point.setValue(move(dx, dy));
        },
        onPointerUp: end,
        onPointerCancel: end,
      } satisfies ViewProps;
    }
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => Math.hypot(dx, dy) > 7,
      onPanResponderGrant: start,
      onPanResponderMove: (_, { dx, dy }) => point.setValue(move(dx, dy)),
      onPanResponderRelease: (_, { dx, dy }) => dock(dx, dy),
      onPanResponderTerminate: (_, { dx, dy }) => dock(dx, dy),
    }).panHandlers;
  }, [point, left, right, top, bottom, onDock]);

  return (
    <Animated.View {...gestures} pointerEvents={hidden ? "none" : "auto"} accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"} style={[styles.floating, {
      opacity: hidden ? 0 : 1,
      transform: point.getTranslateTransform(),
    }, Platform.OS === "web" && ({ touchAction: "none" } as ViewStyle)]}>
      {hovered && !hidden && (
        <View pointerEvents="none" style={[styles.tooltip, side === "left" ? { left: size + 8 } : { right: size + 8 }]}>
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => {
        if (!suppressPress.current) {
          setHovered(false);
          point.stopAnimation(({ y }) => onPress(y));
        }
        suppressPress.current = false;
      }} onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)} style={({ pressed }) => [
          styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
        ]}>
        <Image source={aiLogo} style={styles.logo} resizeMode="contain" />
        <View style={[styles.dot, { borderColor: colors.primary }]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floating: { position: "absolute", left: 0, top: 0, zIndex: 30 },
  button: {
    width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
    elevation: 8, boxShadow: "0px 5px 16px #0004",
  },
  dot: { position: "absolute", top: 3, right: 3, width: 12, height: 12, borderWidth: 2, borderRadius: 6, backgroundColor: "#4ADE80" },
  logo: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff" },
  tooltip: { position: "absolute", top: 11, width: 180, backgroundColor: "#172554", padding: 8, borderRadius: 8 },
  tooltipText: { color: "#fff", fontSize: 12, textAlign: "center" },
});
