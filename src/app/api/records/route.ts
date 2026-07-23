import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const s = request.nextUrl.searchParams;
  const page = Math.max(1, Number(s.get("page")) || 1);
  const take = Math.min(100, Math.max(1, Number(s.get("limit")) || 20));
  const search = s.get("search")?.trim();
  const where: Prisma.IntelligenceRecordWhereInput = {
    ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    ...(s.get("type") ? { offerType: s.get("type") as never } : {}),
    ...(s.get("wilaya") ? { wilaya: { contains: s.get("wilaya")!, mode: "insensitive" } } : {}),
    ...(s.get("userId") && user.role === "ADMIN" ? { userId: s.get("userId")! } : {}),
    ...(search ? { OR: ["product", "wholesaler", "laboratory", "molecule", "therapeuticClass", "productCode", "cip", "salesperson", "comments"].map(field => ({ [field]: { contains: search, mode: "insensitive" } })) } : {})
  };
  const [items, total] = await Promise.all([
    db.intelligenceRecord.findMany({ where, orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }], skip: (page - 1) * take, take, include: { user: { select: { id: true, name: true } }, document: { select: { originalName: true } } } }),
    db.intelligenceRecord.count({ where })
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / take) });
}
