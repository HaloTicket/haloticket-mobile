import { test } from "node:test";
import assert from "node:assert/strict";
import { createTokenRefresher, type RefreshStore, type TokenSource } from "../src/services/auth/tokenRefresher.ts";

function makeStore(refreshToken: string | null, source: TokenSource = "backend") {
  const state = { refreshToken, source, saved: [] as Array<{ accessToken: string; refreshToken?: string; source: TokenSource }>, cleared: 0 };
  const store: RefreshStore = {
    getRefreshToken: async () => state.refreshToken,
    getSource: async () => state.source,
    save: async (tokens, src) => {
      state.saved.push({ ...tokens, source: src });
      if (tokens.refreshToken) state.refreshToken = tokens.refreshToken;
    },
    clearRefreshToken: async () => {
      state.cleared++;
      state.refreshToken = null;
    },
  };
  return { state, store };
}

test("no refresh token: nothing is called and the answer is null", async () => {
  const { store } = makeStore(null);
  let calls = 0;
  const refresh = createTokenRefresher({
    store,
    refreshViaBackend: async () => { calls++; return { accessToken: "x" }; },
    refreshViaKeycloak: async () => { calls++; return { accessToken: "x" }; },
  });
  assert.equal(await refresh(), null);
  assert.equal(calls, 0);
});

test("a login token is renewed through the backend and the new tokens are saved", async () => {
  const { state, store } = makeStore("r1", "backend");
  const refresh = createTokenRefresher({
    store,
    refreshViaBackend: async (token) => {
      assert.equal(token, "r1");
      return { accessToken: "a2", refreshToken: "r2" };
    },
    refreshViaKeycloak: async () => { throw new Error("must not be used"); },
  });
  assert.equal(await refresh(), "a2");
  assert.deepEqual(state.saved, [{ accessToken: "a2", refreshToken: "r2", source: "backend" }]);
});

test("a Google (Keycloak) token is renewed against Keycloak", async () => {
  const { state, store } = makeStore("r1", "keycloak");
  const refresh = createTokenRefresher({
    store,
    refreshViaBackend: async () => { throw new Error("must not be used"); },
    refreshViaKeycloak: async () => ({ accessToken: "k2", refreshToken: "kr2" }),
  });
  assert.equal(await refresh(), "k2");
  assert.equal(state.saved[0].source, "keycloak");
});

test("a refused refresh token (400 or 401) is thrown away and the answer is null", async () => {
  for (const status of [400, 401]) {
    const { state, store } = makeStore("r1");
    const refresh = createTokenRefresher({
      store,
      refreshViaBackend: async () => { throw Object.assign(new Error("bad"), { response: { status } }); },
      refreshViaKeycloak: async () => ({ accessToken: "x" }),
    });
    assert.equal(await refresh(), null);
    assert.equal(state.cleared, 1);
  }
});

test("a network failure keeps the refresh token so the next call can try again", async () => {
  const { state, store } = makeStore("r1");
  const refresh = createTokenRefresher({
    store,
    refreshViaBackend: async () => { throw new Error("timeout"); },
    refreshViaKeycloak: async () => ({ accessToken: "x" }),
  });
  assert.equal(await refresh(), null);
  assert.equal(state.cleared, 0);
  assert.equal(state.refreshToken, "r1");
});

test("calls made while one renewal runs share it (a single-use refresh token is not spent twice)", async () => {
  const { store } = makeStore("r1");
  let calls = 0;
  const refresh = createTokenRefresher({
    store,
    refreshViaBackend: async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { accessToken: "a2", refreshToken: "r2" };
    },
    refreshViaKeycloak: async () => ({ accessToken: "x" }),
  });
  const results = await Promise.all([refresh(), refresh(), refresh()]);
  assert.deepEqual(results, ["a2", "a2", "a2"]);
  assert.equal(calls, 1);
  assert.equal(await refresh(), "a2"); // a later call starts a new renewal
  assert.equal(calls, 2);
});
