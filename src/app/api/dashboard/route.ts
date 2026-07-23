import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { subDays, subMonths, startOfMonth } from "date-fns";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const scope: Prisma.IntelligenceRecordWhereInput = user.role === "ADMIN" ? {} : { userId: user.id };
  const since30 = subDays(new Date(), 30);
  const since6m = startOfMonth(subMonths(new Date(), 5));
  const [offers, flashes, restocks, recordsTotal, documentsPending, topWholesalers, topLabs, topProducts, recent, unreadAlerts, trendRows] = await Promise.all([
    db.intelligenceRecord.count({ where: { ...scope, createdAt: { gte: since30 }, offerType: { in: ["OFFER", "PROMOTION", "DISCOUNT"] } } }),
    db.intelligenceRecord.count({ where: { ...scope, createdAt: { gte: since30 }, offerType: "FLASH_SALE" } }),
    db.intelligenceRecord.count({ where: { ...scope, createdAt: { gte: since30 }, offerType: "RESTOCK" } }),
    db.intelligenceRecord.count({ where: scope }),
    db.document.count({ where: { ...(user.role === "ADMIN" ? {} : { userId: user.id }), status: { in: ["PENDING", "PROCESSING"] } } }),
    db.intelligenceRecord.groupBy({ by: ["wholesaler"], where: { ...scope, wholesaler: { not: null } }, _count: { _all: true }, orderBy: { _count: { wholesaler: "desc" } }, take: 5 }),
    db.intelligenceRecord.groupBy({ by: ["laboratory"], where: { ...scope, laboratory: { not: null } }, _count: { _all: true }, orderBy: { _count: { laboratory: "desc" } }, take: 5 }),
    db.intelligenceRecord.groupBy({ by: ["product"], where: scope, _count: { _all: true }, orderBy: { _count: { product: "desc" } }, take: 6 }),
    db.intelligenceRecord.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.alert.count({ where: { userId: user.id, readAt: null } }),
    user.role === "ADMIN"
      ? db.$queryRaw<Array<{ month: Date; offers: bigint; flashes: bigint }>>(Prisma.sql`SELECT date_trunc('month', "createdAt") AS month, COUNT(*) FILTER (WHERE "offerType" IN ('OFFER','PROMOTION','DISCOUNT')) AS offers, COUNT(*) FILTER (WHERE "offerType" = 'FLASH_SALE') AS flashes FROM intelligence_records WHERE "createdAt" >= ${since6m} GROUP BY 1 ORDER BY 1`)
      : db.$queryRaw<Array<{ month: Date; offers: bigint; flashes: bigint }>>(Prisma.sql`SELECT date_trunc('month', "createdAt") AS month, COUNT(*) FILTER (WHERE "offerType" IN ('OFFER','PROMOTION','DISCOUNT')) AS offers, COUNT(*) FILTER (WHERE "offerType" = 'FLASH_SALE') AS flashes FROM intelligence_records WHERE "createdAt" >= ${since6m} AND "userId" = ${user.id} GROUP BY 1 ORDER BY 1`)
  ]);
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
  const trend = months.map(month => {
    const row = trendRows.find(r => new Date(r.month).getFullYear() === month.getFullYear() && new Date(r.month).getMonth() === month.getMonth());
    return { month: month.toLocaleDateString("fr-DZ", { month: "short" }).replace(".", ""), offers: Number(row?.offers || 0), flashes: Number(row?.flashes || 0) };
  });
  return NextResponse.json({
    kpis: { offers, flashes, restocks, recordsTotal, documentsPending }, unreadAlerts, trend,
    topWholesalers: topWholesalers.map(x => ({ name: x.wholesaler, count: x._count._all })),
    topLabs: topLabs.map(x => ({ name: x.laboratory, count: x._count._all })),
    topProducts: topProducts.map(x => ({ name: x.product, count: x._count._all })), recent
  });
}
