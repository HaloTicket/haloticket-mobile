import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyApiError,
  createErrorThrottler,
  extractHost,
} from "../src/services/api/errorClassification.ts";

const BASE = { baseUrl: "http://192.168.1.5:8888/api", isDev: false };

// Responses from the server
test("response with status 500 is HTTP_ERROR and shows a modal with the server message", () => {
  const result = classifyApiError(
    { response: { status: 500, data: { message: "Booking failed" } } },
    BASE
  );
  assert.equal(result.type, "HTTP_ERROR");
  assert.equal(result.shouldEmitModal, true);
  assert.equal(result.message, "Booking failed");
  assert.equal(result.title, "Lỗi kết nối");
});

test("response without a body message falls back to the data.error field, then the default text", () => {
  const withError = classifyApiError({ response: { status: 400, data: { error: "Bad input" } } }, BASE);
  assert.equal(withError.message, "Bad input");

  const withNothing = classifyApiError({ response: { status: 502 } }, BASE);
  assert.equal(withNothing.type, "HTTP_ERROR");
  assert.equal(withNothing.message, "Đã xảy ra lỗi khi kết nối máy chủ");
});

test("401 is AUTH_UNAUTHORIZED and never opens a modal", () => {
  const result = classifyApiError({ response: { status: 401, data: { message: "expired" } } }, BASE);
  assert.equal(result.type, "AUTH_UNAUTHORIZED");
  assert.equal(result.shouldEmitModal, false);
  assert.equal(result.message, undefined);
});

test("404 is NOT_FOUND and never opens a modal", () => {
  const result = classifyApiError({ response: { status: 404 } }, BASE);
  assert.equal(result.type, "NOT_FOUND");
  assert.equal(result.shouldEmitModal, false);
});

// No response
test("network failure without a response is NO_RESPONSE and opens a modal", () => {
  const result = classifyApiError({ message: "Network Error", code: "ERR_NETWORK" }, BASE);
  assert.equal(result.type, "NO_RESPONSE");
  assert.equal(result.shouldEmitModal, true);
  assert.equal(result.title, "Không kết nối được máy chủ");
});

test("timeouts are detected by code ECONNABORTED, code ETIMEDOUT and by message", () => {
  for (const error of [
    { code: "ECONNABORTED", message: "boom" },
    { code: "ETIMEDOUT", message: "boom" },
    { message: "timeout of 10000ms exceeded" },
    { message: "Request TIMEOUT" },
  ]) {
    const result = classifyApiError(error, BASE);
    assert.equal(result.type, "TIMEOUT", JSON.stringify(error));
    assert.equal(result.shouldEmitModal, true);
  }
});

test("a null or empty error is treated as NO_RESPONSE instead of throwing", () => {
  assert.equal(classifyApiError(undefined, BASE).type, "NO_RESPONSE");
  assert.equal(classifyApiError(null, BASE).type, "NO_RESPONSE");
  assert.equal(classifyApiError({}, BASE).type, "NO_RESPONSE");
});

test("custom translator is used for title and message", () => {
  const t = (key: string) => `T(${key})`;
  const result = classifyApiError({ message: "Network Error" }, { ...BASE, t });
  assert.equal(result.title, "T(errors.cannot_connect_server_title)");
  assert.equal(result.message, "T(errors.network_error_message)");
});

// Host hint in development

test("in dev the message shows only host:port, not the path or query of the base URL", () => {
  const result = classifyApiError(
    { message: "Network Error", config: { baseURL: "http://192.168.1.5:8888/api/secret-path?token=abc123" } },
    { isDev: true }
  );
  assert.ok(result.message?.includes("192.168.1.5:8888"));
  assert.ok(!result.message?.includes("secret-path"));
  assert.ok(!result.message?.includes("abc123"));
  assert.ok(!result.message?.includes("/api"));
});

test("outside dev the message does not mention the host at all", () => {
  const result = classifyApiError({ message: "Network Error" }, { isDev: false, baseUrl: "http://192.168.1.5:8888/api" });
  assert.ok(!result.message?.includes("192.168.1.5"));
});

test("extractHost keeps host and port only", () => {
  assert.equal(extractHost("http://192.168.1.5:8888/api"), "192.168.1.5:8888");
  assert.equal(extractHost("https://api.example.com/v1/users?token=abc#frag"), "api.example.com");
  assert.equal(extractHost("192.168.1.5:8888/api/private"), "192.168.1.5:8888");
  assert.equal(extractHost("http://user:pass@10.0.2.2:8888/api"), "10.0.2.2:8888");
  assert.equal(extractHost(""), "");
  assert.equal(extractHost(undefined), "");
});

// Throttler (3 second window)

test("same error inside 3 seconds is suppressed, then allowed again at 3 seconds", () => {
  const throttler = createErrorThrottler();
  assert.equal(throttler.shouldEmit("offline", 10_000), true);
  assert.equal(throttler.shouldEmit("offline", 11_000), false);
  assert.equal(throttler.shouldEmit("offline", 12_999), false);
  assert.equal(throttler.shouldEmit("offline", 13_000), true);
});

test("a different error key is not suppressed inside the window", () => {
  const throttler = createErrorThrottler();
  assert.equal(throttler.shouldEmit("offline", 10_000), true);
  assert.equal(throttler.shouldEmit("server-500", 10_500), true);
  assert.equal(throttler.shouldEmit("server-500", 11_000), false);
});

test("suppressed errors do not extend the window", () => {
  const throttler = createErrorThrottler();
  throttler.shouldEmit("offline", 10_000);
  throttler.shouldEmit("offline", 12_000);
  assert.equal(throttler.getLastTimestamp(), 10_000);
  assert.equal(throttler.shouldEmit("offline", 13_000), true);
});

test("reset clears the throttle and a custom window is respected", () => {
  const throttler = createErrorThrottler(500);
  assert.equal(throttler.shouldEmit("offline", 1_000), true);
  assert.equal(throttler.shouldEmit("offline", 1_400), false);
  assert.equal(throttler.shouldEmit("offline", 1_500), true);
  throttler.reset();
  assert.equal(throttler.getLastTimestamp(), 0);
  assert.equal(throttler.shouldEmit("offline", 1_501), true);
});
