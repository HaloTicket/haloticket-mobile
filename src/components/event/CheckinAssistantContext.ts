import { createContext } from "react";

export type AssistantScope = {
  eventId?: string;
  eventTitle?: string;
  showtimeId?: string;
  showtimeTitle?: string;
};

export const CheckinAssistantContext = createContext({
  isOpen: (): boolean => false,
  open: false,
  setDashboardScope: (_scope: AssistantScope) => {},
});
