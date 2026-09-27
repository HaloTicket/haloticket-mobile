import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";

export * from "./colors";
export * from "./ThemeProvider";

export const useAppTheme = () => {
  return useContext(ThemeContext);
};
