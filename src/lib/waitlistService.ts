import { prisma } from "./prisma";

export type WaitlistResult =
  | { valid: true }
  | { valid: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateWaitlistEmail(email: string): WaitlistResult {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }
  if (email.length > 320 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true };
}

export async function addToWaitlist(
  email: string,
  locale: string
): Promise<{ status: "created" | "duplicate" | "error"; message?: string }> {
  try {
    const existing = await prisma.waitlistSignup.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return { status: "duplicate" };
    }

    await prisma.waitlistSignup.create({
      data: {
        email: email.toLowerCase(),
        locale,
      },
    });

    return { status: "created" };
  } catch {
    return { status: "error", message: "Failed to save signup" };
  }
}
