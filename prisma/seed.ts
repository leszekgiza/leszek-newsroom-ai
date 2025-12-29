import { PrismaClient, Theme, PrivateSourceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test user
  const passwordHash = await bcrypt.hash("Test123!", 10);
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      passwordHash,
      name: "Test User",
      theme: Theme.SYSTEM,
    },
  });
  console.log("Created user:", user.email);

  // Create main user (leszek.giza@gmail.com)
  const leszekPasswordHash = await bcrypt.hash("Maja1234!", 10);
  const leszekUser = await prisma.user.upsert({
    where: { email: "leszek.giza@gmail.com" },
    update: {},
    create: {
      email: "leszek.giza@gmail.com",
      passwordHash: leszekPasswordHash,
      name: "Leszek Giza",
      theme: Theme.SYSTEM,
    },
  });
  console.log("Created user:", leszekUser.email);

  // Create catalog sources (public blogs)
  const catalogSources = [
    {
      name: "One Useful Thing",
      url: "https://www.oneusefulthing.org/",
      description: "AI insights by Ethan Mollick",
      category: "AI/ML",
      logoUrl: null,
    },
    {
      name: "Simon Willison",
      url: "https://simonwillison.net/",
      description: "Web development and AI tools",
      category: "Tech",
      logoUrl: null,
    },
    {
      name: "Eugene Yan",
      url: "https://eugeneyan.com/",
      description: "ML engineering and applied AI",
      category: "AI/ML",
      logoUrl: null,
    },
    {
      name: "Lilian Weng",
      url: "https://lilianweng.github.io/",
      description: "Deep learning research",
      category: "AI/ML",
      logoUrl: null,
    },
    {
      name: "Hugging Face Blog",
      url: "https://huggingface.co/blog",
      description: "NLP and ML models",
      category: "AI/ML",
      logoUrl: null,
    },
    {
      name: "Chip Huyen",
      url: "https://huyenchip.com/blog/",
      description: "MLOps and ML systems",
      category: "AI/ML",
      logoUrl: null,
    },
  ];

  const createdSources = [];
  for (const source of catalogSources) {
    const created = await prisma.catalogSource.upsert({
      where: { url: source.url },
      update: {},
      create: source,
    });
    createdSources.push(created);
    console.log("Created catalog source:", created.name);
  }

  // Subscribe users to all catalog sources
  for (const source of createdSources) {
    // Subscribe test user
    await prisma.userSubscription.upsert({
      where: {
        userId_catalogSourceId: {
          userId: user.id,
          catalogSourceId: source.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        catalogSourceId: source.id,
      },
    });
    // Subscribe leszek user
    await prisma.userSubscription.upsert({
      where: {
        userId_catalogSourceId: {
          userId: leszekUser.id,
          catalogSourceId: source.id,
        },
      },
      update: {},
      create: {
        userId: leszekUser.id,
        catalogSourceId: source.id,
      },
    });
  }
  console.log("Subscribed users to all catalog sources");

  // Create sample articles
  const sampleArticles = [
    {
      url: "https://www.oneusefulthing.org/p/how-to-use-ai-to-do-stuff-an-opinionated",
      title: "How to Use AI to Do Stuff: An Opinionated Guide",
      intro:
        "Praktyczny przewodnik po zastosowaniach AI w codziennej pracy. Autor przedstawia konkretne narzedzia i techniki wykorzystania sztucznej inteligencji.",
      summary:
        "Artykul przedstawia kompleksowy przewodnik po praktycznych zastosowaniach AI. Ethan Mollick omawia rozne kategorie narzedzi AI, od asystentow pisania po generatory obrazow. Wskazuje na najlepsze praktyki i typowe pulapki. Podkresla znaczenie eksperymentowania z roznymi podejsciami.",
      imageUrl: null,
      author: "Ethan Mollick",
      publishedAt: new Date("2024-12-20"),
      catalogSourceId: createdSources[0].id,
    },
    {
      url: "https://simonwillison.net/2024/Nov/25/ask-questions-of-sqlite/",
      title: "Ask questions of SQLite databases in your terminal",
      intro:
        "Simon Willison prezentuje sqlite-utils-ask - plugin do zadawania pytan bazom SQLite w naturalnym jezyku za pomoca LLM.",
      summary:
        "Artykul przedstawia nowy plugin sqlite-utils-ask do narzedzia CLI sqlite-utils. Pozwala zadawac pytania w naturalnym jezyku bazom SQLite i plikom CSV/JSON. LLM analizuje schemat bazy i generuje odpowiednie zapytania SQL. Praktyczne narzedzie do szybkiej analizy danych.",
      imageUrl: null,
      author: "Simon Willison",
      publishedAt: new Date("2024-11-25"),
      catalogSourceId: createdSources[1].id,
    },
    {
      url: "https://eugeneyan.com/writing/llm-patterns/",
      title: "Patterns for Building LLM-based Systems & Products",
      intro:
        "Eugene Yan przedstawia sprawdzone wzorce architektoniczne dla systemow opartych na LLM. Artykul bazuje na doswiadczeniach z Amazon.",
      summary:
        "Kompleksowy przeglad wzorcow projektowych dla systemow LLM. Autor omawia RAG, fine-tuning, ewaluacje i monitoring. Przedstawia praktyczne wskazowki dotyczace wyboru architektury. Bazuje na realnych wdrozeniach produkcyjnych.",
      imageUrl: null,
      author: "Eugene Yan",
      publishedAt: new Date("2024-12-15"),
      catalogSourceId: createdSources[2].id,
    },
    {
      url: "https://lilianweng.github.io/posts/2024-11-28-reward-hacking/",
      title: "Reward Hacking in Reinforcement Learning",
      intro:
        "Gleboka analiza problemu reward hackingu w uczeniu ze wzmocnieniem. Lilian Weng omawia przyczyny i mozliwe rozwiazania.",
      summary:
        "Artykul przedstawia fenomen reward hackingu w RL. Autorka analizuje przypadki gdy modele znajduja nieoczekiwane sposoby maksymalizacji nagrody. Omawia techniki mitygacji tego problemu. Przedstawia najnowsze badania w tej dziedzinie.",
      imageUrl: null,
      author: "Lilian Weng",
      publishedAt: new Date("2024-11-28"),
      catalogSourceId: createdSources[3].id,
    },
    {
      url: "https://huggingface.co/blog/smollm",
      title: "SmolLM - blazingly fast and remarkably powerful",
      intro:
        "Hugging Face prezentuje SmolLM - rodzine malych, ale wydajnych modeli jezykowych w rozmiarach 135M, 360M i 1.7B parametrow.",
      summary:
        "Artykul przedstawia SmolLM, rodzine kompaktowych modeli LLM. Modele zostaly wytrenowane na starannie dobranym zbiorze SmolLM-Corpus. Oferuja doskonaly stosunek jakosci do rozmiaru. Zoptymalizowane pod katem wdrozen mobilnych i edge. Dostepne na licencji open source.",
      imageUrl: null,
      author: "Hugging Face Team",
      publishedAt: new Date("2024-07-16"),
      catalogSourceId: createdSources[4].id,
    },
    {
      url: "https://huyenchip.com/2023/04/11/llm-engineering.html",
      title: "Building LLM applications for production",
      intro:
        "Chip Huyen omawia wyzwania budowania aplikacji opartych na LLM w produkcji. Praktyczne wskazowki z doswiadczen w Netflix, NVIDIA i Snorkel AI.",
      summary:
        "Artykul przedstawia wyzwania wdrazania LLM w produkcji. Autorka omawia problemy z halucynacjami, kosztami i latencja. Przedstawia strategie prompt engineeringu i fine-tuningu. Bazuje na doswiadczeniach z najwiekszych firm technologicznych.",
      imageUrl: null,
      author: "Chip Huyen",
      publishedAt: new Date("2023-04-11"),
      catalogSourceId: createdSources[5].id,
    },
  ];

  for (const article of sampleArticles) {
    await prisma.article.upsert({
      where: { url: article.url },
      update: {},
      create: article,
    });
    console.log("Created article:", article.title.substring(0, 50) + "...");
  }

  // Save one article for the user
  const firstArticle = await prisma.article.findFirst({
    where: { catalogSourceId: createdSources[0].id },
  });
  if (firstArticle) {
    await prisma.savedArticle.upsert({
      where: {
        userId_articleId: {
          userId: user.id,
          articleId: firstArticle.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        articleId: firstArticle.id,
      },
    });
    console.log("Saved article for user");
  }

  // Mark some articles as read
  const articlesToMark = await prisma.article.findMany({ take: 3 });
  for (const article of articlesToMark) {
    await prisma.readArticle.upsert({
      where: {
        userId_articleId: {
          userId: user.id,
          articleId: article.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        articleId: article.id,
      },
    });
  }
  console.log("Marked 3 articles as read");

  // Create a sample private source
  await prisma.privateSource.upsert({
    where: {
      userId_url: {
        userId: user.id,
        url: "https://strefainwestora.pl/",
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: "Strefa Inwestora",
      url: "https://strefainwestora.pl/",
      type: PrivateSourceType.WEBSITE,
      config: {
        articleSelector: "article",
        titleSelector: "h1",
        requiresAuth: true,
      },
    },
  });
  console.log("Created private source for user");

  console.log("\nSeeding completed!");
  console.log("\nTest credentials:");
  console.log("  Email: test@example.com");
  console.log("  Password: Test123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
