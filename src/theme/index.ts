import { useColorScheme } from "react-native";
import { Colors } from "./colors";

export * from "./colors";

export const useAppTheme = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return { scheme, isDark, colors };
};
