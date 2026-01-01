import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const articles = await prisma.article.findMany({ take: 5 });
  console.log('Articles count:', articles.length);
  articles.forEach(a => console.log('- ' + a.title));

  const users = await prisma.user.findMany();
  console.log('\nUsers:');
  users.forEach(u => console.log('- ' + u.email));

  const subs = await prisma.userSubscription.findMany();
  console.log('\nSubscriptions count:', subs.length);

  const dismissed = await prisma.dismissedArticle.findMany();
  console.log('Dismissed count:', dismissed.length);
}

main().then(() => prisma.$disconnect());
