import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
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

    // Delete source (cascade will delete related articles)
    await prisma.privateSource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete private source error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}

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
    const updates = await request.json();

    // Check ownership
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

    // Update source
    const updated = await prisma.privateSource.update({
      where: { id },
      data: {
        name: updates.name,
        isActive: updates.isActive,
        config: updates.config,
      },
    });

    return NextResponse.json({
      source: {
        id: updated.id,
        name: updated.name,
        url: updated.url,
        type: updated.type,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("Update private source error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd" },
      { status: 500 }
    );
  }
}
