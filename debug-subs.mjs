import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  // Get test user
  const testUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  });
  console.log('Test User ID:', testUser?.id);

  // Get subscriptions for test user
  const subs = await prisma.userSubscription.findMany({
    where: { userId: testUser?.id },
    include: { catalogSource: true }
  });
  console.log('\nSubscriptions for test@example.com:', subs.length);
  subs.forEach(s => console.log('  -', s.catalogSourceId, s.catalogSource?.name));

  // Get all articles with their sources
  const articles = await prisma.article.findMany({
    include: { catalogSource: true }
  });
  console.log('\nAll articles and their sources:');
  articles.forEach(a => console.log('  -', a.catalogSourceId, '|', a.catalogSource?.name, '|', a.title.substring(0,30)));

  // Check if article sources match subscriptions
  const subIds = new Set(subs.map(s => s.catalogSourceId));
  console.log('\nSubscribed source IDs:', [...subIds]);

  const articleSourceIds = new Set(articles.map(a => a.catalogSourceId));
  console.log('Article source IDs:', [...articleSourceIds]);

  // Check overlap
  const matching = articles.filter(a => subIds.has(a.catalogSourceId));
  console.log('\nArticles matching subscriptions:', matching.length);

  await prisma.$disconnect();
  await pool.end();
}
check();
