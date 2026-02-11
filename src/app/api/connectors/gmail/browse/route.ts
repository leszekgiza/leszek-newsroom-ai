import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { refreshAccessToken } from "@/lib/connectors/gmail/oauth";
import { listSenders } from "@/lib/connectors/gmail/client";
import { getLLMProvider } from "@/lib/ai/llm";

type SenderCategory = "newsletter" | "marketing" | "transactional" | "personal";

interface ClassifiedSender {
  email: string;
  name: string;
  messageCount: number;
  lastSubject: string;
  frequency: string;
  category: SenderCategory;
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const creds = JSON.parse(decrypt(gmailSource.credentials));
    const accessToken = await refreshAccessToken(creds.refreshToken);

    // Get senders from last 30 days
    const senders = await listSenders(accessToken);

    if (senders.length === 0) {
      return NextResponse.json({ senders: [], classifications: {} });
    }

    // LLM classification
    const llm = await getLLMProvider();
    const senderList = senders
      .map((s) => `${s.name} <${s.email}> - "${s.lastSubject}" (${s.messageCount} msgs, ${s.frequency})`)
      .join("\n");

    const classificationText = await llm.generateText(
      `Classify each sender into one of these categories: newsletter, marketing, transactional, personal.\n\nReturn JSON array of objects with "email" and "category" fields only.\n\nSenders:\n${senderList}`,
      {
        systemPrompt:
          "You are an email classification expert. Classify senders based on their name, email domain, subject line, and frequency. Newsletters are regular content emails (weekly/daily digests, blog updates). Marketing is promotional/sales emails. Transactional is receipts/notifications. Personal is direct communication. Return valid JSON only.",
        maxTokens: 1000,
      }
    );

    // Parse LLM classification
    const classifications = new Map<string, SenderCategory>();
    try {
      const jsonMatch = classificationText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          email: string;
          category: SenderCategory;
        }>;
        for (const item of parsed) {
          if (item.email && item.category) {
            classifications.set(item.email, item.category);
          }
        }
      }
    } catch {
      // If LLM output isn't valid JSON, default all to newsletter
    }

    const classifiedSenders: ClassifiedSender[] = senders.map((s) => ({
      email: s.email,
      name: s.name,
      messageCount: s.messageCount,
      lastSubject: s.lastSubject,
      frequency: s.frequency,
      category: classifications.get(s.email) || "newsletter",
    }));

    return NextResponse.json({ senders: classifiedSenders });
  } catch (error) {
    console.error("Gmail browse error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
