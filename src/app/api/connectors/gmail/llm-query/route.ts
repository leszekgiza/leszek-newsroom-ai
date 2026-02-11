import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { refreshAccessToken } from "@/lib/connectors/gmail/oauth";
import { fetchMessages } from "@/lib/connectors/gmail/client";
import { getLLMProvider } from "@/lib/ai/llm";

interface SenderGroup {
  email: string;
  name: string;
  messageCount: number;
  lastSubject: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { intent } = await request.json();
    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { error: "Intent is required" },
        { status: 400 }
      );
    }

    const gmailSource = await prisma.privateSource.findFirst({
      where: {
        userId: session.userId,
        type: "GMAIL",
        status: "CONNECTED",
      },
    });

    if (!gmailSource?.credentials) {
      return NextResponse.json(
        { error: "Gmail nie jest połączony" },
        { status: 400 }
      );
    }

    // Use LLM to convert intent to Gmail query
    const llm = await getLLMProvider();
    const gmailQuery = await llm.generateText(
      `Convert this user intent to a Gmail search query. Return ONLY the Gmail search query, nothing else.\n\nUser intent: "${intent}"`,
      {
        systemPrompt:
          "You are a Gmail search query expert. Convert natural language descriptions into Gmail search queries. Use operators like from:, subject:, newer_than:, has:, category:. Return only the query string.",
        maxTokens: 200,
      }
    );

    const cleanQuery = gmailQuery.trim().replace(/^["']|["']$/g, "");

    // Execute the query on Gmail
    const creds = JSON.parse(decrypt(gmailSource.credentials));
    const accessToken = await refreshAccessToken(creds.refreshToken);
    const messages = await fetchMessages(accessToken, cleanQuery, 50);

    // Group by sender
    const senderMap = new Map<string, SenderGroup>();
    for (const msg of messages) {
      const emailMatch = msg.from.match(/<(.+?)>/);
      const email = emailMatch ? emailMatch[1] : msg.from;
      const nameMatch = msg.from.match(/^(.+?)\s*<.+>$/);
      const name = nameMatch ? nameMatch[1].replace(/"/g, "").trim() : email;

      const existing = senderMap.get(email);
      if (existing) {
        existing.messageCount++;
      } else {
        senderMap.set(email, {
          email,
          name,
          messageCount: 1,
          lastSubject: msg.subject,
        });
      }
    }

    const senders = Array.from(senderMap.values()).sort(
      (a, b) => b.messageCount - a.messageCount
    );

    return NextResponse.json({
      gmailQuery: cleanQuery,
      senders,
      totalMessages: messages.length,
    });
  } catch (error) {
    console.error("Gmail LLM query error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
