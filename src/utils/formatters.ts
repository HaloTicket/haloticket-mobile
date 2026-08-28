// Format date & time for check-in logs: 2026-10-15T19:30:00 -> 19:30 - 15/10/2026
export const formatScanDateTime = (dateString?: string): string => {
  if (!dateString) return "--:--";
  const date = new Date(dateString);
  return `${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} - ${date.toLocaleDateString("vi-VN")}`;
};

// Format ticket code display: HALO-1234-5678 -> HALO-1234-5678
export const formatTicketCode = (code: string): string => {
  return code.toUpperCase().trim();
};
