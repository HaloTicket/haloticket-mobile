import axiosClient from "./axiosClient";
import { StaffNotification, StaffNotificationListResponse } from "@/types/notification";
import { normalizeStaffNotifications } from "@/utils/notifications";

export interface NotificationHttpClient {
  get: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<T>;
  patch: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<T>;
}

/** Tạo client API thông báo dựa trên HTTP client truyền vào (hỗ trợ kiểm thử với mock client). */
export function createNotificationApi(client: NotificationHttpClient) {
  return {
    /**
     * Lấy danh sách thông báo kênh STAFF cho người dùng hiện tại.
     * @param userId - JWT subject (`user.id` từ `useAuth`)
     */
    getStaffNotifications: async (userId: string): Promise<StaffNotification[]> => {
      const response = await client.get<StaffNotificationListResponse>(
        `/notifications/users/${encodeURIComponent(userId)}`,
        {
          params: { channel: "STAFF" },
          skipGlobalError: true,
        }
      );
      return normalizeStaffNotifications(response);
    },

    /**
     * Đánh dấu một thông báo là đã đọc.
     * @param notificationId - mã thông báo
     */
    markAsRead: async (notificationId: string): Promise<void> => {
      await client.patch(`/notifications/${encodeURIComponent(notificationId)}/read`, undefined, {
        skipGlobalError: true,
      });
    },
  };
}

export const notificationApi = createNotificationApi(axiosClient as unknown as NotificationHttpClient);
