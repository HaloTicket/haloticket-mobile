declare const __DEV__: boolean | undefined;

/** Kết quả phân loại lỗi API: loại lỗi, có nên hiện hộp thoại không, kèm tiêu đề và nội dung (nếu có). */
export interface ErrorClassification {
  type: "NO_RESPONSE" | "TIMEOUT" | "HTTP_ERROR" | "AUTH_UNAUTHORIZED" | "NOT_FOUND";
  shouldEmitModal: boolean;
  title?: string;
  message?: string;
}

/** Tùy chọn phân loại lỗi: chế độ dev, địa chỉ API gốc và hàm dịch khóa. */
export interface ErrorClassificationOptions {
  isDev?: boolean;
  baseUrl?: string;
  t?: (key: string, options?: any) => string;
}

const DEFAULT_STRINGS: Record<string, string> = {
  "errors.cannot_connect_server_title": "Không kết nối được máy chủ",
  "errors.network_error_message": "Vui lòng kiểm tra lại kết nối Wi-Fi và địa chỉ máy chủ.",
  "errors.connection_error_title": "Lỗi kết nối",
  "errors.server_error_fallback": "Đã xảy ra lỗi khi kết nối máy chủ",
};

/** Dịch khóa bằng hàm `t` nếu có; nếu không thì dùng chuỗi mặc định hoặc `defaultValue` và tự thay các biến `{{tên}}`. */
function translate(
  t: ((key: string, options?: any) => string) | undefined,
  key: string,
  options?: any
): string {
  if (typeof t === "function") {
    return t(key, options);
  }
  let str = DEFAULT_STRINGS[key] || options?.defaultValue || key;
  if (options && typeof options === "object") {
    for (const [k, v] of Object.entries(options)) {
      str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }
  }
  return str;
}

/**
 * Trích phần host (tên máy và cổng) từ chuỗi URL,
 * tránh làm lộ đường dẫn, tham số truy vấn hoặc token nhạy cảm.
 */
export function extractHost(urlStr?: string): string {
  if (!urlStr) return "";
  try {
    const formatted = urlStr.includes("://") ? urlStr : `http://${urlStr}`;
    const parsed = new URL(formatted);
    return parsed.host;
  } catch {
    const match = urlStr.match(/^(?:https?:\/\/)?([^/]+)/i);
    return match ? match[1] : urlStr;
  }
}

/**
 * Tạo bộ chặn lỗi để không hiện nhiều hộp thoại lỗi trùng nhau trong một khoảng thời gian (ví dụ 3000ms).
 */
export function createErrorThrottler(windowMs: number = 3000) {
  let lastTimestamp = 0;
  let lastKey = "";

  return {
    /** Cho phép phát lỗi nếu khác khóa lần trước hoặc đã quá cửa sổ chặn, đồng thời ghi nhận lần phát mới. */
    shouldEmit(key: string, now: number = Date.now()): boolean {
      if (now - lastTimestamp < windowMs && lastKey === key) {
        return false;
      }
      lastTimestamp = now;
      lastKey = key;
      return true;
    },
    /** Xóa trạng thái đã ghi nhận để lỗi tiếp theo luôn được phát. */
    reset(): void {
      lastTimestamp = 0;
      lastKey = "";
    },
    /** Trả về thời điểm (ms) của lần phát lỗi gần nhất, 0 nếu chưa có. */
    getLastTimestamp(): number {
      return lastTimestamp;
    },
  };
}

/**
 * Phân loại lỗi API thành:
 * - AUTH_UNAUTHORIZED (401)
 * - NOT_FOUND (404)
 * - HTTP_ERROR (các mã trạng thái khác có phản hồi)
 * - TIMEOUT (không có phản hồi, mã hoặc thông điệp báo quá thời gian)
 * - NO_RESPONSE (mất mạng, không tới được máy chủ)
 */
export function classifyApiError(
  error: any,
  options?: ErrorClassificationOptions
): ErrorClassification {
  const isDev =
    options?.isDev !== undefined
      ? options.isDev
      : typeof __DEV__ !== "undefined"
      ? __DEV__
      : false;
  const baseUrl = options?.baseUrl || (typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_API_URL : "") || "http://10.0.2.2:8888/api";
  const t = options?.t;

  // 1. Kiểm tra mã trạng thái HTTP của phản hồi
  if (error?.response) {
    const status = error.response.status;

    if (status === 401) {
      return {
        type: "AUTH_UNAUTHORIZED",
        shouldEmitModal: false,
      };
    }

    if (status === 404) {
      return {
        type: "NOT_FOUND",
        shouldEmitModal: false,
      };
    }

    const title = translate(t, "errors.connection_error_title", {
      defaultValue: "Lỗi kết nối",
    });

    const message =
      error.response.data?.message ||
      error.response.data?.error ||
      translate(t, "errors.server_error_fallback", {
        defaultValue: "Đã xảy ra lỗi khi kết nối máy chủ",
      });

    return {
      type: "HTTP_ERROR",
      shouldEmitModal: true,
      title,
      message,
    };
  }

  // 2. Không có phản hồi: quá thời gian hoặc lỗi mạng
  const isTimeout =
    error?.code === "ECONNABORTED" ||
    error?.code === "ETIMEDOUT" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("timeout"));

  const title = translate(t, "errors.cannot_connect_server_title", {
    defaultValue: "Không kết nối được máy chủ",
  });

  const baseMessage = translate(t, "errors.network_error_message", {
    defaultValue: "Vui lòng kiểm tra lại kết nối Wi-Fi và địa chỉ máy chủ.",
  });

  let message = baseMessage;
  if (isDev) {
    const host = extractHost(error?.config?.baseURL || baseUrl);
    if (host) {
      const devHint = translate(t, "errors.network_error_dev_hint", {
        host,
        defaultValue: `Máy chủ: ${host}`,
      });
      message = `${baseMessage}\n(${devHint})`;
    }
  }

  return {
    type: isTimeout ? "TIMEOUT" : "NO_RESPONSE",
    shouldEmitModal: true,
    title,
    message,
  };
}
