/**
 * Push Notification Service
 * Manages Web Push subscriptions and sending notifications
 */

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_CONTACT = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Save a push subscription for a user
 */
export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  // Upsert: avoid duplicate endpoints for same user
  const existing = await prisma.pushSubscription.findFirst({
    where: { userId, endpoint: subscription.endpoint },
  });

  if (existing) {
    await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  } else {
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }
}

/**
 * Remove a push subscription
 */
export async function removeSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

/**
 * Send push notification to all user's subscriptions
 */
export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured, skipping notification");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // 410 Gone or 404 = subscription expired, remove it
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
      failed++;
      console.error(`[Push] Failed to send to ${sub.endpoint}:`, error);
    }
  }

  return { sent, failed };
}
