import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reset() {
  const deleted = await prisma.dismissedArticle.deleteMany({});
  console.log('Deleted dismissed articles:', deleted.count);
  await prisma.$disconnect();
  await pool.end();
}
reset();
