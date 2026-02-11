/**
 * AI Service - LLM integration for translations and summaries
 */

import { getLLMProvider } from "@/lib/ai/llm";

/**
 * Generate a Polish 2-sentence intro from article content
 */
export async function generatePolishIntro(
  title: string,
  content: string
): Promise<string> {
  try {
    // Limit content to avoid token limits
    const truncatedContent = content.slice(0, 3000);

    const prompt = `Napisz krotkie wprowadzenie (2 zdania, max 50 slow) do artykulu w jezyku polskim.

TYTUL: ${title}

TRESC:
${truncatedContent}

ZASADY:
- Napisz DOKLADNIE 2 zdania
- Uzywaj polskiego jezyka z polskimi znakami
- Przedstaw glowny temat i najciekawszy fakt/wniosek
- Nie uzywaj slow "artykul", "autor", "tekst"
- Zacznij od sedna sprawy

Odpowiedz TYLKO wprowadzeniem, bez komentarzy.`;

    const llm = await getLLMProvider();
    return await llm.generateText(prompt, { maxTokens: 200 });
  } catch (error) {
    console.error("[AI] Error generating Polish intro:", error);
    return "";
  }
}
