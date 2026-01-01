import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const urlFixes = [
  {
    oldUrl: "https://www.oneusefulthing.org/p/how-to-use-ai-to-do-stuff",
    newUrl: "https://www.oneusefulthing.org/p/how-to-use-ai-to-do-stuff-an-opinionated",
  },
  {
    oldUrl: "https://simonwillison.net/2024/Dec/19/llm-and-sqlite/",
    newUrl: "https://simonwillison.net/2024/Nov/25/ask-questions-of-sqlite/",
    newTitle: "Ask questions of SQLite databases in your terminal",
    newIntro: "Simon Willison prezentuje sqlite-utils-ask - plugin do zadawania pytan bazom SQLite w naturalnym jezyku za pomoca LLM.",
    newSummary: "Artykul przedstawia nowy plugin sqlite-utils-ask do narzedzia CLI sqlite-utils. Pozwala zadawac pytania w naturalnym jezyku bazom SQLite i plikom CSV/JSON. LLM analizuje schemat bazy i generuje odpowiednie zapytania SQL. Praktyczne narzedzie do szybkiej analizy danych.",
    newPublishedAt: new Date("2024-11-25"),
  },
  {
    oldUrl: "https://huggingface.co/blog/smollm2",
    newUrl: "https://huggingface.co/blog/smollm",
    newTitle: "SmolLM - blazingly fast and remarkably powerful",
    newIntro: "Hugging Face prezentuje SmolLM - rodzine malych, ale wydajnych modeli jezykowych w rozmiarach 135M, 360M i 1.7B parametrow.",
    newSummary: "Artykul przedstawia SmolLM, rodzine kompaktowych modeli LLM. Modele zostaly wytrenowane na starannie dobranym zbiorze SmolLM-Corpus. Oferuja doskonaly stosunek jakosci do rozmiaru. Zoptymalizowane pod katem wdrozen mobilnych i edge. Dostepne na licencji open source.",
    newPublishedAt: new Date("2024-07-16"),
  },
  {
    oldUrl: "https://huyenchip.com/2024/12/05/mlops-best-practices.html",
    newUrl: "https://huyenchip.com/2023/04/11/llm-engineering.html",
    newTitle: "Building LLM applications for production",
    newIntro: "Chip Huyen omawia wyzwania budowania aplikacji opartych na LLM w produkcji. Praktyczne wskazowki z doswiadczen w Netflix, NVIDIA i Snorkel AI.",
    newSummary: "Artykul przedstawia wyzwania wdrazania LLM w produkcji. Autorka omawia problemy z halucynacjami, kosztami i latencja. Przedstawia strategie prompt engineeringu i fine-tuningu. Bazuje na doswiadczeniach z najwiekszych firm technologicznych.",
    newPublishedAt: new Date("2023-04-11"),
  },
];

async function fixUrls() {
  for (const fix of urlFixes) {
    const article = await prisma.article.findFirst({
      where: { url: fix.oldUrl },
    });

    if (article) {
      const updateData = { url: fix.newUrl };
      if (fix.newTitle) updateData.title = fix.newTitle;
      if (fix.newIntro) updateData.intro = fix.newIntro;
      if (fix.newSummary) updateData.summary = fix.newSummary;
      if (fix.newPublishedAt) updateData.publishedAt = fix.newPublishedAt;

      await prisma.article.update({
        where: { id: article.id },
        data: updateData,
      });
      console.log(`Fixed: ${fix.oldUrl} -> ${fix.newUrl}`);
    } else {
      console.log(`Not found: ${fix.oldUrl}`);
    }
  }

  console.log('\nVerifying URLs:');
  const articles = await prisma.article.findMany({
    select: { title: true, url: true },
  });
  articles.forEach(a => console.log(`  ${a.title.substring(0, 40)} -> ${a.url}`));

  await prisma.$disconnect();
  await pool.end();
}

fixUrls();
