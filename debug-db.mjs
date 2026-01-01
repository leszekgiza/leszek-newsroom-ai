import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  // Artykuły i ich źródła
  const articles = await prisma.article.findMany({
    select: { id: true, title: true, catalogSourceId: true, privateSourceId: true }
  });
  console.log('Articles with sources:');
  articles.forEach(a => console.log('  -', a.title.substring(0,40), '| catalogSourceId:', a.catalogSourceId));

  // Subskrypcje użytkownika leszek
  const user = await prisma.user.findFirst({ where: { email: 'leszek.giza@gmail.com' }});
  if (user) {
    const subs = await prisma.userSubscription.findMany({
      where: { userId: user.id },
      include: { catalogSource: { select: { name: true } } }
    });
    console.log('\nLeszek subscriptions:', subs.length);
    subs.forEach(s => console.log('  -', s.catalogSourceId, s.catalogSource?.name));
  }

  // Catalog sources
  const sources = await prisma.catalogSource.findMany({ select: { id: true, name: true } });
  console.log('\nAll catalog sources:', sources.length);
  sources.forEach(s => console.log('  -', s.id, s.name));

  await prisma.$disconnect();
  await pool.end();
}
check();
