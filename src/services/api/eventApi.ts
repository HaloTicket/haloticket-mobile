import axiosClient from "./axiosClient";
import { EventData } from "@/types/event";

export const eventApi = {
  /** Lấy mọi sự kiện, chuẩn hóa ảnh bìa (có ảnh mặc định); lỗi hoặc dữ liệu lạ thì trả về mảng rỗng. */
  getAllEvents: async (): Promise<EventData[]> => {
    try {
      const response: any = await axiosClient.get("/events");
      if (Array.isArray(response)) {
        return response.map((item: any) => ({
          ...item,
          image: item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
        }));
      } else if (response && Array.isArray(response.content)) {
        return response.content.map((item: any) => ({
          ...item,
          image: item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
        }));
      }
      return [];
    } catch (err) {
      // console.warn("Failed to fetch events from backend API:", err); (tạm tắt ghi log)
      return [];
    }
  },

  /** Lấy các sự kiện được phân công cho người dùng hiện tại; lỗi thì trả về mảng rỗng. */
  getMyEvents: async (): Promise<EventData[]> => {
    try {
      const response: any = await axiosClient.get("/events/my-events");
      if (Array.isArray(response)) {
        return response.map((item: any) => ({
          ...item,
          image: item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
        }));
      } else if (response && Array.isArray(response.content)) {
        return response.content.map((item: any) => ({
          ...item,
          image: item.bannerUrl || item.thumbnailUrl || item.posterImage || item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
        }));
      }
      return [];
    } catch (err) {
      // console.warn("Failed to fetch my events from backend API:", err); (tạm tắt ghi log)
      return [];
    }
  },

  /**
   * Lấy chi tiết một sự kiện theo id kèm ảnh bìa đã chuẩn hóa.
   * @param id - mã sự kiện
   * @returns sự kiện, hoặc null nếu không tìm thấy hoặc gặp lỗi
   */
  getEventById: async (id: string): Promise<EventData | null> => {
    try {
      const response: any = await axiosClient.get(`/events/${id}`);
      if (response && response.id) {
        return {
          ...response,
          image: response.bannerUrl || response.thumbnailUrl || response.posterImage || response.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
        };
      }
      return null;
    } catch (err) {
      // console.warn("Failed to fetch event details by id:", err); (tạm tắt ghi log)
      return null;
    }
  },

  /**
   * Lấy thống kê doanh thu và số vé của sự kiện trong khoảng thời gian chọn.
   * @param eventId - mã sự kiện
   * @param timeRange - khoảng thống kê, `24h` hoặc `30d`
   * @returns số liệu thống kê, `{ forbidden: true }` khi bị từ chối (403), hoặc null khi lỗi khác
   */
  getEventAnalytics: async (eventId: string, timeRange: "24h" | "30d" = "30d"): Promise<any> => {
    try {
      const response: any = await axiosClient.get(`/events/${eventId}/analytics`, {
        params: { timeRange },
        skipGlobalError: true,
      });
      return response.data || response;
    } catch (err: any) {
      if (err?.response?.status === 403) return { forbidden: true };
      // console.error("Failed to get event analytics:", err); (tạm tắt ghi log)
      return null;
    }
  },

  /**
   * Lấy danh sách đơn đặt vé của sự kiện cho người tổ chức, có phân trang.
   * @param eventId - mã sự kiện
   * @param search - từ khóa tìm đơn
   * @param showtimeId - lọc theo suất diễn (rỗng là tất cả)
   * @param page - số trang, bắt đầu từ 0
   * @param size - số đơn mỗi trang
   * @returns trang đơn hàng; khi lỗi trả về trang rỗng, thêm `forbidden: true` nếu bị từ chối (403)
   */
  getEventBookings: async (eventId: string, search: string = "", showtimeId: string = "", page: number = 0, size: number = 20): Promise<any> => {
    try {
      const response: any = await axiosClient.get(`/bookings/events/${eventId}/organizer`, {
        params: { search, showtimeId, page, size },
        skipGlobalError: true,
      });
      return response.data || response;
    } catch (err: any) {
      // mã 403 nghĩa là người này không có quyền xem đơn (ORDERS_VIEW): màn hình báo rõ thay vì hiện danh sách rỗng
      if (err?.response?.status === 403) return { forbidden: true, content: [], totalElements: 0, totalPages: 0 };
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },

  /**
   * Lấy danh sách lượt check-in của sự kiện, có thể lọc theo suất diễn.
   * @param eventId - mã sự kiện
   * @param showtimeId - mã suất diễn (rỗng là tất cả)
   * @returns danh sách check-in, mảng rỗng khi lỗi
   */
  getEventCheckins: async (eventId: string, showtimeId: string = ""): Promise<any[]> => {
    try {
      const response: any = await axiosClient.get(`/tickets/checkin/events/${eventId}`, {
        params: showtimeId ? { showtimeId } : {},
        skipGlobalError: true,
      });
      return response.data || response || [];
    } catch (err) {
      // console.error("Failed to get event checkins:", err); (tạm tắt ghi log)
      return [];
    }
  },
};
