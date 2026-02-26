import { Pool } from "pg";

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  intro: string | null;
  summary: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  catalogSourceId: string | null;
  privateSourceId: string | null;
  // FTS-specific fields
  rank: number;
  headline: string | null;
}

export interface SearchOptions {
  query: string;
  subscribedSourceIds: string[];
  privateSourceIds: string[];
  dismissedArticleIds: string[];
  sourceFilter?: string | null;
  author?: string;
  limit?: number;
  offset?: number;
}

/**
 * Performs PostgreSQL Full-Text Search with Polish language support
 *
 * Field weights:
 * - A (highest): title
 * - B (medium): intro
 * - C (lowest): summary
 *
 * @param pool - PostgreSQL connection pool
 * @param options - Search options
 * @returns Object with articles array and total count
 */
export async function searchArticles(
  pool: Pool,
  options: SearchOptions
): Promise<{ articles: SearchResult[]; total: number }> {
  const {
    query,
    subscribedSourceIds,
    privateSourceIds,
    dismissedArticleIds,
    sourceFilter,
    author,
    limit = 50,
    offset = 0,
  } = options;

  // Sanitize search query - keep Polish diacritics
  const sanitizedQuery = query
    .trim()
    .replace(/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitizedQuery || sanitizedQuery.length < 2) {
    return { articles: [], total: 0 };
  }

  // Convert query to prefix search format for partial word matching
  // "agent LLM" -> "agent:* & LLM:*" (matches "agents", "LLMs", etc.)
  const prefixQuery = sanitizedQuery
    .split(" ")
    .filter((word) => word.length >= 2)
    .map((word) => `${word}:*`)
    .join(" & ");

  if (!prefixQuery) {
    return { articles: [], total: 0 };
  }

  // Filter sources based on sourceFilter parameter
  let catalogIds = subscribedSourceIds;
  let privateIds = privateSourceIds;

  if (sourceFilter) {
    if (subscribedSourceIds.includes(sourceFilter)) {
      catalogIds = [sourceFilter];
      privateIds = [];
    } else if (privateSourceIds.includes(sourceFilter)) {
      catalogIds = [];
      privateIds = [sourceFilter];
    }
  }

  // If no sources to search, return empty
  if (catalogIds.length === 0 && privateIds.length === 0) {
    return { articles: [], total: 0 };
  }

  // Build source filter conditions
  const sourceConditions: string[] = [];
  if (catalogIds.length > 0) {
    sourceConditions.push("a.catalog_source_id = ANY($2::text[])");
  }
  if (privateIds.length > 0) {
    sourceConditions.push("a.private_source_id = ANY($3::text[])");
  }
  const sourceFilter_sql = sourceConditions.join(" OR ");

  // Build params dynamically with correct $N numbering
  // $1=prefixQuery, $2=catalogIds, $3=privateIds, $4=limit, $5=offset, then optional
  const params: (string | string[] | number)[] = [
    prefixQuery,
    catalogIds,
    privateIds,
    limit,
    offset,
  ];
  let nextParam = 6;

  // Build dismissed filter
  let dismissedFilter = "";
  if (dismissedArticleIds.length > 0) {
    dismissedFilter = `AND a.id != ALL($${nextParam}::text[])`;
    params.push(dismissedArticleIds);
    nextParam++;
  }

  // Build author filter
  let authorFilter = "";
  if (author) {
    authorFilter = `AND a.author = $${nextParam}`;
    params.push(author);
    nextParam++;
  }

  // Build the search query
  const searchQuery = `
    WITH search_results AS (
      SELECT
        a.id,
        a.url,
        a.title,
        a.intro,
        a.summary,
        a.image_url,
        a.author,
        a.published_at,
        a.created_at,
        a.catalog_source_id,
        a.private_source_id,
        ts_rank_cd(a.search_vector, to_tsquery('polish_simple', $1), 32) as rank,
        ts_headline(
          'polish_simple',
          COALESCE(a.title, '') || ' ' || COALESCE(a.intro, ''),
          to_tsquery('polish_simple', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=1'
        ) as headline
      FROM articles a
      WHERE
        a.search_vector @@ to_tsquery('polish_simple', $1)
        AND (${sourceFilter_sql})
        ${dismissedFilter}
        ${authorFilter}
    )
    SELECT
      *,
      COUNT(*) OVER() as total_count
    FROM search_results
    ORDER BY rank DESC, published_at DESC NULLS LAST
    LIMIT $4 OFFSET $5
  `;

  try {
    const result = await pool.query(searchQuery, params);

    const total =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

    const articles: SearchResult[] = result.rows.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      intro: row.intro,
      summary: row.summary,
      imageUrl: row.image_url,
      author: row.author,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      catalogSourceId: row.catalog_source_id,
      privateSourceId: row.private_source_id,
      rank: parseFloat(row.rank),
      headline: row.headline,
    }));

    return { articles, total };
  } catch (error) {
    console.error("Search error:", error);
    // Fallback - return empty results on error
    return { articles: [], total: 0 };
  }
}
