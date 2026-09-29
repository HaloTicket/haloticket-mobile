import axiosClient from "./axiosClient";
import { EventData } from "@/types/event";

export const eventApi = {
  // fetch all events
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
      // console.warn("Failed to fetch events from backend API:", err);
      return [];
    }
  },

  // fetch only events assigned to me
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
      // console.warn("Failed to fetch my events from backend API:", err);
      return [];
    }
  },

  // fetch event details by id
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
      // console.warn("Failed to fetch event details by id:", err);
      return null;
    }
  },

  // get event analytics (revenue, etc)
  getEventAnalytics: async (eventId: string, timeRange: "24h" | "30d" = "30d"): Promise<any> => {
    try {
      const response: any = await axiosClient.get(`/events/${eventId}/analytics`, {
        params: { timeRange }
      });
      return response.data || response;
    } catch (err) {
      // console.error("Failed to get event analytics:", err);
      return null;
    }
  },

  // get orders (bookings) for an event
  getEventBookings: async (eventId: string, search: string = "", showtimeId: string = "", page: number = 0, size: number = 20): Promise<any> => {
    try {
      const response: any = await axiosClient.get(`/bookings/events/${eventId}/organizer`, {
        params: { search, showtimeId, page, size }
      });
      return response.data || response;
    } catch (err) {
      // console.error("Failed to get event bookings:", err);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },

  // get checkins for an event
  getEventCheckins: async (eventId: string, showtimeId: string = ""): Promise<any[]> => {
    try {
      const response: any = await axiosClient.get(`/tickets/checkin/events/${eventId}`, {
        params: showtimeId ? { showtimeId } : {}
      });
      return response.data || response || [];
    } catch (err) {
      // console.error("Failed to get event checkins:", err);
      return [];
    }
  },
};
