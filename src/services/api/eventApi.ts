import axiosClient from "./axiosClient";

export interface EventApiData {
  id?: string;
  title?: string;
  locationName?: string;
  address?: string;
  startTime?: string;
  endTime?: string;
  image?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  posterImage?: string;
  eventStatus?: string;
  eventApprovalStatus?: string;
  organizer?: {
    id?: string;
    userId?: string;
    name?: string;
  };
  staffAssignments?: Array<{
    email: string;
    role: string;
  }>;
  showtimes?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    name?: string;
  }>;
}

export const eventApi = {
  // fetch all events
  getAllEvents: async (): Promise<EventApiData[]> => {
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
      console.warn("Failed to fetch events from backend API:", err);
      return [];
    }
  },

  // fetch only events assigned to me
  getMyEvents: async (): Promise<EventApiData[]> => {
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
      console.warn("Failed to fetch my events from backend API:", err);
      return [];
    }
  },

  // fetch event details by id
  getEventById: async (id: string): Promise<EventApiData | null> => {
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
      console.warn("Failed to fetch event details by id:", err);
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
      console.error("Failed to get event analytics:", err);
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
      console.error("Failed to get event bookings:", err);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },
};
