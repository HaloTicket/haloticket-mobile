import type { StaffNotification, StaffNotificationListResponse } from "../types/notification.ts";

/**
 * Chuẩn hóa phản hồi danh sách thông báo từ API về mảng `StaffNotification`
 * và sắp xếp mới nhất lên đầu theo `createdAt`.
 */
export function normalizeStaffNotifications(response: StaffNotificationListResponse): StaffNotification[] {
  let items: unknown[] = [];
  if (Array.isArray(response)) {
    items = response;
  } else if (response && Array.isArray(response.content)) {
    items = response.content;
  } else if (response && Array.isArray(response.data)) {
    items = response.data;
  }

  return items
    .filter((item): item is StaffNotification =>
      item !== null && typeof item === "object" && "id" in item &&
      "visibility" in item && item.visibility === "STAFF"
    )
    .map((item) => ({
      ...item,
      id: String(item.id),
      title: String(item.title ?? ""),
      message: String(item.message ?? ""),
      createdAt: String(item.createdAt ?? ""),
      readStatus: Boolean(item.readStatus),
    }))
    .sort((a, b) => {
      const timeA = Date.parse(a.createdAt);
      const timeB = Date.parse(b.createdAt);
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;
      return timeB - timeA;
    });
}

/** Đếm số thông báo chưa đọc (`readStatus === false`). */
export function countUnreadNotifications(notifications: StaffNotification[]): number {
  return notifications.reduce((count, item) => (item.readStatus ? count : count + 1), 0);
}

/** Trả về danh sách mới với thông báo có `id` tương ứng được đánh dấu đã đọc. */
export function markNotificationReadInList(
  notifications: StaffNotification[],
  notificationId: string
): StaffNotification[] {
  return notifications.map((item) =>
    item.id === notificationId ? { ...item, readStatus: true } : item
  );
}

/** Định dạng thời gian thông báo theo locale hiện tại; trả về chuỗi rỗng nếu thiếu hoặc không hợp lệ. */
export function formatNotificationDateTime(dateString?: string, locale: string = "vi-VN"): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const normalizedLocale = locale.startsWith("en") ? "en-US" : "vi-VN";
  return `${date.toLocaleTimeString(normalizedLocale, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${date.toLocaleDateString(normalizedLocale)}`;
}
