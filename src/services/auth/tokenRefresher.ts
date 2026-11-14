// Refreshing the access token. No React Native, axios or alias imports here, so node --test runs this file as it is.

export type TokenSource = "backend" | "keycloak";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
}

export interface RefreshStore {
  getRefreshToken(): Promise<string | null>;
  getSource(): Promise<TokenSource>;
  save(tokens: TokenSet, source: TokenSource): Promise<void>;
  clearRefreshToken(): Promise<void>;
}

export interface RefreshDeps {
  store: RefreshStore;
  // a token issued by POST /auth/login is renewed through POST /auth/refresh; one issued by the Keycloak Google flow
  // (client haloticket-mobile) only Keycloak can renew, because the backend refuses that client
  refreshViaBackend(refreshToken: string): Promise<TokenSet>;
  refreshViaKeycloak(refreshToken: string): Promise<TokenSet>;
}

// the server said the refresh token is no good (expired, revoked, rotated): keeping it would only repeat the failure
export function isRejectedGrant(error: unknown): boolean {
  const status = (error as { status?: number; response?: { status?: number } } | null);
  const code = status?.status ?? status?.response?.status;
  return code === 400 || code === 401;
}

/**
 * Returns a function that gets a fresh access token, or null when there is no refresh token or the renewal failed.
 * Calls made while one renewal is running share it (a Keycloak refresh token may be single use, so two renewals at once
 * would make the second one fail and log the user out).
 */
export function createTokenRefresher(deps: RefreshDeps): () => Promise<string | null> {
  let inflight: Promise<string | null> | null = null;

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
