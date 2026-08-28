export type CheckInStatus = "VALID" | "INVALID" | "ALREADY_CHECKED_IN" | "EXPIRED";

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

export interface ScanResultResponse {
  success: boolean;
  status: CheckInStatus;
  message: string;
  ticket?: TicketInfo;
  scannedAt: string;
}
