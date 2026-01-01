import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  // All articles
  const articles = await prisma.article.findMany();
  console.log('Total articles:', articles.length);

  // All users
  const users = await prisma.user.findMany();
  console.log('\nUsers:');
  users.forEach(u => console.log('  -', u.id, u.email));

  // Dismissed articles per user
  const dismissed = await prisma.dismissedArticle.findMany({
    include: { user: true, article: true }
  });
  console.log('\nDismissed articles:', dismissed.length);
  dismissed.forEach(d => console.log('  -', d.user.email, '|', d.article.title.substring(0, 30)));

  // Subscriptions per user
  for (const user of users) {
    const subs = await prisma.userSubscription.findMany({
      where: { userId: user.id }
    });
    console.log(`\nSubscriptions for ${user.email}:`, subs.length);
  }

  await prisma.$disconnect();
  await pool.end();
}
check();
