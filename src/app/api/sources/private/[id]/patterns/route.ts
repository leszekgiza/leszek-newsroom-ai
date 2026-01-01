import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  extractPatternsFromUrls,
  DEFAULT_EXCLUDE_PATTERNS,
} from "@/lib/patternUtils";

/**
 * POST /api/sources/private/[id]/patterns
 * Extract URL patterns from user-selected article URLs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { selectedUrls, allDiscoveredUrls } = body as {
      selectedUrls: string[];
      allDiscoveredUrls?: string[];
    };

    if (!selectedUrls || !Array.isArray(selectedUrls)) {
      return NextResponse.json(
        { error: "selectedUrls jest wymagane" },
        { status: 400 }
      );
    }

    if (selectedUrls.length === 0) {
      return NextResponse.json(
        { error: "Wybierz przynajmniej jeden artykuł" },
        { status: 400 }
      );
    }

    // Verify source belongs to user
    const source = await prisma.privateSource.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Źródło nie znalezione" },
        { status: 404 }
      );
    }

    // Extract patterns from selected URLs
    const patterns = extractPatternsFromUrls(selectedUrls, allDiscoveredUrls);

    // Calculate how many discovered URLs each pattern would match
    const patternsWithStats = patterns.map((pattern) => {
      let potentialMatches = pattern.matchCount;

      if (allDiscoveredUrls) {
        potentialMatches = allDiscoveredUrls.filter((url) => {
          try {
            const path = new URL(url).pathname;
            return path.startsWith(pattern.pattern.replace(/\/$/, ""));
          } catch {
            return false;
          }
        }).length;
      }

      return {
        ...pattern,
        potentialMatches,
      };
    });

    return NextResponse.json({
      success: true,
      patterns: patternsWithStats,
      suggestedExcludes: DEFAULT_EXCLUDE_PATTERNS.slice(0, 10), // Top 10 common excludes
      selectedCount: selectedUrls.length,
    });
  } catch (error) {
    console.error("[PATTERNS] Error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas ekstrakcji wzorców" },
      { status: 500 }
    );
  }
}
