import { NextRequest, NextResponse } from "next/server";
import { validateWaitlistEmail, addToWaitlist } from "@/lib/waitlistService";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 5;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  // Parse body
  let body: { email?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, locale } = body;

  // Validate email
  const validation = validateWaitlistEmail(email || "");
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Save to DB
  const result = await addToWaitlist(email!, locale || "pl");

  switch (result.status) {
    case "created":
      return NextResponse.json({ message: "success" }, { status: 201 });
    case "duplicate":
      return NextResponse.json(
        { error: "Already signed up" },
        { status: 409 }
      );
    default:
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
  }
}
