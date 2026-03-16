import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getLLMProvider } from "@/lib/ai/llm";
import { google } from "googleapis";
import { refreshAccessToken } from "@/lib/connectors/gmail/oauth";
import { extractBodyFromMime, htmlToMarkdown } from "@/lib/connectors/gmail/html-parser";
import { decrypt } from "@/lib/encryption";

// Fetch article content from URL
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsroomAI/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text extraction (remove tags, scripts, styles)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to ~10000 characters to avoid token limits
    return text.slice(0, 10000);
  } catch (error) {
    console.error("Error fetching article:", error);
    throw error;
  }
}

// Check if content is meaningful (not just invisible chars / whitespace)
function isContentUsable(content: string | null): boolean {
  if (!content) return false;
  // Strip all whitespace and invisible chars, check if anything remains
  const stripped = content.replace(/[\s\u200B\u200C\u200D\uFEFF\u034F\u00AD\u2060-\u2064\u180E]/g, "");
  return stripped.length > 50;
}

// On-demand fetch Gmail content for articles with content=null or garbage content
async function fetchGmailContentOnDemand(
  articleId: string,
  articleUrl: string,
  sourceCredentials: string
): Promise<string> {
  // Extract threadId from URL: https://mail.google.com/mail/u/0/#inbox/{threadId}
  const threadId = articleUrl.split("#inbox/")[1];
  if (!threadId) {
    throw new Error("Cannot extract threadId from Gmail URL");
  }

  // Decrypt credentials and refresh access token
  const creds = JSON.parse(decrypt(sourceCredentials));
  const accessToken = await refreshAccessToken(creds.refreshToken);

  // Fetch thread from Gmail API
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  // Extract body from the first message in the thread
  const firstMessage = thread.data.messages?.[0];
  if (!firstMessage?.payload) {
    throw new Error("No message content found in Gmail thread");
  }

  const { html, plain } = extractBodyFromMime(firstMessage.payload);
  console.log(`[Gmail fetch] threadId=${threadId}, html=${html ? html.length : 0} chars, plain=${plain ? plain.length : 0} chars`);

  let content = "";
  if (html) {
    content = htmlToMarkdown(html);
    console.log(`[Gmail fetch] after htmlToMarkdown: ${content.length} chars, usable=${isContentUsable(content)}`);
  }
  if (!isContentUsable(content) && plain) {
    // Fallback to plain text if HTML conversion produced garbage
    content = plain;
    console.log(`[Gmail fetch] falling back to plain text: ${content.length} chars`);
  }

  if (!isContentUsable(content)) {
    throw new Error(`Email content is empty or unusable after parsing (html=${html?.length || 0}, plain=${plain?.length || 0})`);
  }

  // Persist content for future use
  await prisma.article.update({
    where: { id: articleId },
    data: { content },
  });

  return content.slice(0, 10000);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // Get article with its private source (needed for Gmail fallback)
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        privateSource: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Artykul nie znaleziony" },
        { status: 404 }
      );
    }

    // If article already has a summary and not forcing regeneration, return it
    if (article.summary && !force) {
      return NextResponse.json({ summary: article.summary });
    }

    // Fetch article content
    let articleContent: string;
    const isGmail =
      article.privateSource?.type === "GMAIL" &&
      article.privateSource.credentials &&
      article.url.includes("mail.google.com");
    const needsGmailRefetch =
      isGmail && (force || !isContentUsable(article.content));

    if (article.content && isContentUsable(article.content) && !needsGmailRefetch) {
      // Use stored content (connector sources: Gmail, LinkedIn, Twitter)
      articleContent = article.content.slice(0, 10000);
    } else if (isGmail && article.privateSource!.credentials) {
      // On-demand fetch from Gmail API (content missing, garbage, or force regeneration)
      try {
        articleContent = await fetchGmailContentOnDemand(
          article.id,
          article.url,
          article.privateSource!.credentials
        );
      } catch (error) {
        console.error("Gmail on-demand fetch failed:", error);
        return NextResponse.json(
          { error: "Nie udalo sie pobrac tresci maila z Gmail" },
          { status: 500 }
        );
      }
    } else {
      // Scrape content from URL (website sources)
      try {
        articleContent = await fetchArticleContent(article.url);
      } catch {
        return NextResponse.json(
          { error: "Nie udalo sie pobrac tresci artykulu" },
          { status: 500 }
        );
      }
    }

    // Generate summary with LLM
    const prompt = `Jestes ekspertem od podsumowywania artykulow technicznych. Twoim zadaniem jest stworzyc wartosciowe, szczegolowe streszczenie artykulu.

TYTUL ARTYKULU: ${article.title}
${article.author ? `AUTOR: ${article.author}` : ""}

TRESC ARTYKULU:
${articleContent}

---

Stworz streszczenie artykulu w jezyku polskim, ktore:

1. MA ZAWIERAC FAKTY I INSIGHTY - konkretne informacje, liczby, wnioski z artykulu
2. MA BYC DLUZSZE - okolo 200-300 slow (1-2 minuty czytania/sluchania TTS)
3. MA BYC WARTOSCIOWE - czytelnik powinien zrozumiec glowny przekaz artykulu bez koniecznosci czytania calego tekstu

STRUKTURA STRESZCZENIA:
- Zacznij od glownej tezy/przekazu artykulu (1-2 zdania)
- Przedstaw kluczowe fakty, dane, przyktady (3-5 punktow)
- Opisz wnioski autora i praktyczne zastosowania
- Zakoncz podsumowaniem dlaczego warto przeczytac caly artykul

WAZNE:
- Pisz plynnym tekstem, nie uzywaj punktorow ani naglowkow
- Uzywaj jezyka polskiego z polskimi znakami
- Badz konkretny - podawaj liczby, nazwy narzedzi, przyklady
- Unikaj ogolnikow typu "autor omawia rozne tematy"

Odpowiedz TYLKO streszczeniem, bez zadnych dodatkowych komentarzy.`;

    const llm = await getLLMProvider();
    const summary = await llm.generateText(prompt, { maxTokens: 1024 });

    // Update article with new summary
    await prisma.article.update({
      where: { id },
      data: { summary },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Nie udalo sie wygenerowac streszczenia" },
      { status: 500 }
    );
  }
}
