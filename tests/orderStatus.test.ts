import { test } from "node:test";
import assert from "node:assert/strict";
import { orderStatusInfo } from "../src/utils/orderStatus.ts";

test("PAID and CONFIRMED are green", () => {
  assert.equal(orderStatusInfo("PAID").tone, "success");
  assert.equal(orderStatusInfo("CONFIRMED").tone, "success");
});

test("every status booking-service sends has a Vietnamese label key", () => {
  for (const status of ["PENDING", "PAID", "CONFIRMED", "CANCELLED", "EXPIRED", "REFUNDED"]) {
    assert.ok(orderStatusInfo(status).labelKey, status);
  }
});

test("PENDING is a warning, CANCELLED is red, EXPIRED and REFUNDED are neutral", () => {
  assert.equal(orderStatusInfo("PENDING").tone, "warning");
  assert.equal(orderStatusInfo("CANCELLED").tone, "danger");
  assert.equal(orderStatusInfo("EXPIRED").tone, "neutral");
  assert.equal(orderStatusInfo("REFUNDED").tone, "neutral");
});

test("COMPLETED is not a status of the backend: it is shown as it came, neutral", () => {
  assert.deepEqual(orderStatusInfo("COMPLETED"), { labelKey: null, tone: "neutral" });
  assert.deepEqual(orderStatusInfo(undefined), { labelKey: null, tone: "neutral" });
});

test("the status is matched ignoring case", () => {
  assert.equal(orderStatusInfo("paid").tone, "success");
});
