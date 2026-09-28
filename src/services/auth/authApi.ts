import axios, { AxiosError } from "axios";
import axiosClient from "@/services/api/axiosClient";
import { storage } from "@/utils/storage";
import { CONFIG } from "@/constants/config";

export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  registerStart: "/auth/register/start",
  registerVerify: "/auth/register/verify",
  registerResend: "/auth/register/resend",
} as const;

export interface AuthChallengeResponse {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

export interface LocalizedError {
  key: string;
  values?: Record<string, string | number>;
}

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

async function request<T>(operation: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await request<LoginResponse>(
      () => axiosClient.post(AUTH_ENDPOINTS.login, { email, password }),
      "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    );
    if (response.accessToken) {
      await storage.setItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN, response.accessToken);
    }
    return response;
  },
  
  logout: async () => {
    await storage.deleteItemAsync(CONFIG.STORAGE_KEYS.STAFF_TOKEN);
  },

  registerStart: (email: string, password: string, idempotencyKey: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerStart, { email, password, idempotencyKey }),
    "Không thể gửi mã xác minh đăng ký.",
  ),

  registerVerify: (challengeId: string, email: string, password: string, otp: string) => request<void>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerVerify, { challengeId, email, password, otp }),
    "Mã OTP đăng ký không hợp lệ hoặc đã hết hạn.",
  ),

  registerResend: (challengeId: string) => request<AuthChallengeResponse>(
    () => axiosClient.post(AUTH_ENDPOINTS.registerResend, { challengeId }),
    "Không thể gửi lại mã OTP đăng ký.",
  ),
};

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

export function secondsUntil(isoDate: string | undefined, now = Date.now()): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 1000));
}

export function createIdempotencyKey(prefix: string): string {
  // simple UUID v4 fallback
  return `${prefix}-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
