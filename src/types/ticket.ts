/** Kết quả check-in: hợp lệ, không hợp lệ, đã check-in trước đó hoặc đã hết hạn. */
export type CheckInStatus = "VALID" | "INVALID" | "ALREADY_CHECKED_IN" | "EXPIRED";

/** Thông tin vé hiển thị sau khi quét: mã, sự kiện, loại vé, người giữ vé, chỗ ngồi và trạng thái sử dụng. */
export interface TicketInfo {
  ticketCode: string;
  eventName: string;
  ticketType: "VIP" | "STANDARD" | "GENERAL_ADMISSION";
  holderName: string;
  holderPhone?: string;
  seatNumber?: string;
  gateName?: string;
  status: "USED" | "UNUSED" | "CANCELLED";
  checkInTimestamp?: string;
}

/** Phản hồi của lần quét vé: kết quả, thông điệp, thông tin vé (nếu có) và thời điểm quét. */
export interface ScanResultResponse {
  success: boolean;
  status: CheckInStatus;
  message: string;
  ticket?: TicketInfo;
  scannedAt: string;
}
