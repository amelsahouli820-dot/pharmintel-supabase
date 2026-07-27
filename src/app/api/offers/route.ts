import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { recordScope } from "@/lib/access";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { calculateCommercial } from "@/lib/commercial";

const sortMap: Record<string, Prisma.IntelligenceRecordOrderByWithRelationInput> = {
  date: { observedAt: "desc" }, wholesaler: { wholesaler: "asc" }, laboratory: { laboratory: "asc" },
  product: { product: "asc" }, priceHt: { priceHt: "asc" }, discount: { discountPercent: "desc" },
  ug: { ugPercent: "desc" }, net: { priceAfterUg: "asc" }, savings: { savings: "desc" }
};

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const s = request.nextUrl.searchParams;
  const page = Math.max(1, Number(s.get("page")) || 1);
  const limit = Math.min(100, Math.max(10, Number(s.get("limit")) || 50));
  const search = s.get("search")?.trim();
  const from = s.get("from") ? new Date(`${s.get("from")}T00:00:00Z`) : undefined;
  const to = s.get("to") ? new Date(`${s.get("to")}T23:59:59Z`) : undefined;
  const status = s.get("reviewStatus");
  const documentFilter: Prisma.DocumentWhereInput = {
    ...(s.get("watchTypeId") ? { watchTypeId: s.get("watchTypeId")! } : {}),
    ...(s.get("documentType") ? { documentType: s.get("documentType") as any } : {}),
    ...(status ? { reviewStatus: status === "PENDING" ? { in: ["PENDING", "PENDING_AI", "NEEDS_REVIEW", "MODIFIED"] } : status as any } : {})
  };
  const commercialCondition: Prisma.IntelligenceRecordWhereInput = { OR: [
    { discountPercent: { not: null } }, { ugPercent: { not: null } }, { offerText: { not: null } }, { promotionalPrice: { not: null } }
  ] };
  const searchCondition: Prisma.IntelligenceRecordWhereInput | null = search ? { OR: [
    { product: { contains: search, mode: "insensitive" } }, { wholesaler: { contains: search, mode: "insensitive" } },
    { laboratory: { contains: search, mode: "insensitive" } }, { comments: { contains: search, mode: "insensitive" } },
    { user: { name: { contains: search, mode: "insensitive" } } }
  ] } : null;
  const where: Prisma.IntelligenceRecordWhereInput = {
    ...recordScope(user), AND: [commercialCondition, ...(searchCondition ? [searchCondition] : [])],
    ...(s.get("wholesaler") ? { wholesaler: { contains: s.get("wholesaler")!, mode: "insensitive" } } : {}),
    ...(s.get("laboratory") ? { laboratory: { contains: s.get("laboratory")!, mode: "insensitive" } } : {}),
    ...(s.get("product") ? { product: { contains: s.get("product")!, mode: "insensitive" } } : {}),
    ...(s.get("region") ? { region: s.get("region")! } : {}), ...(s.get("wilaya") ? { wilaya: s.get("wilaya")! } : {}),
    ...(s.get("userId") ? { userId: s.get("userId")! } : {}),
    ...(from || to ? { observedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(Object.keys(documentFilter).length ? { document: documentFilter } : {})
  };
  const sort = s.get("sort") || "date";
  const dir: Prisma.SortOrder = s.get("dir") === "asc" ? "asc" : "desc";
  let order = sortMap[sort] || sortMap.date;
  if (sort !== "date") order = { [Object.keys(order)[0]]: dir } as Prisma.IntelligenceRecordOrderByWithRelationInput;
  else order = { observedAt: dir };
  const [rows, total, aggregate, labs, wholesalers, best] = await Promise.all([
    db.intelligenceRecord.findMany({
      where, orderBy: [order, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit,
      include: {
        user: { select: { name: true } },
        document: { select: { sourceKind: true, originalName: true, documentType: true, reviewStatus: true, watchType: { select: { id: true, name: true } } } }
      }
    }),
    db.intelligenceRecord.count({ where }),
    db.intelligenceRecord.aggregate({ where, _max: { discountPercent: true, ugPercent: true, savings: true }, _min: { priceAfterUg: true, netPrice: true } }),
    db.intelligenceRecord.groupBy({ by: ["laboratory"], where: { ...where, laboratory: { not: null } }, _count: { _all: true } }),
    db.intelligenceRecord.groupBy({ by: ["wholesaler"], where: { ...where, wholesaler: { not: null } }, _count: { _all: true } }),
    db.intelligenceRecord.findFirst({ where: { ...where, priceAfterUg: { not: null } }, orderBy: { priceAfterUg: "asc" }, select: { id: true, product: true, wholesaler: true, laboratory: true, priceAfterUg: true } })
  ]);
  const items = rows.map(x => {
    const c = calculateCommercial({ priceHt: Number(x.priceHt || x.price || 0) || null, discountPercent: x.discountPercent ? Number(x.discountPercent) : null, ugPercent: x.ugPercent ? Number(x.ugPercent) : null, offerText: x.offerText, offerBuyQty: x.offerBuyQty, offerFreeQty: x.offerFreeQty });
    return { ...x, priceHt: x.priceHt?.toString() || x.price?.toString(), discountPercent: c.discountPercent, ugPercent: c.ugPercent, offerText: c.offerText, netPrice: x.netPrice?.toString() || c.netPrice, priceAfterUg: x.priceAfterUg?.toString() || c.priceAfterUg, savings: x.savings?.toString() || c.savings };
  });
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit), limit, summary: {
    count: total, laboratories: labs.length, wholesalers: wholesalers.length,
    bestDiscount: aggregate._max.discountPercent?.toString() || null, bestUg: aggregate._max.ugPercent?.toString() || null,
    bestSavings: aggregate._max.savings?.toString() || null, bestNet: aggregate._min.priceAfterUg?.toString() || aggregate._min.netPrice?.toString() || null,
    bestOffer: best ? { ...best, priceAfterUg: best.priceAfterUg?.toString() } : null
  }});
}
