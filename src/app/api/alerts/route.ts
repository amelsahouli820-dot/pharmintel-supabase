import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, badRequest, unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const items = await db.alert.findMany({ where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: 100, include: { record: { select: { product: true, wholesaler: true, discountPercent: true } } } });
  const unread = await db.alert.count({ where: { userId: user.id, readAt: null } });
  return NextResponse.json({ items, unread });
}

export async function PATCH(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null) as { id?: string; all?: boolean } | null;
  if (!body?.id && !body?.all) return badRequest("Aucune alerte sélectionnée.");
  await db.alert.updateMany({ where: { userId: user.id, ...(body.id ? { id: body.id } : {}), readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
