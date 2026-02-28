// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Set VAPID env vars early so the module top-level code picks them up.
// vi.hoisted runs before vi.mock factory functions and module imports.
// ---------------------------------------------------------------------------

const MOCK_VAPID_PUBLIC = "BTestPublicKeyForVapid1234567890";
const MOCK_VAPID_PRIVATE = "testPrivateKeyForVapid1234567890";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BTestPublicKeyForVapid1234567890";
  process.env.VAPID_PRIVATE_KEY = "testPrivateKeyForVapid1234567890";
  process.env.VAPID_CONTACT_EMAIL = "mailto:test@example.com";
});

// ---------------------------------------------------------------------------
// Mocks (hoisted automatically by vitest)
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushSubscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Now import the module under test and mocked dependencies
// ---------------------------------------------------------------------------

import {
  saveSubscription,
  removeSubscription,
  sendPushNotification,
} from "@/lib/pushService";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockFindFirst = prisma.pushSubscription.findFirst as ReturnType<typeof vi.fn>;
const mockCreate = prisma.pushSubscription.create as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.pushSubscription.update as ReturnType<typeof vi.fn>;
const mockDeleteMany = prisma.pushSubscription.deleteMany as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.pushSubscription.findMany as ReturnType<typeof vi.fn>;
const mockDelete = prisma.pushSubscription.delete as ReturnType<typeof vi.fn>;
const mockSendNotification = webpush.sendNotification as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Common fixtures
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user-123";
const TEST_ENDPOINT = "https://push.example.com/sub/abc";
const TEST_SUBSCRIPTION = {
  endpoint: TEST_ENDPOINT,
  keys: {
    p256dh: "p256dh-key-value",
    auth: "auth-key-value",
  },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// saveSubscription
// ---------------------------------------------------------------------------

describe("saveSubscription", () => {
  it("creates new subscription when none exists for endpoint", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});

    await saveSubscription(TEST_USER_ID, TEST_SUBSCRIPTION);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, endpoint: TEST_ENDPOINT },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: TEST_USER_ID,
        endpoint: TEST_ENDPOINT,
        p256dh: "p256dh-key-value",
        auth: "auth-key-value",
      },
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates existing subscription when one already exists", async () => {
    const existingRecord = { id: "sub-existing-1", userId: TEST_USER_ID, endpoint: TEST_ENDPOINT };
    mockFindFirst.mockResolvedValue(existingRecord);
    mockUpdate.mockResolvedValue({});

    await saveSubscription(TEST_USER_ID, TEST_SUBSCRIPTION);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sub-existing-1" },
      data: {
        p256dh: "p256dh-key-value",
        auth: "auth-key-value",
      },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("stores correct fields (endpoint, p256dh, auth keys)", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});

    const customSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/unique-endpoint",
      keys: {
        p256dh: "custom-p256dh-key",
        auth: "custom-auth-key",
      },
    };

    await saveSubscription("user-456", customSub);

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data).toEqual({
      userId: "user-456",
      endpoint: "https://fcm.googleapis.com/fcm/send/unique-endpoint",
      p256dh: "custom-p256dh-key",
      auth: "custom-auth-key",
    });
  });
});

// ---------------------------------------------------------------------------
// removeSubscription
// ---------------------------------------------------------------------------

describe("removeSubscription", () => {
  it("deletes subscription by userId and endpoint", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await removeSubscription(TEST_USER_ID, TEST_ENDPOINT);

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, endpoint: TEST_ENDPOINT },
    });
  });
});

// ---------------------------------------------------------------------------
// sendPushNotification
// ---------------------------------------------------------------------------

describe("sendPushNotification", () => {
  const TEST_PAYLOAD = { title: "New Article", body: "Check it out!", url: "/articles/1" };

  it("sends to all user subscriptions", async () => {
    const subs = [
      { id: "s1", userId: TEST_USER_ID, endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
      { id: "s2", userId: TEST_USER_ID, endpoint: "https://push.example.com/2", p256dh: "k2", auth: "a2" },
    ];
    mockFindMany.mockResolvedValue(subs);
    mockSendNotification.mockResolvedValue({});

    const result = await sendPushNotification(TEST_USER_ID, TEST_PAYLOAD);

    expect(mockFindMany).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } });
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/1", keys: { p256dh: "k1", auth: "a1" } },
      JSON.stringify(TEST_PAYLOAD)
    );
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/2", keys: { p256dh: "k2", auth: "a2" } },
      JSON.stringify(TEST_PAYLOAD)
    );
    expect(result).toEqual({ sent: 2, failed: 0 });
  });

  it("returns {sent, failed} counts", async () => {
    const subs = [
      { id: "s1", userId: TEST_USER_ID, endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
      { id: "s2", userId: TEST_USER_ID, endpoint: "https://push.example.com/2", p256dh: "k2", auth: "a2" },
      { id: "s3", userId: TEST_USER_ID, endpoint: "https://push.example.com/3", p256dh: "k3", auth: "a3" },
    ];
    mockFindMany.mockResolvedValue(subs);
    mockSendNotification
      .mockResolvedValueOnce({})                  // s1 succeeds
      .mockRejectedValueOnce({ statusCode: 500 }) // s2 fails (generic)
      .mockResolvedValueOnce({});                  // s3 succeeds

    const result = await sendPushNotification(TEST_USER_ID, TEST_PAYLOAD);

    expect(result).toEqual({ sent: 2, failed: 1 });
  });

  it("auto-removes subscription on 410 (gone) error", async () => {
    const subs = [
      { id: "s1", userId: TEST_USER_ID, endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
    ];
    mockFindMany.mockResolvedValue(subs);
    mockSendNotification.mockRejectedValue({ statusCode: 410 });
    mockDelete.mockResolvedValue({});

    const result = await sendPushNotification(TEST_USER_ID, TEST_PAYLOAD);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it("auto-removes subscription on 404 error", async () => {
    const subs = [
      { id: "s1", userId: TEST_USER_ID, endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
    ];
    mockFindMany.mockResolvedValue(subs);
    mockSendNotification.mockRejectedValue({ statusCode: 404 });
    mockDelete.mockResolvedValue({});

    const result = await sendPushNotification(TEST_USER_ID, TEST_PAYLOAD);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it("returns {0, 0} when VAPID not configured", async () => {
    // Re-import module with empty VAPID keys so top-level constants are empty
    const originalPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const originalPrivate = process.env.VAPID_PRIVATE_KEY;

    try {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "";
      process.env.VAPID_PRIVATE_KEY = "";

      vi.resetModules();

      const { sendPushNotification: sendFn } = await import("@/lib/pushService");
      const result = await sendFn(TEST_USER_ID, TEST_PAYLOAD);

      expect(result).toEqual({ sent: 0, failed: 0 });
    } finally {
      // Restore env for subsequent tests
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPublic;
      process.env.VAPID_PRIVATE_KEY = originalPrivate;
    }
  });

  it("returns {0, 0} when user has no subscriptions", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await sendPushNotification(TEST_USER_ID, TEST_PAYLOAD);

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("handles sendNotification throwing other errors gracefully", async () => {
    const subs = [
      { id: "s1", userId: TEST_USER_ID, endpoint: "https://push.example.com/1", p256dh: "k1", auth: "a1" },
      { id: "s2", userId: TEST_USER_ID, endpoint: "https://push.example.com/2", p256dh: "k2", auth: "a2" },
    ];
    mockFindMany.mockResolvedValue(subs);
    mockSendNotification.mockRejectedValue(new Error("Network timeout"));

    const result = await sendPushNotification(TEST_USER_ID, TEST_PAYLOAD);

    expect(result).toEqual({ sent: 0, failed: 2 });
    // Should NOT try to delete subscriptions for non-410/404 errors
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
