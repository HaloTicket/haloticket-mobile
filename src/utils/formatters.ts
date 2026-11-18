/** Định dạng ngày giờ cho nhật ký check-in theo locale vi-VN (giờ:phút:giây - ngày/tháng/năm); thiếu giá trị thì trả về `--:--`. */
export const formatScanDateTime = (dateString?: string): string => {
  if (!dateString) return "--:--";
  const date = new Date(dateString);
  return `${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} - ${date.toLocaleDateString("vi-VN")}`;
};

/** Chuẩn hóa mã vé để hiển thị: bỏ khoảng trắng hai đầu và viết hoa. */
export const formatTicketCode = (code: string): string => {
  return code.toUpperCase().trim();
};
