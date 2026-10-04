/** Thông báo dành cho nhân viên/ban tổ chức từ notification-service. */
export interface StaffNotification {
  id: string;
  title: string;
  message: string;
  eventId?: string | null;
  eventTitle?: string | null;
  category?: string | null;
  createdAt: string;
  readStatus: boolean;
  source?: "ORGANIZER" | string;
  visibility?: "STAFF" | string;
}

/** Phản hồi danh sách thông báo có thể ở dạng mảng trực tiếp hoặc bọc trong `content`/`data`. */
export type StaffNotificationListResponse =
  | StaffNotification[]
  | { content?: StaffNotification[]; data?: StaffNotification[] }
  | null
  | undefined;
