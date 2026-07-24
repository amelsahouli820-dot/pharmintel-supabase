import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { subDays, subMonths, startOfMonth } from "date-fns";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { documentScope, hasGlobalVision, recordScope } from "@/lib/access";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const scope: Prisma.IntelligenceRecordWhereInput = recordScope(user);
  const docScope: Prisma.DocumentWhereInput = documentScope(user);
  const since30 = subDays(new Date(), 30);
  const since6m = startOfMonth(subMonths(new Date(), 5));
  const [offers, flashes, restocks, recordsTotal, documentsPending, topWholesalers, topLabs, topProducts, recent, unreadAlerts, trendRows] = await Promise.all([
    db.intelligenceRecord.count({ where: { ...scope, createdAt: { gte: since30 }, offerType: { in: ["OFFER", "PROMOTION", "DISCOUNT"] } } }),
    db.intelligenceRecord.count({ where: { ...scope, createdAt: { gte: since30 }, offerType: "FLASH_SALE" } }),
    db.intelligenceRecord.count({ where: { ...scope, createdAt: { gte: since30 }, offerType: "RESTOCK" } }),
    db.intelligenceRecord.count({ where: scope }),
    db.document.count({ where: { ...documentScope(user), status: { in: ["WAITING_AI", "PENDING", "PROCESSING"] } } }),
    db.intelligenceRecord.groupBy({ by: ["wholesaler"], where: { ...scope, wholesaler: { not: null } }, _count: { _all: true }, orderBy: { _count: { wholesaler: "desc" } }, take: 5 }),
    db.intelligenceRecord.groupBy({ by: ["laboratory"], where: { ...scope, laboratory: { not: null } }, _count: { _all: true }, orderBy: { _count: { laboratory: "desc" } }, take: 5 }),
    db.intelligenceRecord.groupBy({ by: ["product"], where: scope, _count: { _all: true }, orderBy: { _count: { product: "desc" } }, take: 6 }),
    db.intelligenceRecord.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.alert.count({ where: { userId: user.id, readAt: null } }),
    hasGlobalVision(user)
      ? db.$queryRaw<Array<{ month: Date; offers: bigint; flashes: bigint }>>(Prisma.sql`SELECT date_trunc('month', r."createdAt") AS month, COUNT(*) FILTER (WHERE r."offerType" IN ('OFFER','PROMOTION','DISCOUNT')) AS offers, COUNT(*) FILTER (WHERE r."offerType" = 'FLASH_SALE') AS flashes FROM intelligence_records r WHERE r."createdAt" >= ${since6m} GROUP BY 1 ORDER BY 1`)
      : user.role === "SUPERVISOR"
        ? db.$queryRaw<Array<{ month: Date; offers: bigint; flashes: bigint }>>(Prisma.sql`SELECT date_trunc('month', r."createdAt") AS month, COUNT(*) FILTER (WHERE r."offerType" IN ('OFFER','PROMOTION','DISCOUNT')) AS offers, COUNT(*) FILTER (WHERE r."offerType" = 'FLASH_SALE') AS flashes FROM intelligence_records r JOIN users u ON u.id=r."userId" WHERE r."createdAt" >= ${since6m} AND (r."userId"=${user.id} OR u."supervisorId"=${user.id}) GROUP BY 1 ORDER BY 1`)
        : db.$queryRaw<Array<{ month: Date; offers: bigint; flashes: bigint }>>(Prisma.sql`SELECT date_trunc('month', r."createdAt") AS month, COUNT(*) FILTER (WHERE r."offerType" IN ('OFFER','PROMOTION','DISCOUNT')) AS offers, COUNT(*) FILTER (WHERE r."offerType" = 'FLASH_SALE') AS flashes FROM intelligence_records r WHERE r."createdAt" >= ${since6m} AND r."userId" = ${user.id} GROUP BY 1 ORDER BY 1`)
  ]);
  const [totalDocuments, manualInformations, validatedDocuments, rejectedDocuments, pendingDocuments, documentsByWholesaler, documentsByType, documentDates] = await Promise.all([
    db.document.count({ where: docScope }),
    db.document.count({ where: { ...docScope, sourceKind: "MANUAL" } }),
    db.document.count({ where: { ...docScope, reviewStatus: "VALIDATED" } }),
    db.document.count({ where: { ...docScope, reviewStatus: "REJECTED" } }),
    db.document.count({ where: { ...docScope, reviewStatus: { in: ["PENDING","PENDING_AI","NEEDS_REVIEW","MODIFIED"] } } }),
    db.document.groupBy({ by:["wholesaler"], where:{...docScope,wholesaler:{not:null}}, _count:{_all:true}, orderBy:{_count:{wholesaler:"desc"}}, take:8 }),
    db.document.groupBy({ by:["documentType"], where:docScope, _count:{_all:true}, orderBy:{_count:{documentType:"desc"}}, take:10 }),
    db.document.findMany({ where:{...docScope,createdAt:{gte:startOfMonth(subMonths(new Date(),11))}}, select:{createdAt:true} })
  ]);
  const documentTypeCount=(type:string)=>documentsByType.find(x=>x.documentType===type)?._count._all||0;
  const annualTrend=Array.from({length:12},(_,i)=>startOfMonth(subMonths(new Date(),11-i))).map(month=>({month:month.toLocaleDateString("fr-DZ",{month:"short"}),count:documentDates.filter(d=>d.createdAt.getFullYear()===month.getFullYear()&&d.createdAt.getMonth()===month.getMonth()).length}));
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
  const trend = months.map(month => {
    const row = trendRows.find(r => new Date(r.month).getFullYear() === month.getFullYear() && new Date(r.month).getMonth() === month.getMonth());
    return { month: month.toLocaleDateString("fr-DZ", { month: "short" }).replace(".", ""), offers: Number(row?.offers || 0), flashes: Number(row?.flashes || 0) };
  });
  return NextResponse.json({
    kpis: { offers, flashes, restocks, recordsTotal, documentsPending, totalDocuments, manualInformations, validatedDocuments, rejectedDocuments, pendingDocuments, promotionsDocuments:documentTypeCount("PROMOTION"), flashesDocuments:documentTypeCount("FLASH_SALE"), quotasDocuments:documentTypeCount("QUOTA") }, unreadAlerts, trend, annualTrend,
    documentsByWholesaler: documentsByWholesaler.map(x=>({name:x.wholesaler,count:x._count._all})),
    documentsByType: documentsByType.map(x=>({name:x.documentType,count:x._count._all})),
    topWholesalers: topWholesalers.map(x => ({ name: x.wholesaler, count: x._count._all })),
    topLabs: topLabs.map(x => ({ name: x.laboratory, count: x._count._all })),
    topProducts: topProducts.map(x => ({ name: x.product, count: x._count._all })), recent
  });
}
