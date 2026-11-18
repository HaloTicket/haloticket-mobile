/** Nhân viên soát vé: vai trò và sự kiện, cổng được phân công. */
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "GATEKEEPER" | "SUPERVISOR" | "ADMIN";
  assignedEventId?: string;
  assignedGate?: string;
}

/** Thông tin một cổng soát vé và số lượt đã check-in qua cổng đó. */
export interface GateInfo {
  id: string;
  name: string;
  zone: string;
  totalCheckedIn: number;
}
