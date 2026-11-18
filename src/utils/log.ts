// Chỉ để chẩn đoán cho lập trình viên: bản release không in gì, nên không có nội dung lỗi (có thể chứa URL hoặc một phần
// token) lọt vào nhật ký thiết bị của người dùng.
declare const __DEV__: boolean;

/** Ghi cảnh báo ra console, chỉ khi chạy chế độ phát triển. */
export function logWarn(...args: unknown[]): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) console.warn(...args);
}

/** Ghi lỗi ra console, chỉ khi chạy chế độ phát triển. */
export function logError(...args: unknown[]): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) console.error(...args);
}
