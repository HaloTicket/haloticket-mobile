export interface EventData {
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
