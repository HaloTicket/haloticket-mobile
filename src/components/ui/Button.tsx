import React from "react";
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from "react-native";
import { useAppTheme } from "@/theme";

/** Props của nút: tiêu đề và biến thể màu, cộng mọi prop của `TouchableOpacity`. */
interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger";
}

/** Nút bấm dùng chung với 3 biến thể màu: `primary` (mặc định), `secondary` và `danger`. */
export const Button: React.FC<ButtonProps> = ({ title, variant = "primary", style, ...props }) => {
  const { colors } = useAppTheme();

  /** Trả về màu nền theo biến thể của nút. */
  const getBgColor = () => {
    switch (variant) {
      case "secondary":
        return colors.secondary;
      case "danger":
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: getBgColor() }, style]}
      activeOpacity={0.8}
      {...props}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
