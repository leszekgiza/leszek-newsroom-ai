/**
 * Pattern extraction utilities for Source Onboarding Wizard
 * Analyzes user-selected URLs to extract common URL patterns
 */

export interface ExtractedPattern {
  pattern: string; // e.g., "/analizy/"
  matchCount: number; // how many selected URLs match
  sampleUrls: string[]; // up to 3 example URLs
  depth: number; // pattern depth (1 = /foo/, 2 = /foo/bar/)
}

export interface DiscoveredLink {
  url: string;
  title: string;
  path: string; // URL path without domain
}

export interface SourceConfig {
  includePatterns: string[];
  excludePatterns?: string[];
  patternVersion: number;
  lastConfiguredAt: string;
  sampleUrls?: string[];
}

/**
 * Default patterns to exclude (common non-article pages)
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  "/o-nas",
  "/about",
  "/kontakt",
  "/contact",
  "/regulamin",
  "/terms",
  "/polityka-prywatnosci",
  "/privacy",
  "/tag/",
  "/tags/",
  "/category/",
  "/categories/",
  "/author/",
  "/autor/",
  "/search",
  "/szukaj",
  "/login",
  "/logowanie",
  "/register",
  "/rejestracja",
  "/rss",
  "/feed",
  "/sitemap",
];

/**
 * Extract URL patterns from user-selected article URLs
 *
 * Algorithm:
 * 1. Parse each URL into path segments
 * 2. Generate prefix patterns at different depths (1-3 segments)
 * 3. Count how many selected URLs match each pattern
 * 4. Return patterns sorted by match count, preferring shorter patterns
 */
export function extractPatternsFromUrls(
  selectedUrls: string[],
  allDiscoveredUrls?: string[]
): ExtractedPattern[] {
  if (selectedUrls.length === 0) return [];

  // Parse URLs into path segments
  const urlSegments = selectedUrls.map((url) => {
    try {
      const parsed = new URL(url);
      return {
        url,
        segments: parsed.pathname.split("/").filter(Boolean),
      };
    } catch {
      return { url, segments: [] };
    }
  });

  // Generate pattern candidates at different depths
  const patternCandidates = new Map<string, Set<string>>();

  for (const { url, segments } of urlSegments) {
    if (segments.length === 0) continue;

    // Generate patterns at depth 1, 2, and 3
    for (let depth = 1; depth <= Math.min(3, segments.length); depth++) {
      // Skip if segment looks like an article slug (has many hyphens)
      const lastSegment = segments[depth - 1];
      if (depth > 1 && (lastSegment.match(/-/g) || []).length > 2) {
        continue;
      }

      // Skip date-like segments
      if (/^\d{4}$/.test(lastSegment) || /^\d{8}$/.test(lastSegment)) {
        continue;
      }

      const pattern = "/" + segments.slice(0, depth).join("/") + "/";

      if (!patternCandidates.has(pattern)) {
        patternCandidates.set(pattern, new Set());
      }
      patternCandidates.get(pattern)!.add(url);
    }
  }

  // Convert to array and calculate stats
  const patterns: ExtractedPattern[] = [];
  const usedUrls = new Set<string>();

  // Sort by pattern length (shorter first) to prefer more general patterns
  const sortedCandidates = Array.from(patternCandidates.entries()).sort(
    (a, b) => a[0].length - b[0].length
  );

  for (const [pattern, matchedUrls] of sortedCandidates) {
    // Skip if all matched URLs already covered by a shorter pattern
    const newUrls = Array.from(matchedUrls).filter((u) => !usedUrls.has(u));

    if (newUrls.length === 0) continue;

    // Calculate depth
    const depth = pattern.split("/").filter(Boolean).length;

    // Count total matches in all discovered URLs (if provided)
    let totalMatchCount = newUrls.length;
    if (allDiscoveredUrls) {
      totalMatchCount = allDiscoveredUrls.filter((url) => {
        try {
          const path = new URL(url).pathname;
          return path.startsWith(pattern.slice(0, -1)); // Remove trailing slash for comparison
        } catch {
          return false;
        }
      }).length;
    }

    patterns.push({
      pattern,
      matchCount: totalMatchCount,
      sampleUrls: newUrls.slice(0, 3),
      depth,
    });

    // Mark URLs as used
    newUrls.forEach((u) => usedUrls.add(u));
  }

  // Sort by match count (descending)
  return patterns.sort((a, b) => b.matchCount - a.matchCount);
}

/**
 * Check if a URL matches any of the include patterns
 */
export function urlMatchesPatterns(
  url: string,
  includePatterns: string[],
  excludePatterns: string[] = []
): boolean {
  try {
    const path = new URL(url).pathname;

    // Check exclude patterns first
    for (const pattern of excludePatterns) {
      if (path.includes(pattern)) {
        return false;
      }
    }

    // If no include patterns, allow all (that aren't excluded)
    if (includePatterns.length === 0) {
      return true;
    }

    // Check include patterns
    for (const pattern of includePatterns) {
      if (path.startsWith(pattern.replace(/\/$/, ""))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Filter discovered links based on patterns
 */
export function filterLinksByPatterns(
  links: DiscoveredLink[],
  includePatterns: string[],
  excludePatterns: string[] = []
): DiscoveredLink[] {
  return links.filter((link) =>
    urlMatchesPatterns(link.url, includePatterns, excludePatterns)
  );
}

/**
 * Create a SourceConfig object from extracted patterns
 */
export function createSourceConfig(
  includePatterns: string[],
  sampleUrls: string[],
  excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS
): SourceConfig {
  return {
    includePatterns,
    excludePatterns,
    patternVersion: 1,
    lastConfiguredAt: new Date().toISOString(),
    sampleUrls,
  };
}

/**
 * Suggest patterns to exclude based on common non-article URL structures
 */
export function suggestExcludePatterns(
  discoveredLinks: DiscoveredLink[]
): string[] {
  const suggestions: string[] = [];

  for (const link of discoveredLinks) {
    const path = link.path.toLowerCase();

    // Check against default excludes
    for (const exclude of DEFAULT_EXCLUDE_PATTERNS) {
      if (path.includes(exclude) && !suggestions.includes(exclude)) {
        suggestions.push(exclude);
      }
    }
  }

  return suggestions;
}
