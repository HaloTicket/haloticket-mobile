export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "GATEKEEPER" | "SUPERVISOR" | "ADMIN";
  assignedEventId?: string;
  assignedGate?: string;
}

export interface GateInfo {
  id: string;
  name: string;
  zone: string;
  totalCheckedIn: number;
}
