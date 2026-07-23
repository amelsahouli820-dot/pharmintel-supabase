import { db } from "@/lib/db";
import { getFile } from "@/lib/storage";
import { analyzeDocument, type ExtractedRecord } from "./extraction";
import type { AlertSeverity, AlertType, Prisma } from "@prisma/client";

const regionByWilaya: Record<string, string> = {
  "alger": "Centre", "blida": "Centre", "boumerdes": "Centre", "tipaza": "Centre", "bejaia": "Centre", "béjaïa": "Centre", "tizi ouzou": "Centre",
  "setif": "Est", "sétif": "Est", "constantine": "Est", "annaba": "Est", "batna": "Est", "jijel": "Est", "skikda": "Est", "mila": "Est", "bordj bou arreridj": "Est",
  "oran": "Ouest", "tlemcen": "Ouest", "mostaganem": "Ouest", "sidi bel abbes": "Ouest", "sidi bel abbès": "Ouest", "mascara": "Ouest", "relizane": "Ouest",
  "ouargla": "Sud", "ghardaia": "Sud", "ghardaïa": "Sud", "adrar": "Sud", "tamanrasset": "Sud", "bechar": "Sud", "béchar": "Sud", "el oued": "Sud", "biskra": "Sud"
};
function regionFor(wilaya: string | null) { return wilaya ? regionByWilaya[wilaya.toLowerCase()] || null : null; }
function parsedDate(value: string | null) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
type AlertDraft = { type: AlertType; severity: AlertSeverity; title: string; message: string };
function alertsFor(record: ExtractedRecord, isNewProduct: boolean): AlertDraft[] {
  const result: AlertDraft[] = [];
  if (["OFFER", "PROMOTION"].includes(record.offerType)) result.push({ type: "NEW_OFFER", severity: "INFO", title: "Nouvelle offre détectée", message: `${record.product}${record.wholesaler ? ` — ${record.wholesaler}` : ""}` });
  if (record.offerType === "FLASH_SALE") result.push({ type: "FLASH_SALE", severity: "CRITICAL", title: "Vente flash détectée", message: `${record.product}${record.wholesaler ? ` chez ${record.wholesaler}` : ""}` });
  const threshold = Number(process.env.DISCOUNT_ALERT_THRESHOLD) || 25;
  if ((record.discountPercent || 0) >= threshold) result.push({ type: "HIGH_DISCOUNT", severity: "WARNING", title: `Forte remise : ${record.discountPercent}%`, message: `${record.product}${record.wholesaler ? ` — ${record.wholesaler}` : ""}` });
  if (isNewProduct || record.offerType === "NEW_PRODUCT") result.push({ type: "NEW_PRODUCT", severity: "INFO", title: "Nouveau produit identifié", message: record.product });
  return result;
}

export async function processDocument(documentId: string) {
  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) throw new Error("Document introuvable");
  await db.document.update({ where: { id: documentId }, data: { status: "PROCESSING", errorMessage: null } });
  const buffer = await getFile(document.storageKey);
  const extraction = await analyzeDocument(buffer, document.mimeType, document.originalName);
  if (!extraction.records.length) throw new Error("Aucune offre ou information produit n’a été détectée");
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  const recipients = [...new Set([document.userId, ...admins.map(a => a.id)])];
  await db.$transaction(async tx => {
    await tx.intelligenceRecord.deleteMany({ where: { documentId } });
    for (const item of extraction.records) {
      const existing = await tx.intelligenceRecord.count({ where: { product: { equals: item.product, mode: "insensitive" }, documentId: { not: documentId } } });
      const data: Prisma.IntelligenceRecordUncheckedCreateInput = {
        documentId, userId: document.userId, observedAt: parsedDate(item.date), wholesaler: item.wholesaler, laboratory: item.laboratory,
        product: item.product, price: item.price, currency: item.currency || "DZD", offerType: item.offerType,
        discountPercent: item.discountPercent, wilaya: item.wilaya, region: regionFor(item.wilaya), comments: item.comments,
        confidence: item.confidence, rawExtraction: item as unknown as Prisma.InputJsonValue
      };
      const record = await tx.intelligenceRecord.create({ data });
      const alerts = alertsFor(item, existing === 0);
      if (alerts.length) await tx.alert.createMany({ data: recipients.flatMap(userId => alerts.map(alert => ({ ...alert, userId, recordId: record.id }))) });
    }
    await tx.document.update({ where: { id: documentId }, data: { status: "COMPLETED", rawText: extraction.rawText, processedAt: new Date(), errorMessage: null } });
    await tx.auditLog.create({ data: { actorId: document.userId, action: "DOCUMENT_ANALYZED", entityType: "Document", entityId: documentId, metadata: { records: extraction.records.length, summary: extraction.summary } } });
  }, { timeout: 120_000 });
}

export async function markFinalFailure(documentId: string, error: Error) {
  const document = await db.document.update({ where: { id: documentId }, data: { status: "FAILED", errorMessage: error.message.slice(0, 1000) } }).catch(() => null);
  if (!document) return;
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  const recipients = [...new Set([document.userId, ...admins.map(a => a.id)])];
  await db.alert.createMany({ data: recipients.map(userId => ({ userId, type: "PROCESSING_FAILED", severity: "WARNING", title: "Analyse impossible", message: `${document.originalName} : ${error.message.slice(0, 300)}` })) });
}
