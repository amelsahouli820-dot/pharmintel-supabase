import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document as WordDocument, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, WidthType } from "docx";
import { Prisma } from "@prisma/client";
import { requireApiUser, permissionsOf } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { recordScope } from "@/lib/access";

export const runtime = "nodejs";

type Row = Awaited<ReturnType<typeof getRows>>[number];
async function getRows(user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>>, request: NextRequest) {
  const s = request.nextUrl.searchParams;
  const where: Prisma.IntelligenceRecordWhereInput = {
    ...recordScope(user),
    ...(s.get("type") ? { offerType: s.get("type") as never } : {}),
    ...(s.get("from") ? { observedAt: { gte: new Date(s.get("from")!) } } : {}),
    ...(s.get("to") ? { observedAt: { lte: new Date(`${s.get("to")}T23:59:59`) } } : {})
  };
  return db.intelligenceRecord.findMany({ where, orderBy: { observedAt: "desc" }, take: 50_000, include: { user: { select: { name: true } } } });
}
const columns = ["Date","Grossiste","Laboratoire","Produit","Gamme","Molécule","Classe thérapeutique","CIP","Code produit","Prix HT","Prix TTC","Prix promotionnel","Devise","Type","Remise","UG","Quota","Début","Fin","Conditions commerciales","Wilaya","Ville","Région","Commercial","Canal","Commentaires","Utilisateur"];
function values(r: Row) { return [r.observedAt?.toISOString().slice(0,10)||"",r.wholesaler||"",r.laboratory||"",r.product,r.productRange||"",r.molecule||"",r.therapeuticClass||"",r.cip||"",r.productCode||"",r.priceHt?.toString()||"",r.priceTtc?.toString()||"",r.promotionalPrice?.toString()||r.price?.toString()||"",r.currency,r.offerType,r.discountPercent?`${r.discountPercent}%`:"",r.freeUnits??"",r.quota||"",r.startsAt?.toISOString().slice(0,10)||"",r.endsAt?.toISOString().slice(0,10)||"",r.commercialConditions||"",r.wilaya||"",r.city||"",r.region||"",r.salesperson||"",r.distributionChannel||"",r.comments||"",r.user.name]; }
async function pdfBuffer(rows: Row[]) {
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
  const chunks: Buffer[] = []; doc.on("data", c => chunks.push(Buffer.from(c)));
  const done = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.fontSize(19).fillColor("#132E2A").text("Rapport de veille concurrentielle");
  doc.moveDown(0.3).fontSize(9).fillColor("#62736F").text(`Généré le ${new Date().toLocaleDateString("fr-DZ")} • ${rows.length} enregistrements`);
  doc.moveDown();
  rows.forEach((r, index) => {
    if (doc.y > 735) doc.addPage();
    doc.fontSize(10).fillColor("#132E2A").text(`${index + 1}. ${r.product}`, { continued: false });
    doc.fontSize(8).fillColor("#52635F").text(`${r.wholesaler || "Grossiste non précisé"} • ${r.laboratory || "Laboratoire non précisé"} • ${r.offerType} • ${r.discountPercent ? `${r.discountPercent}%` : "—"} • ${r.price ? `${r.price} ${r.currency}` : "Prix non précisé"}`);
    doc.moveDown(0.55);
  });
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) { doc.switchToPage(i); doc.fontSize(7).fillColor("#87938F").text(`PharmIntel — Page ${i + 1}/${range.count}`, 36, 806, { align: "right", width: 523 }); }
  doc.end(); return done;
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (!permissionsOf(user.permissions).canExport) return forbidden();
  const format = (request.nextUrl.searchParams.get("format") || "xlsx").toLowerCase();
  if (!["xlsx", "pdf", "docx"].includes(format)) return badRequest("Format d’export invalide.");
  const rows = await getRows(user, request);
  let buffer: Buffer; let contentType: string;
  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook(); workbook.creator = "PharmIntel"; workbook.created = new Date();
    const sheet = workbook.addWorksheet("Veille concurrentielle", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((header, i) => ({ header, key: String(i), width: [13,22,22,30,18,20,22,14,14,12,12,14,9,17,11,8,14,12,12,36,14,14,14,20,18,36,20][i] || 16 }));
    rows.forEach(r => sheet.addRow(values(r)));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF183F38" } };
    sheet.autoFilter = { from: "A1", to: "AA1" };
    buffer = Buffer.from(await workbook.xlsx.writeBuffer()); contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (format === "docx") {
    const tableRows = [new TableRow({ tableHeader: true, children: ["Date", "Grossiste", "Produit", "Type", "Remise"].map(x => new TableCell({ children: [new Paragraph({ text: x, style: "Strong" })] })) }), ...rows.slice(0, 5000).map(r => new TableRow({ children: [values(r)[0], values(r)[1], values(r)[3], values(r)[13], values(r)[14]].map(x => new TableCell({ children: [new Paragraph(String(x))] })) }))];
    const document = new WordDocument({ sections: [{ children: [new Paragraph({ text: "Rapport de veille concurrentielle", heading: HeadingLevel.TITLE }), new Paragraph(`Généré le ${new Date().toLocaleDateString("fr-DZ")} — ${rows.length} enregistrements`), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows })] }] });
    buffer = Buffer.from(await Packer.toBuffer(document)); contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else { buffer = await pdfBuffer(rows); contentType = "application/pdf"; }
  await audit(user.id, "DATA_EXPORTED", "IntelligenceRecord", undefined, { format, count: rows.length }, clientIp(request));
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="veille-pharmintel-${new Date().toISOString().slice(0, 10)}.${format}"`, "Cache-Control": "private, no-store" } });
}
