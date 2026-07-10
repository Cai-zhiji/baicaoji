import { NextResponse } from "next/server";

/**
 * Shared error handler for API routes.
 * Maps known Prisma errors to appropriate HTTP responses.
 */
export function handleApiError(err: unknown, fallback: string) {
  if (err instanceof Error) {
    // Prisma unique constraint violation
    if (err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "数据已存在，请勿重复添加" }, { status: 409 });
    }
    // Prisma record not found
    if (err.message.includes("Record to update not found") || err.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "数据不存在或已被删除" }, { status: 404 });
    }
    console.error("[API Error]", err.message);
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
