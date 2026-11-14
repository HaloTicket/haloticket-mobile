import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/theme";
import { getPasswordRules, isPasswordValid } from "@/utils/passwordRules";

interface PasswordRequirementsCardProps {
  password: string;
  /** Truyền mật khẩu xác nhận để hiển thị thêm tiêu chí kiểm tra khớp mật khẩu. */
  confirmPassword?: string;
}

/**
 * Khung kiểm tra điều kiện mật khẩu (đồng bộ 100% với haloticket-web):
 * 8–32 ký tự, chữ thường + số, ký tự đặc biệt, chữ in hoa và kiểm tra khớp mật khẩu xác nhận.
 */
export function PasswordRequirementsCard({
  password,
  confirmPassword,
}: PasswordRequirementsCardProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();

  const rules = getPasswordRules(password);
  const passwordValid = isPasswordValid(password);
  const checkMatch = confirmPassword !== undefined;
  const passwordsMatch =
    password.length > 0 && confirmPassword !== undefined && confirmPassword.length > 0 && password === confirmPassword;
  const allMet = passwordValid && (!checkMatch || passwordsMatch);

  const metIconColor = isDark ? "#4ADE80" : "#16A34A";
  const metTextColor = isDark ? "#86EFAC" : "#15803D";
  const unmetColor = isDark ? "#FB7185" : "#E11D48";

  const items = [
    { key: "length", met: rules.hasValidLength, label: t("auth.password_rule_length") },
    { key: "lower_num", met: rules.hasLowercaseAndNumber, label: t("auth.password_rule_lower_num") },
    { key: "special", met: rules.hasSpecialCharacter, label: t("auth.password_rule_special") },
    { key: "upper", met: rules.hasUppercase, label: t("auth.password_rule_upper") },
    ...(checkMatch
      ? [{ key: "match", met: passwordsMatch, label: t("auth.password_rule_match") }]
      : []),
  ];

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: isDark
            ? allMet
              ? "rgba(22, 163, 74, 0.14)"
              : "rgba(225, 29, 72, 0.13)"
            : allMet
              ? "rgba(22, 163, 74, 0.08)"
              : "rgba(225, 29, 72, 0.05)",
          borderColor: allMet ? "rgba(34, 197, 94, 0.48)" : "rgba(244, 63, 94, 0.42)",
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons
          name={allMet ? "checkmark-circle" : "close-circle"}
          size={17}
          color={allMet ? metIconColor : unmetColor}
        />
        <Text
          style={[
            styles.headerText,
            { color: allMet ? metTextColor : unmetColor },
          ]}
        >
          {allMet ? t("auth.password_valid") : t("auth.password_invalid")}
        </Text>
      </View>

      {items.map((item) => (
        <View key={item.key} style={styles.ruleRow}>
          <Ionicons
            name={item.met ? "checkmark-circle" : "close-circle"}
            size={15}
            color={item.met ? metIconColor : unmetColor}
          />
          <Text
            style={[
              styles.ruleText,
              {
                color: item.met ? metTextColor : isDark ? "#CBD5E1" : colors.text,
              },
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  headerText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  ruleText: {
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
  },
});

