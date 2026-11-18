// Làm mới access token. Không import React Native, axios hay alias ở đây nên node --test chạy được tệp này nguyên trạng.

/** Nơi đã cấp token: backend của HaloTicket hoặc Keycloak (đăng nhập Google). */
export type TokenSource = "backend" | "keycloak";

/** Cặp token nhận được sau khi đăng nhập hoặc làm mới. */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
}

/** Kho lưu trữ phiên mà bộ làm mới cần: đọc refresh token và nguồn token, lưu token mới, xóa refresh token. */
export interface RefreshStore {
  getRefreshToken(): Promise<string | null>;
  getSource(): Promise<TokenSource>;
  save(tokens: TokenSet, source: TokenSource): Promise<void>;
  clearRefreshToken(): Promise<void>;
}

/** Phụ thuộc của bộ làm mới: kho lưu trữ và hai cách làm mới token (qua backend hoặc qua Keycloak). */
export interface RefreshDeps {
  store: RefreshStore;
  // token cấp bởi POST /auth/login được làm mới qua POST /auth/refresh; token cấp bởi luồng Google của Keycloak
  // (client haloticket-mobile) chỉ Keycloak làm mới được, vì backend từ chối client đó
  refreshViaBackend(refreshToken: string): Promise<TokenSet>;
  refreshViaKeycloak(refreshToken: string): Promise<TokenSet>;
}

/**
 * Kiểm tra lỗi có phải do máy chủ từ chối refresh token (HTTP 400 hoặc 401) hay không.
 * Khi refresh token không dùng được (hết hạn, bị thu hồi, đã xoay vòng) thì giữ lại chỉ lặp lại lỗi.
 */
export function isRejectedGrant(error: unknown): boolean {
  const status = (error as { status?: number; response?: { status?: number } } | null);
  const code = status?.status ?? status?.response?.status;
  return code === 400 || code === 401;
}

/**
 * Trả về hàm lấy access token mới, hoặc null khi không có refresh token hoặc việc làm mới thất bại.
 * Các lời gọi trong lúc một lần làm mới đang chạy sẽ dùng chung kết quả đó (refresh token của Keycloak có thể chỉ
 * dùng một lần, nên hai lần làm mới đồng thời sẽ làm lần thứ hai thất bại và đăng xuất người dùng).
 */
export function createTokenRefresher(deps: RefreshDeps): () => Promise<string | null> {
  let inflight: Promise<string | null> | null = null;

  /** Thực hiện một lần làm mới: chọn nguồn phù hợp, lưu token mới, xóa refresh token nếu bị từ chối. */
  async function run(): Promise<string | null> {
    const refreshToken = await deps.store.getRefreshToken();
    if (!refreshToken) return null;
    const source = await deps.store.getSource();
    try {
      const tokens = source === "keycloak"
        ? await deps.refreshViaKeycloak(refreshToken)
        : await deps.refreshViaBackend(refreshToken);
      if (!tokens.accessToken) return null;
      await deps.store.save(tokens, source);
      return tokens.accessToken;
    } catch (error) {
      if (isRejectedGrant(error)) await deps.store.clearRefreshToken();
      return null;
    }
  }

  return () => {
    if (!inflight) {
      inflight = run().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
}
