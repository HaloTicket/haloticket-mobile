import { USE_NATIVE_ANIMATION_DRIVER } from "@/utils/animationDriver";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useAppTheme } from "@/theme";
import { ScreenBackground } from "@/components/layout/ScreenBackground";
import { useResponsive } from "@/hooks/useResponsive";

const HALO_LOGO_LIGHT = require("../../../assets/haloticket-logo.png");
const HALO_LOGO_DARK = require("../../../assets/haloticket-logo-dark.png");

const TRACK_HEIGHT = 20;
const INNER_HEIGHT = TRACK_HEIGHT - 4;
const STAR_SIZE = 34;

interface AppSplashScreenProps {
  /** Ứng dụng đã nạp xong font & khôi phục phiên đăng nhập chưa. */
  isAppReady: boolean;
  /** Gọi khi thanh tiến trình đạt 100% và màn hình khởi động mờ dần xong. */
  onFinish: () => void;
}

/** Dải màu xanh cyan → xanh dương → tím kèm vân sóng chéo và ánh bóng cho thanh tiến trình. */
function WaveGradientFill({ width }: { width: number }) {
  return (
    <Svg width={width} height={INNER_HEIGHT} viewBox={`0 0 ${width} ${INNER_HEIGHT}`}>
      <Defs>
        <LinearGradient id="splashBarGrad" x1="0" y1="0.5" x2="1" y2="0.5">
          <Stop offset="0%" stopColor="#1EF2FF" />
          <Stop offset="26%" stopColor="#0BB8FF" />
          <Stop offset="52%" stopColor="#1D6BFF" />
          <Stop offset="76%" stopColor="#6D3BFF" />
          <Stop offset="92%" stopColor="#C84BFF" />
          <Stop offset="100%" stopColor="#FF9BFF" />
        </LinearGradient>
        <LinearGradient id="splashBarGloss" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.62" />
          <Stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Nền chuyển sắc xanh nhẹ → xanh đậm → tím hồng */}
      <Rect x="0" y="0" width={width} height={INNER_HEIGHT} rx={INNER_HEIGHT / 2} fill="url(#splashBarGrad)" />

      {/* Các dải vân sóng uốn lượn mềm trên thanh tiến trình */}
      <Path
        d={`M -10 ${INNER_HEIGHT} C 28 3, 62 ${INNER_HEIGHT - 2}, 102 4 C 138 ${INNER_HEIGHT}, 178 2, 222 ${INNER_HEIGHT - 3} C 244 4, 256 2, ${width + 10} 8 L ${width + 10} ${INNER_HEIGHT + 4} L -10 ${INNER_HEIGHT + 4} Z`}
        fill="#FFFFFF"
        fillOpacity="0.18"
      />
      <Path
        d={`M 18 0 L 42 0 L 28 ${INNER_HEIGHT} L 4 ${INNER_HEIGHT} Z M 68 0 L 94 0 L 78 ${INNER_HEIGHT} L 52 ${INNER_HEIGHT} Z M 120 0 L 146 0 L 130 ${INNER_HEIGHT} L 104 ${INNER_HEIGHT} Z M 172 0 L 198 0 L 182 ${INNER_HEIGHT} L 156 ${INNER_HEIGHT} Z M 220 0 L 246 0 L 232 ${INNER_HEIGHT} L 206 ${INNER_HEIGHT} Z`}
        fill="#E0F2FE"
        fillOpacity="0.16"
      />
      <Path
        d={`M 0 ${INNER_HEIGHT * 0.68} Q 65 ${INNER_HEIGHT * 0.25}, 130 ${INNER_HEIGHT * 0.62} T ${width} ${INNER_HEIGHT * 0.45}`}
        stroke="#FFFFFF"
        strokeOpacity="0.34"
        strokeWidth="2.2"
        fill="none"
      />

      {/* Ánh bóng nổi phía trên thanh */}
      <Rect x="4" y="1.5" width={width - 8} height={INNER_HEIGHT * 0.46} rx={INNER_HEIGHT * 0.23} fill="url(#splashBarGloss)" />
    </Svg>
  );
}

/** Ngôi sao vàng kèm 3 tia sáng tỏa phía trên-phải giống thiết kế. */
function FlyingStarIcon({ isDark }: { isDark: boolean }) {
  const rayFill = "#FFFFFF";
  const rayStroke = isDark ? "#3B82F6" : "#1D4ED8";
  return (
    <Svg width={46} height={46} viewBox="0 0 46 46">
      <Defs>
        <LinearGradient id="starGrad" x1="0.1" y1="0" x2="0.85" y2="1">
          <Stop offset="0%" stopColor="#FFFAA8" />
          <Stop offset="48%" stopColor="#FFD82B" />
          <Stop offset="100%" stopColor="#FF9600" />
        </LinearGradient>
      </Defs>
      {/* 3 tia sáng trắng viền xanh phía trên ngôi sao */}
      <Path d="M22 4 L22.5 11.5" stroke={rayStroke} strokeWidth="4.2" strokeLinecap="round" />
      <Path d="M22 4 L22.5 11.5" stroke={rayFill} strokeWidth="2" strokeLinecap="round" />
      <Path d="M31 6.5 L28 13" stroke={rayStroke} strokeWidth="4.2" strokeLinecap="round" />
      <Path d="M31 6.5 L28 13" stroke={rayFill} strokeWidth="2" strokeLinecap="round" />
      <Path d="M39 12.5 L33 17.5" stroke={rayStroke} strokeWidth="4.2" strokeLinecap="round" />
      <Path d="M39 12.5 L33 17.5" stroke={rayFill} strokeWidth="2" strokeLinecap="round" />

      {/* Ngôi sao vàng 5 cánh bo mềm */}
      <Path
        d="M21 15.5 L24.5 22.4 L32.1 23.5 L26.6 28.8 L27.9 36.4 L21 32.8 L14.1 36.4 L15.4 28.8 L9.9 23.5 L17.5 22.4 Z"
        fill="url(#starGrad)"
        stroke="#D97706"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Điểm bóng sáng trong lòng ngôi sao */}
      <Path
        d="M20.8 18.8 L22.6 22.8 L18.6 26.2 L17.8 23.6 Z"
        fill="#FFFFFF"
        fillOpacity="0.68"
      />
    </Svg>
  );
}

/**
 * Màn hình khởi động (Splash Screen) theo bộ nhận diện HaloTicket:
 * tự đồng bộ theo chế độ sáng/tối của thiết bị, hiển thị logo, nhãn "Event Management"
 * và thanh tiến trình vân sóng chuyển sắc xanh → tím có ngôi sao bay về đích theo nhịp tải thực.
 */
export function AppSplashScreen({ isAppReady, onFinish }: AppSplashScreenProps) {
  const { isDark } = useAppTheme();
  const { splashTrackWidth, isCompact, isLandscape } = useResponsive();
  const trackWidth = splashTrackWidth;
  const innerWidth = trackWidth - 4;
  const logoWidth = isLandscape ? 176 : isCompact ? 196 : 230;
  const logoHeight = Math.round(logoWidth * (144 / 230));
  const [percent, setPercent] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const starTilt = useRef(new Animated.Value(0)).current;
  const starPop = useRef(new Animated.Value(1)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.92)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const reachedHoldRef = useRef(false);
  const finishedRef = useRef(false);
  const isAppReadyRef = useRef(isAppReady);
  isAppReadyRef.current = isAppReady;

  const completeLoading = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.spring(starPop, {
          toValue: 1.24,
          speed: 32,
          bounciness: 12,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.spring(starPop, {
          toValue: 1,
          speed: 26,
          bounciness: 8,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
      Animated.delay(140),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });
  };

  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setPercent(Math.min(100, Math.max(0, Math.round(value * 100))));
    });

    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        speed: 20,
        bounciness: 6,
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]).start();

    const tiltLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(starTilt, {
          toValue: 1,
          duration: 380,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(starTilt, {
          toValue: -1,
          duration: 380,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ])
    );
    tiltLoop.start();

    // Nhịp tải khựng khựng từng chặng giống load thật: 0 -> 18 -> 45 -> 71 -> 90%
    const stagedLoad = Animated.sequence([
      Animated.delay(120),
      Animated.timing(progress, {
        toValue: 0.18,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(160),
      Animated.timing(progress, {
        toValue: 0.45,
        duration: 360,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(250),
      Animated.timing(progress, {
        toValue: 0.71,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(210),
      Animated.timing(progress, {
        toValue: 0.9,
        duration: 360,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(150),
    ]);

    stagedLoad.start(({ finished }) => {
      if (!finished) return;
      reachedHoldRef.current = true;
      if (isAppReadyRef.current) {
        completeLoading();
      }
    });

    return () => {
      progress.removeListener(listenerId);
      tiltLoop.stop();
      stagedLoad.stop();
    };
  }, []);

  useEffect(() => {
    if (isAppReady && reachedHoldRef.current && !finishedRef.current) {
      completeLoading();
    }
  }, [isAppReady]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [14, innerWidth],
  });

  const starTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, trackWidth - 24],
  });

  const starRotate = starTilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-9deg", "9deg"],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: containerOpacity }]}>
      <ScreenBackground>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[
              styles.centerContent,
              {
                marginBottom: isLandscape ? 12 : 44,
                opacity: entranceOpacity,
                transform: [{ scale: entranceScale }],
              },
            ]}
          >
            <Image
              source={isDark ? HALO_LOGO_DARK : HALO_LOGO_LIGHT}
              style={{ width: logoWidth, height: logoHeight, marginBottom: isLandscape ? 8 : 14 }}
              resizeMode="contain"
              fadeDuration={0}
            />

            <View
              style={[
                styles.badge,
                isDark ? styles.badgeDark : styles.badgeLight,
                { marginBottom: isLandscape ? 18 : 36 },
              ]}
            >
              <Text style={[styles.badgeText, { color: isDark ? "#F8FAFC" : "#1B3B7B" }]}>
                Event Management
              </Text>
            </View>

            {/* Thanh tiến trình vân sóng xanh → tím + ngôi sao bay về đích */}
            <View style={styles.progressSection}>
              <View style={[styles.trackAnchor, { width: trackWidth }]}>
                <View
                  style={[
                    styles.trackOuter,
                    { width: trackWidth },
                    isDark ? styles.trackOuterDark : styles.trackOuterLight,
                  ]}
                >
                  <Animated.View style={[styles.trackFillClip, { width: fillWidth }]}>
                    <WaveGradientFill width={innerWidth} />
                  </Animated.View>
                </View>

                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.starWrapper,
                    { transform: [{ translateX: starTranslateX }] },
                  ]}
                >
                  <Animated.View
                    style={{
                      transform: [{ rotate: starRotate }, { scale: starPop }],
                    }}
                  >
                    <FlyingStarIcon isDark={isDark} />
                  </Animated.View>
                </Animated.View>
              </View>

              <Text style={[styles.percentText, { color: isDark ? "#F8FAFC" : "#0A1D44" }]}>
                {percent}%
              </Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </ScreenBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 48,
  },
  logo: {
    width: 230,
    height: 144,
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 38,
  },
  badgeLight: {
    backgroundColor: "#E4EEFE",
  },
  badgeDark: {
    backgroundColor: "rgba(37, 99, 235, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.4)",
  },
  badgeText: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  progressSection: {
    alignItems: "center",
  },
  trackAnchor: {
    height: STAR_SIZE + 14,
    justifyContent: "center",
    position: "relative",
  },
  trackOuter: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 2,
    padding: 0,
    justifyContent: "center",
    overflow: "hidden",
  },
  trackOuterLight: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "#38BDF8",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  trackOuterDark: {
    backgroundColor: "rgba(7, 19, 54, 0.92)",
    borderColor: "#60A5FA",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  trackFillClip: {
    height: INNER_HEIGHT,
    borderRadius: INNER_HEIGHT / 2,
    overflow: "hidden",
  },
  starWrapper: {
    position: "absolute",
    top: -5,
    left: 0,
  },
  percentText: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
});
