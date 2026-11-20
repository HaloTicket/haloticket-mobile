import axios, { AxiosError } from "axios";
import axiosClient from "@/services/api/axiosClient";
import { saveSession, clearSession } from "./tokenSession";

/** Các đường dẫn API xác thực của backend. */
export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  registerStart: "/auth/register/start",
  registerVerify: "/auth/register/verify",
  registerResend: "/auth/register/resend",
  forgotStart: "/auth/password/forgot",
  forgotVerify: "/auth/password/verify",
  forgotResend: "/auth/password/resend",
  resetPassword: "/auth/password/reset",
} as const;

/** Thử thách OTP khi đăng ký hoặc quên mật khẩu: mã định danh, hạn dùng và thời điểm được gửi lại (chuỗi ISO). */
export interface AuthChallengeResponse {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

/** Phản hồi sau khi xác minh OTP quên mật khẩu: token đặt lại mật khẩu và thời điểm hết hạn. */
export interface PasswordResetVerificationResponse {
  resetToken: string;
  expiresAt: string;
}

/** Phản hồi đăng nhập: access token, refresh token, id token (nếu có) và thời gian sống của token. */
export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

/** Lỗi API xác thực kèm mã HTTP, mã lỗi nghiệp vụ, thời gian chờ thử lại và số lần thử còn lại. */
export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

/** Thông điệp lỗi hiển thị cho người dùng: khóa (hoặc nội dung) và các giá trị thay vào. */
export interface LocalizedError {
  key: string;
  values?: Record<string, string | number>;
}

/** Chuyển lỗi bất kỳ thành `ApiError`, ưu tiên thông điệp và mã lỗi do máy chủ trả về; không phải lỗi axios thì dùng `fallback`. */
function toApiError(error: unknown, fallback: string): ApiError {
  if (!axios.isAxiosError(error)) return Object.assign(new Error(fallback), { status: undefined });
  const axiosError = error as AxiosError<{ message?: string; code?: string; retryAfterSeconds?: number; attemptsRemaining?: number }>;
  const data = axiosError.response?.data;
  const message = data?.message || fallback;
  return Object.assign(new Error(message), {
    status: axiosError.response?.status,
    code: data?.code,
    retryAfterSeconds: data?.retryAfterSeconds,
    attemptsRemaining: data?.attemptsRemaining,
  });
}

/** Chạy một lời gọi API và ném lại mọi lỗi dưới dạng `ApiError` với thông điệp dự phòng `fallback`. */
async function request<T>(operation: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

/** Các lời gọi API xác thực: đăng nhập, đăng xuất và đăng ký bằng OTP. */
export const authApi = {
  /** Đăng nhập bằng email và mật khẩu; thành công thì lưu phiên với nguồn token là `backend`. */
  login: async (email: string, password: string) => {
    const response = await request<LoginResponse>(
      () => axiosClient.post(AUTH_ENDPOINTS.login, { email, password }),
      "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    );
    if (response.accessToken) {
      await saveSession({ accessToken: response.accessToken, refreshToken: response.refreshToken }, "backend");
    }
    return response;
  },

  /** Đăng xuất cục bộ bằng cách xóa phiên đã lưu (không gọi máy chủ). */
  logout: async () => {
    await clearSession();
  },

  /** Bắt đầu đăng ký: gửi email và mật khẩu (kèm khóa idempotency) để nhận thử thách OTP. */
  registerStart: (email: string, password: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerStart, { email, password, idempotencyKey }),
    "Không thể gửi mã xác minh đăng ký.",
  ),

  /** Xác minh mã OTP của thử thách để hoàn tất đăng ký. */
  registerVerify: (challengeId: string, email: string, password: string, otp: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerVerify, { challengeId, email, password, otp }),
    "Mã OTP đăng ký không hợp lệ hoặc đã hết hạn.",
  ),

  /** Yêu cầu gửi lại mã OTP cho thử thách đang có. */
  registerResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerResend, { challengeId }),
    "Không thể gửi lại mã OTP đăng ký.",
  ),

  /** Bắt đầu quên mật khẩu: gửi mã OTP tới email hoặc số điện thoại đã đăng ký. */
  forgotStart: (identifier: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotStart, { identifier, idempotencyKey }),
    "Không thể gửi mã khôi phục mật khẩu.",
  ),

  /** Xác minh mã OTP quên mật khẩu, trả về token đặt lại mật khẩu. */
  forgotVerify: (challengeId: string, otp: string) => request<PasswordResetVerificationResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotVerify, { challengeId, otp }),
    "Mã OTP khôi phục không hợp lệ hoặc đã hết hạn.",
  ),

  /** Gửi lại mã OTP quên mật khẩu cho thử thách đang có. */
  forgotResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.forgotResend, { challengeId }),
    "Không thể gửi lại mã OTP khôi phục.",
  ),

  /** Đặt mật khẩu mới bằng token đặt lại nhận được sau bước xác minh OTP. */
  resetPassword: (resetToken: string, password: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.resetPassword, { resetToken, password }),
    "Không thể đặt lại mật khẩu.",
  ),
};

/**
 * Chuyển lỗi xác thực thành thông điệp tiếng Việt: xử lý riêng 429 (quá nhiều lần), OTP hết hạn hoặc bị khóa
 * và email đã đăng ký; các lỗi khác lấy thông điệp của lỗi hoặc `fallback`.
 */
export function getAuthErrorMessage(error: unknown, fallback: string): LocalizedError {
  const apiError = error as Partial<ApiError>;
  if (apiError.status === 429) {
    return apiError.retryAfterSeconds
      ? { key: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${apiError.retryAfterSeconds}s.` }
      : { key: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau." };
  }
  if (apiError.status === 410 || apiError.code === "OTP_EXPIRED") return { key: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." };
  if (apiError.status === 423 || apiError.code === "OTP_LOCKED") return { key: "Mã OTP đã bị khóa do nhập sai quá nhiều lần." };
  if (apiError.status === 409 || apiError.code === "USER_ALREADY_EXISTS") return { key: "Email này đã được đăng ký. Vui lòng đăng nhập." };
  return { key: error instanceof Error ? error.message : fallback };
}

/** Số giây còn lại (làm tròn lên, không âm) tới một thời điểm ISO; 0 nếu không có thời điểm. */
export function secondsUntil(isoDate: string | undefined, now = Date.now()): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 1000));
}

/** Tạo khóa idempotency gồm `prefix` và một chuỗi ngẫu nhiên dạng UUID v4. */
export function createIdempotencyKey(prefix: string): string {
  // cách tạo UUID v4 đơn giản làm dự phòng
  return `${prefix}-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
