import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";

export * from "./colors";
export * from "./ThemeProvider";

/** Hook trả về trạng thái giao diện hiện tại (bảng màu, chế độ sáng/tối và hàm đổi giao diện). */
export const useAppTheme = () => {
  return useContext(ThemeContext);
};
