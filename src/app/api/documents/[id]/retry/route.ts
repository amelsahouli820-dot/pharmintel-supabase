import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, clientIp, forbidden, unauthorized } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  if (!assertSameOrigin(request)) return forbidden();
  const user = await requireApiUser(); if (!user) return unauthorized();
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "L’IA n’est pas encore activée. Ajoutez OPENAI_API_KEY dans Render." }, { status: 503 });
  const { id } = await context.params;
  const document = await db.document.findFirst({ where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) }, select: { id: true } });
  if (!document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  await db.$transaction([
    db.document.update({ where: { id }, data: { status: "PENDING", reviewStatus: "PENDING_AI", errorMessage: null } }),
    db.processingJob.upsert({ where: { documentId: id }, create: { documentId: id, status: "QUEUED" }, update: { status: "QUEUED", attempts: 0, lockedAt: null, errorMessage: null } })
  ]);
  await audit(user.id, "DOCUMENT_RETRY_REQUESTED", "Document", id, undefined, clientIp(request));
  return NextResponse.json({ ok: true });
}
