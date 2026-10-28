import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme";
import { AnimatedPressable, FadeSlideIn } from "@/components/ui/AnimatedPressable";

/** Props của ô tìm kiếm: giá trị hiện tại, hàm nhận nội dung mới và gợi ý nhập (tùy chọn). */
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** Ô nhập tìm kiếm có biểu tượng kính lúp, dùng ở danh sách sự kiện. */
export function SearchBar({ value, onChangeText, placeholder = "Tìm kiếm..." }: SearchBarProps) {
  const { colors } = useAppTheme();

  return (
    <FadeSlideIn distance={-8} duration={200}>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoFocus
        />
        {value.length > 0 && (
          <AnimatedPressable scaleTo={0.85} onPress={() => onChangeText("")}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </AnimatedPressable>
        )}
      </View>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
});
