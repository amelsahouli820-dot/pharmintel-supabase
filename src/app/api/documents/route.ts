import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { requireApiUser, permissionsOf } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { putFile } from "@/lib/storage";
import { documentMetadataSchema } from "@/lib/validation";
import { canImportDocuments, documentScope, hasGlobalVision } from "@/lib/access";
import { linkSignal } from "@/lib/signals";

const allowedExtensions = new Set([".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv"]);

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const take = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 15));
  const s=request.nextUrl.searchParams;const search=s.get("search")?.trim();const where:Prisma.DocumentWhereInput={...documentScope(user),...(s.get("reviewStatus")?{reviewStatus:s.get("reviewStatus") as any}:{}),...(s.get("sourceKind")?{sourceKind:s.get("sourceKind") as any}:{}),...(s.get("documentType")?{documentType:s.get("documentType") as any}:{}),...(s.get("wholesaler")?{wholesaler:{contains:s.get("wholesaler")!,mode:"insensitive"}}:{}),...(s.get("wilaya")?{wilaya:s.get("wilaya")!}:{}),...(s.get("userId")&&hasGlobalVision(user)?{userId:s.get("userId")!}:{}),...(search?{OR:[{originalName:{contains:search,mode:"insensitive"}},{wholesaler:{contains:search,mode:"insensitive"}},{laboratory:{contains:search,mode:"insensitive"}},{comments:{contains:search,mode:"insensitive"}}]}:{})};
  const [items, total] = await Promise.all([
    db.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { user: { select: { name: true } }, _count: { select: { records: true, confirmations: true, validations: true, documentComments: true } } } }),
    db.document.count({ where })
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / take) });
}

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (!canImportDocuments(user) || !permissionsOf(user.permissions).canImport) return forbidden();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("Sélectionnez un document à importer.");
  const metadata = documentMetadataSchema.safeParse({
    wholesaler: String(form?.get("wholesaler") || ""), customWholesaler: String(form?.get("customWholesaler") || ""),
    documentType: String(form?.get("documentType") || ""), customDocumentType: String(form?.get("customDocumentType") || ""),
    documentDate: String(form?.get("documentDate") || ""), receivedAt: String(form?.get("receivedAt") || ""),
    region: String(form?.get("region") || ""), wilaya: String(form?.get("wilaya") || ""), laboratory: String(form?.get("laboratory") || ""), comments: String(form?.get("comments") || ""),
    confidentiality: String(form?.get("confidentiality") || "INTERNAL"), priority: String(form?.get("priority") || "NORMAL")
  });
  if (!metadata.success) return badRequest(metadata.error.issues[0]?.message || "Métadonnées invalides.");
  const ext = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.has(ext)) return badRequest("Format non pris en charge. Utilisez PDF, Word, Excel, image, CSV ou texte.");
  const maxBytes = (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024;
  if (!file.size || file.size > maxBytes) return badRequest(`La taille du fichier doit être comprise entre 1 octet et ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const duplicate = await db.document.findFirst({ where: { sha256, status: { in: ["WAITING_AI", "PENDING", "PROCESSING", "COMPLETED"] } }, select: { id: true,userId:true,records:true } });
  if (duplicate?.userId===user.id) { await db.scoreEvent.create({ data: { userId: user.id, documentId: duplicate.id, points: -5, reason: "DUPLICATE_DOCUMENT", details: file.name } }).catch(()=>undefined); return NextResponse.json({ error: "Vous avez déjà importé ce document. Une pénalité de 5 points a été appliquée.", documentId: duplicate.id }, { status: 409 }); }
  if(duplicate){await db.documentConfirmation.upsert({where:{canonicalDocumentId_userId:{canonicalDocumentId:duplicate.id,userId:user.id}},create:{canonicalDocumentId:duplicate.id,userId:user.id,region:user.region||metadata.data.region||null,wilaya:user.wilaya||null,comment:metadata.data.comments||null},update:{region:user.region||metadata.data.region||null,wilaya:user.wilaya||null,comment:metadata.data.comments||null}});for(const record of duplicate.records)await linkSignal({recordId:record.id,documentId:duplicate.id,userId:user.id,wholesaler:record.wholesaler,laboratory:record.laboratory,product:record.product,offerType:record.offerType,region:user.region||metadata.data.region,wilaya:user.wilaya});await audit(user.id,"DUPLICATE_CONFIRMED","Document",duplicate.id,{name:file.name},clientIp(request));return NextResponse.json({documentId:duplicate.id,grouped:true,message:"Document identique regroupé comme confirmation."},{status:200})}
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  const key = `${user.id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  try { await putFile(key, buffer, file.type || "application/octet-stream"); }
  catch (error) { return NextResponse.json({ error: `Stockage impossible : ${error instanceof Error ? error.message : "service indisponible"}` }, { status: 503 }); }
  const aiReady = Boolean(process.env.OPENAI_API_KEY);
  const m = metadata.data;
  const toDate = (value: string) => value ? new Date(`${value}T12:00:00.000Z`) : null;
  const document = await db.document.create({ data: {
    userId: user.id, originalName: file.name.slice(0, 255), storageKey: key, mimeType: file.type || "application/octet-stream", size: file.size, sha256,
    status: aiReady ? "PENDING" : "WAITING_AI", reviewStatus: aiReady ? "PENDING_AI" : "PENDING",
    wholesaler: m.wholesaler === "OTHER" ? m.customWholesaler : m.wholesaler, customWholesaler: m.wholesaler === "OTHER" ? m.customWholesaler : null,
    documentType: m.documentType, customDocumentType: m.documentType === "OTHER" ? m.customDocumentType : null,
    documentDate: toDate(m.documentDate), receivedAt: toDate(m.receivedAt) || new Date(), region: m.region || null, wilaya: m.wilaya || user.wilaya || null, laboratory: m.laboratory || null,
    comments: m.comments || null, confidentiality: m.confidentiality, priority: m.priority,
    scoreEvents: { create: [{ userId: user.id, points: 10, reason: "DOCUMENT_IMPORTED", details: file.name }, ...((m.wholesaler && m.documentType && m.documentDate && m.region && m.laboratory) ? [{ userId: user.id, points: 10, reason: "COMPLETE_INFORMATION", details: "Métadonnées complètes" }] : [])] },
    ...(aiReady ? { processingJob: { create: { status: "QUEUED" } } } : {})
  } });
  await audit(user.id, "DOCUMENT_UPLOADED", "Document", document.id, { name: document.originalName, size: document.size, wholesaler: document.wholesaler, documentType: document.documentType, aiQueued: aiReady }, clientIp(request));
  return NextResponse.json({ document }, { status: 201 });
}
