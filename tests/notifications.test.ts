import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStaffNotifications,
  countUnreadNotifications,
  markNotificationReadInList,
  formatNotificationDateTime,
} from "../src/utils/notifications.ts";
import type { StaffNotification } from "../src/types/notification.ts";

test("normalizeStaffNotifications accepts array and sorts newest first", () => {
  const result = normalizeStaffNotifications([
    {
      id: "n-old",
      title: "Older",
      message: "First message",
      eventId: "e-1",
      eventTitle: "Event A",
      category: "ANNOUNCEMENT",
      createdAt: "2026-11-25T10:00:00Z",
      readStatus: true,
      source: "ORGANIZER",
      visibility: "STAFF",
    },
    {
      id: "n-new",
      title: "Newer",
      message: "Second message",
      eventId: "e-2",
      eventTitle: "Event B",
      category: "SCHEDULE",
      createdAt: "2026-11-26T08:00:00Z",
      readStatus: false,
      source: "ORGANIZER",
      visibility: "STAFF",
    },
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "n-new");
  assert.equal(result[0].readStatus, false);
  assert.equal(result[1].id, "n-old");
  assert.equal(result[1].readStatus, true);
});

test("normalizeStaffNotifications unwraps content or data wrappers and handles empty/null", () => {
  const fromContent = normalizeStaffNotifications({
    content: [
      {
        id: "1",
        title: "Shift update",
        message: "Gate A opens early",
        createdAt: "2026-11-26T09:00:00Z",
        readStatus: false,
        visibility: "STAFF",
      },
    ],
  });
  assert.equal(fromContent.length, 1);
  assert.equal(fromContent[0].title, "Shift update");

  const fromData = normalizeStaffNotifications({
    data: [
      {
        id: "2",
        title: "Briefing",
        message: "Meet at main stage",
        createdAt: "2026-11-26T09:30:00Z",
        readStatus: true,
        visibility: "STAFF",
      },
    ],
  });
  assert.equal(fromData.length, 1);
  assert.equal(fromData[0].id, "2");

  assert.deepEqual(normalizeStaffNotifications(null), []);
  assert.deepEqual(normalizeStaffNotifications(undefined), []);
});

test("the STAFF inbox omits public and legacy notices from an older backend", () => {
  const notification = { title: "Update", message: "Content", createdAt: "", readStatus: false };
  const result = normalizeStaffNotifications([
    { ...notification, id: "internal", visibility: "STAFF" },
    { ...notification, id: "public", visibility: "PUBLIC" },
    { ...notification, id: "legacy" },
  ]);
  assert.deepEqual(result.map((item) => item.id), ["internal"]);
});

test("countUnreadNotifications counts only items with readStatus false", () => {
  const list: StaffNotification[] = [
    { id: "1", title: "A", message: "m1", createdAt: "", readStatus: false },
    { id: "2", title: "B", message: "m2", createdAt: "", readStatus: true },
    { id: "3", title: "C", message: "m3", createdAt: "", readStatus: false },
  ];
  assert.equal(countUnreadNotifications(list), 2);
  assert.equal(countUnreadNotifications([]), 0);
});

test("markNotificationReadInList marks only the matching notification as read", () => {
  const list: StaffNotification[] = [
    { id: "1", title: "A", message: "m1", createdAt: "", readStatus: false },
    { id: "2", title: "B", message: "m2", createdAt: "", readStatus: false },
  ];
  const updated = markNotificationReadInList(list, "1");
  assert.equal(updated[0].readStatus, true);
  assert.equal(updated[1].readStatus, false);
  assert.equal(list[0].readStatus, false);
});

test("formatNotificationDateTime handles empty or invalid dates safely", () => {
  assert.equal(formatNotificationDateTime(""), "");
  assert.equal(formatNotificationDateTime("not-a-date"), "");
  const formatted = formatNotificationDateTime("2026-11-26T10:15:00Z", "en-US");
  assert.ok(formatted.includes(" - "));
});
