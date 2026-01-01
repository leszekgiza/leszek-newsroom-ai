import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSourceConfig, SourceConfig } from "@/lib/patternUtils";

/**
 * PATCH /api/sources/private/[id]/config
 * Save source configuration with URL patterns
 */
export async function PATCH(
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
    const { includePatterns, excludePatterns, sampleUrls } = body as {
      includePatterns: string[];
      excludePatterns?: string[];
      sampleUrls?: string[];
    };

    if (!includePatterns || !Array.isArray(includePatterns)) {
      return NextResponse.json(
        { error: "includePatterns jest wymagane" },
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

    // Create config object
    const config: SourceConfig = createSourceConfig(
      includePatterns,
      sampleUrls || [],
      excludePatterns
    );

    // Update source with config
    const updatedSource = await prisma.privateSource.update({
      where: { id },
      data: {
        config: config as object,
      },
    });

    return NextResponse.json({
      success: true,
      source: {
        id: updatedSource.id,
        name: updatedSource.name,
        url: updatedSource.url,
        config: updatedSource.config,
      },
    });
  } catch (error) {
    console.error("[CONFIG] Error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zapisywania konfiguracji" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sources/private/[id]/config
 * Get source configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const source = await prisma.privateSource.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        config: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Źródło nie znalezione" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source,
    });
  } catch (error) {
    console.error("[CONFIG GET] Error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania konfiguracji" },
      { status: 500 }
    );
  }
}
