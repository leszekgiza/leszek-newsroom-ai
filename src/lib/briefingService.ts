/**
 * Briefing Service - orchestrates morning audio briefings
 *
 * Flow:
 * 1. Get articles from today's edition
 * 2. AI curation: select top 3 + rank rest (max 12)
 * 3. Generate intro script (podcast-style narrative for top 3)
 * 4. TTS generation for intro (segments reuse existing per-article TTS)
 * 5. Update status → ready, send push notification
 */

import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/ai/llm";
import { getEditionWithArticles } from "@/lib/editionService";
import { sendPushNotification } from "@/lib/pushService";

const MAX_ARTICLES = 12;

interface CurationResult {
  top3Ids: string[];
  rankedIds: string[];
}

/**
 * Generate briefing for a single user
 */
export async function generateBriefing(userId: string): Promise<string | null> {
  // Find today's edition
  const today = new Date();
  const todayStart = new Date(today.toISOString().split("T")[0]);

  const edition = await prisma.edition.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayStart,
      },
    },
  });

  if (!edition) {
    console.log(`[Briefing] No edition found for user ${userId}`);
    return null;
  }

  // Check if briefing already exists for today
  const existing = await prisma.briefing.findFirst({
    where: {
      userId,
      date: todayStart,
    },
  });

  if (existing && existing.status === "ready") {
    console.log(`[Briefing] Briefing already exists for user ${userId}`);
    return existing.id;
  }

  // Get articles with full data
  const editionData = await getEditionWithArticles(edition.id, userId);
  if (!editionData || editionData.articles.length === 0) {
    console.log(`[Briefing] No articles in edition for user ${userId}`);
    return null;
  }

  // Create or update briefing record
  const briefing = existing
    ? await prisma.briefing.update({
        where: { id: existing.id },
        data: { status: "generating" },
      })
    : await prisma.briefing.create({
        data: {
          userId,
          editionId: edition.id,
          date: todayStart,
          status: "generating",
          articleIds: [],
          top3Ids: [],
        },
      });

  try {
    // Step 1: AI Curation
    const curation = await curateArticles(editionData.articles);

    // Step 2: Generate intro script for top 3
    const top3Articles = curation.top3Ids
      .map((id) => editionData.articles.find((a) => a.id === id))
      .filter(Boolean);

    const introScript = await generateIntroScript(
      top3Articles as typeof editionData.articles,
      editionData.articles.length
    );

    // Step 3: Update briefing with results
    await prisma.briefing.update({
      where: { id: briefing.id },
      data: {
        status: "ready",
        articleIds: curation.rankedIds,
        top3Ids: curation.top3Ids,
        introScript,
      },
    });

    // Step 4: Send push notification
    const totalArticles = curation.rankedIds.length;
    const estimatedMinutes = Math.max(5, Math.round(totalArticles * 1.5 + 2));
    await sendPushNotification(userId, {
      title: "Poranny briefing gotowy",
      body: `${totalArticles} artykułów, ~${estimatedMinutes} min`,
      url: "/briefing",
    });

    console.log(`[Briefing] Generated briefing ${briefing.id} for user ${userId}`);
    return briefing.id;
  } catch (error) {
    console.error(`[Briefing] Failed for user ${userId}:`, error);
    await prisma.briefing.update({
      where: { id: briefing.id },
      data: { status: "failed" },
    });
    return null;
  }
}

/**
 * AI Curation: select top 3 and rank rest
 */
async function curateArticles(
  articles: Array<{ id: string; title: string; intro: string | null }>
): Promise<CurationResult> {
  if (articles.length <= 3) {
    const ids = articles.map((a) => a.id);
    return { top3Ids: ids, rankedIds: ids };
  }

  const articleList = articles
    .map((a, i) => `[${i}] ${a.title}${a.intro ? ` — ${a.intro}` : ""}`)
    .join("\n");

  const prompt = `Jesteś kuratorem poranniego briefingu newsowego. Przeanalizuj poniższe artykuły i:
1. Wybierz 3 najważniejsze artykuły (te, które mają największy wpływ lub są najciekawsze)
2. Uszereguj pozostałe artykuły wg istotności
3. Ogranicz listę do max ${MAX_ARTICLES} artykułów

ARTYKUŁY:
${articleList}

Odpowiedz w formacie JSON (TYLKO JSON, bez dodatkowego tekstu):
{
  "top3": [indeks1, indeks2, indeks3],
  "rest": [indeks4, indeks5, ...]
}

Używaj indeksów z nawiasów kwadratowych [N].`;

  try {
    const llm = await getLLMProvider();
    const response = await llm.generateText(prompt, { maxTokens: 500 });

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);

    const top3Ids = (result.top3 as number[])
      .filter((i) => i >= 0 && i < articles.length)
      .slice(0, 3)
      .map((i) => articles[i].id);

    const restIds = (result.rest as number[])
      .filter((i) => i >= 0 && i < articles.length)
      .slice(0, MAX_ARTICLES - 3)
      .map((i) => articles[i].id);

    return {
      top3Ids,
      rankedIds: [...top3Ids, ...restIds],
    };
  } catch (error) {
    console.error("[Briefing] Curation failed, using fallback:", error);
    // Fallback: first 3 as top, rest in order
    const ids = articles.slice(0, MAX_ARTICLES).map((a) => a.id);
    return {
      top3Ids: ids.slice(0, 3),
      rankedIds: ids,
    };
  }
}

/**
 * Generate intro script: podcast-style narrative about top 3 articles
 */
async function generateIntroScript(
  top3Articles: Array<{
    id: string;
    title: string;
    intro: string | null;
    summary: string | null;
  }>,
  totalCount: number
): Promise<string> {
  const today = new Date();
  const dayNum = today.getDate();
  const months = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
  ];
  const dateStr = `${dayNum} ${months[today.getMonth()]}`;

  const articlesContext = top3Articles
    .map(
      (a, i) =>
        `ARTYKUŁ ${i + 1}: ${a.title}\n${a.summary || a.intro || "Brak streszczenia"}`
    )
    .join("\n\n");

  const prompt = `Napisz skrypt porannego briefingu audio po polsku (~400-600 słów, ~2 minuty czytania).

KONTEKST:
- Data: ${dateStr}
- Łącznie ${totalCount} nowych artykułów
- Poniżej 3 najważniejsze artykuły dnia

${articlesContext}

ZASADY:
- Zacznij od powitania: "Dzień dobry! Oto Twój poranny briefing na ${dateStr}."
- Wspomnij ile jest nowych artykułów łącznie
- Omów 3 najważniejsze artykuły w spójnej narracji
- Używaj płynnych przejść między artykułami (nie "Po pierwsze", "Po drugie")
- Ton: profesjonalny ale ciepły, jak prezenter radia
- Podaj konkretne fakty, liczby, cytaty z artykułów
- Zakończ: "To najważniejsze na dziś. Pozostałe artykuły znajdziesz w swoim feedzie."
- NIE używaj markdown, nagłówków, list — pisz ciągłym tekstem
- NIE wymyślaj informacji — bazuj TYLKO na danych z artykułów

Odpowiedz TYLKO skryptem narracji.`;

  const llm = await getLLMProvider();
  return llm.generateText(prompt, { maxTokens: 1000 });
}

/**
 * Get latest briefing for a user
 */
export async function getLatestBriefing(userId: string) {
  return prisma.briefing.findFirst({
    where: { userId, status: "ready" },
    orderBy: { date: "desc" },
    include: {
      edition: {
        select: { id: true, date: true, title: true },
      },
    },
  });
}

/**
 * Generate briefings for all eligible users
 * Called by cron job
 */
export async function generateAllBriefings(): Promise<{
  processed: number;
  generated: number;
  failed: number;
}> {
  const users = await prisma.user.findMany({
    where: { briefingEnabled: true },
    select: { id: true, briefingTime: true },
  });

  let processed = 0;
  let generated = 0;
  let failed = 0;

  for (const user of users) {
    processed++;
    const briefingId = await generateBriefing(user.id);
    if (briefingId) {
      generated++;
    } else {
      failed++;
    }
  }

  return { processed, generated, failed };
}
