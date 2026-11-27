import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { computeResponsiveMetrics, ResponsiveMetrics } from "@/utils/responsive";

/** Hook theo dõi kích thước cửa sổ theo thời gian thực (xoay màn hình, chia đôi màn hình, thay đổi cỡ trình duyệt). */
export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(() => computeResponsiveMetrics(width, height), [width, height]);
}

