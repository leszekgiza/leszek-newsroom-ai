/**
 * Fix publishedAt dates for existing articles by extracting from URL
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const monthMap = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

function extractDateFromUrl(url) {
  try {
    const path = new URL(url).pathname;

    // Pattern 1: /YYYY/MM/DD/ or /YYYY-MM-DD/
    let match = path.match(/\/(\d{4})[/-](\d{2})[/-](\d{2})(?:\/|$|-)/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // Pattern 2: /YYYYMMDD/
    match = path.match(/\/(\d{4})(\d{2})(\d{2})\//);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // Pattern 3: /posts/YYYY-MM-DD-slug/
    match = path.match(/\/posts?\/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // Pattern 4: /YYYY/Mon/DD/ (like simonwillison.net)
    match = path.match(/\/(\d{4})\/([A-Za-z]{3})\/(\d{1,2})(?:\/|$)/);
    if (match) {
      const year = match[1];
      const monthStr = match[2].toLowerCase();
      const day = match[3].padStart(2, '0');
      if (monthMap[monthStr]) {
        return `${year}-${monthMap[monthStr]}-${day}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  // Get all articles without publishedAt
  const articles = await prisma.article.findMany({
    where: { publishedAt: null },
    select: { id: true, url: true, title: true }
  });

  console.log(`Found ${articles.length} articles without publishedAt`);

  let updated = 0;
  for (const article of articles) {
    const dateStr = extractDateFromUrl(article.url);
    if (dateStr) {
      const publishedAt = new Date(dateStr + 'T12:00:00Z');
      await prisma.article.update({
        where: { id: article.id },
        data: { publishedAt }
      });
      console.log(`✓ ${article.title.substring(0, 50)}... -> ${dateStr}`);
      updated++;
    } else {
      console.log(`✗ No date in URL: ${article.url}`);
    }
  }

  console.log(`\nUpdated ${updated} of ${articles.length} articles`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
