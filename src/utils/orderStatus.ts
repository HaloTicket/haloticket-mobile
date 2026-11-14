// Booking statuses as booking-service sends them (BookingStatus enum). A status this app does not know is shown as it came.
export type OrderTone = "success" | "warning" | "danger" | "neutral";

export interface OrderStatusInfo {
  labelKey: string | null;
  tone: OrderTone;
}

const KNOWN: Record<string, OrderStatusInfo> = {
  PENDING: { labelKey: "dashboard.order_status_pending", tone: "warning" },
  PAID: { labelKey: "dashboard.order_status_paid", tone: "success" },
  CONFIRMED: { labelKey: "dashboard.order_status_confirmed", tone: "success" },
  CANCELLED: { labelKey: "dashboard.order_status_cancelled", tone: "danger" },
  EXPIRED: { labelKey: "dashboard.order_status_expired", tone: "neutral" },
  REFUNDED: { labelKey: "dashboard.order_status_refunded", tone: "neutral" },
};

export function orderStatusInfo(status: unknown): OrderStatusInfo {
  const key = typeof status === "string" ? status.toUpperCase() : "";
  return KNOWN[key] ?? { labelKey: null, tone: "neutral" };
}
