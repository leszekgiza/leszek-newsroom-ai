import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getLLMProvider } from "@/lib/ai/llm";

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

    // Get article
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Artykul nie znaleziony" },
        { status: 404 }
      );
    }

    // If article already has a summary, return it without regenerating
    if (article.summary) {
      return NextResponse.json({ summary: article.summary });
    }

    // Fetch article content
    let articleContent: string;
    try {
      articleContent = await fetchArticleContent(article.url);
    } catch {
      return NextResponse.json(
        { error: "Nie udalo sie pobrac tresci artykulu" },
        { status: 500 }
      );
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
