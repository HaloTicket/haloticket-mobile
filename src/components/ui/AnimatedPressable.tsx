import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import React, { useRef, useEffect } from "react";
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tỷ lệ thu nhỏ khi nhấn giữ (mặc định 0.96). */
  scaleTo?: number;
  /** Độ mờ khi nhấn giữ (mặc định 0.88). */
  activeOpacity?: number;
}

/** Nút tương tác có phản hồi lò xo (scale + opacity) chạy trên native driver để mượt ở 60fps. */
export function AnimatedPressable({
  children,
  style,
  contentStyle,
  scaleTo = 0.96,
  activeOpacity = 0.88,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn: PressableProps["onPressIn"] = (event) => {
    if (!disabled) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: scaleTo,
          speed: 40,
          bounciness: 4,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: activeOpacity,
          duration: 90,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]).start();
    }
    onPressIn?.(event);
  };

  const handlePressOut: PressableProps["onPressOut"] = (event) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        speed: 28,
        bounciness: 8,
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]).start();
    onPressOut?.(event);
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
      {...rest}
    >
      <Animated.View
        style={[
          contentStyle,
          {
            opacity: disabled ? 0.6 : opacity,
            transform: [{ scale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface FadeSlideInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  distance?: number;
  duration?: number;
}

/** Khối nội dung xuất hiện mượt bằng hiệu ứng mờ dần kết hợp trượt nhẹ theo trục Y. */
export function FadeSlideIn({
  children,
  style,
  delay = 0,
  distance = 12,
  duration = 260,
}: FadeSlideInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

