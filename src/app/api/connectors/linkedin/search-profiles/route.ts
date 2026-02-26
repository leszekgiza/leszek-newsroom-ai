import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import {
  linkedInAuth,
  linkedInSearchProfiles,
} from "@/lib/connectors/linkedin/client";

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { keywords, limit } = body;

    if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
      return NextResponse.json(
        { error: "Podaj słowa kluczowe do wyszukania" },
        { status: 400 }
      );
    }

    const source = await prisma.privateSource.findFirst({
      where: { userId: session.userId, type: "LINKEDIN" },
    });

    if (!source?.credentials) {
      return NextResponse.json(
        { error: "LinkedIn nie jest połączony" },
        { status: 404 }
      );
    }

    const creds = JSON.parse(decrypt(source.credentials));
    let sessionId = creds.sessionId;

    if (!sessionId) {
      const authResult = await linkedInAuth(
        creds.email,
        creds.password,
        creds.liAt,
        creds.jsessionid
      );
      if (!authResult.success) {
        return NextResponse.json(
          { error: authResult.error || "Re-authentication failed" },
          { status: 401 }
        );
      }
      sessionId = authResult.sessionId;
    }

    const result = await linkedInSearchProfiles(
      sessionId,
      keywords.trim(),
      limit ?? 10
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("LinkedIn search profiles error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas wyszukiwania" },
      { status: 500 }
    );
  }
}
