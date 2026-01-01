import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'leszek.giza@gmail.com' }});
  console.log('User:', user?.id, user?.email);

  // Hidden sources
  const hidden = await prisma.hiddenCatalogSource.findMany({
    where: { userId: user.id },
  });
  console.log('\nHidden sources:', hidden.length);
  hidden.forEach(h => console.log('  -', h.catalogSourceId));

  // Dismissed articles
  const dismissed = await prisma.dismissedArticle.findMany({
    where: { userId: user.id },
  });
  console.log('\nDismissed articles:', dismissed.length);
  dismissed.forEach(d => console.log('  -', d.articleId));

  // Simulate the API query
  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId: user.id },
    select: { catalogSourceId: true },
  });
  const subscribedSourceIds = subscriptions.map((s) => s.catalogSourceId);
  const hiddenSourceIds = hidden.map((h) => h.catalogSourceId);

  const visibleSourceIds = subscribedSourceIds.filter((id) => !hiddenSourceIds.includes(id));
  console.log('\nVisible source IDs:', visibleSourceIds.length);

  // Query articles like the API does
  const whereClause = {
    OR: [
      { catalogSourceId: { in: visibleSourceIds } },
      { privateSourceId: { in: [] } },
    ],
  };

  const dismissedIds = dismissed.map((d) => d.articleId);
  if (dismissedIds.length > 0) {
    whereClause.NOT = { id: { in: dismissedIds } };
  }

  const articles = await prisma.article.findMany({
    where: whereClause,
    orderBy: { publishedAt: 'desc' },
  });
  console.log('\nArticles returned by API-like query:', articles.length);
  articles.forEach(a => console.log('  -', a.title.substring(0, 50)));

  await prisma.$disconnect();
  await pool.end();
}
check();
