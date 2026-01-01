import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const articles = await prisma.article.findMany({
    select: { title: true, publishedAt: true, createdAt: true },
    orderBy: { publishedAt: 'desc' }
  });
  console.log('Artykuły w bazie:\n');
  console.log('publishedAt    | createdAt      | Tytuł');
  console.log('---------------|----------------|----------------------------------------');
  articles.forEach(a => {
    const pub = a.publishedAt ? a.publishedAt.toISOString().split('T')[0] : 'brak';
    const created = a.createdAt.toISOString().split('T')[0];
    console.log(`${pub}      | ${created}      | ${a.title.substring(0,40)}`);
  });
  await prisma.$disconnect();
  await pool.end();
}
check();
