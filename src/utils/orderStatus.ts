// Trạng thái đơn đặt vé đúng như booking-service gửi (enum BookingStatus). Trạng thái app chưa biết được hiển thị nguyên như nhận được.
/** Mức độ nhấn màu của trạng thái đơn: thành công, cảnh báo, nguy hiểm hoặc trung tính. */
export type OrderTone = "success" | "warning" | "danger" | "neutral";

/** Thông tin hiển thị của một trạng thái đơn: khóa dịch nhãn (null nếu không biết) và mức độ nhấn màu. */
export interface OrderStatusInfo {
  labelKey: string | null;
  tone: OrderTone;
}

/** Bảng ánh xạ các trạng thái đơn đã biết sang khóa dịch và mức độ nhấn màu. */
const KNOWN: Record<string, OrderStatusInfo> = {
  PENDING: { labelKey: "dashboard.order_status_pending", tone: "warning" },
  PAID: { labelKey: "dashboard.order_status_paid", tone: "success" },
  CONFIRMED: { labelKey: "dashboard.order_status_confirmed", tone: "success" },
  CANCELLED: { labelKey: "dashboard.order_status_cancelled", tone: "danger" },
  EXPIRED: { labelKey: "dashboard.order_status_expired", tone: "neutral" },
  REFUNDED: { labelKey: "dashboard.order_status_refunded", tone: "neutral" },
};

/** Tra cứu thông tin hiển thị của trạng thái đơn (không phân biệt hoa thường); trạng thái lạ trả về nhãn null và mức trung tính. */
export function orderStatusInfo(status: unknown): OrderStatusInfo {
  const key = typeof status === "string" ? status.toUpperCase() : "";
  return KNOWN[key] ?? { labelKey: null, tone: "neutral" };
}
