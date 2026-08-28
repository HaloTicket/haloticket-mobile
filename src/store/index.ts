// Store configuration placeholder for Check-in Staff App
export interface RootState {
  auth: {
    staff: any | null;
    isAuthenticated: boolean;
  };
  checkIn: {
    lastScannedTicket: any | null;
    recentScans: any[];
  };
}

export const initialStaffState: RootState = {
  auth: {
    staff: null,
    isAuthenticated: false,
  },
  checkIn: {
    lastScannedTicket: null,
    recentScans: [],
  },
};
