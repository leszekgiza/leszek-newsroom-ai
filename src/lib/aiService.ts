/**
 * AI Service - Claude API integration for translations and summaries
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Napisz krotkie wprowadzenie (2 zdania, max 50 slow) do artykulu w jezyku polskim.

TYTUL: ${title}

TRESC:
${truncatedContent}

ZASADY:
- Napisz DOKLADNIE 2 zdania
- Uzywaj polskiego jezyka z polskimi znakami
- Przedstaw glowny temat i najciekawszy fakt/wniosek
- Nie uzywaj slow "artykul", "autor", "tekst"
- Zacznij od sedna sprawy

Odpowiedz TYLKO wprowadzeniem, bez komentarzy.`,
        },
      ],
    });

    return (message.content[0] as { type: string; text: string }).text.trim();
  } catch (error) {
    console.error("[AI] Error generating Polish intro:", error);
    return "";
  }
}
