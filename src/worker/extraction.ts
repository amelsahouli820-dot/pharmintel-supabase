import OpenAI from "openai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import path from "node:path";
import { Readable } from "node:stream";

export type ExtractedRecord = {
  date: string | null; startDate: string | null; endDate: string | null;
  wholesaler: string | null; laboratory: string | null; product: string;
  productRange: string | null; molecule: string | null; therapeuticClass: string | null;
  productCode: string | null; cip: string | null;
  price: number | null; priceHt: number | null; priceTtc: number | null; promotionalPrice: number | null;
  currency: string; offerType: "OFFER" | "PROMOTION" | "FLASH_SALE" | "RESTOCK" | "DISCOUNT" | "NEW_PRODUCT" | "OTHER";
  discountPercent: number | null; freeUnits: number | null; quota: string | null; commercialConditions: string | null;
  wilaya: string | null; city: string | null; region: string | null; salesperson: string | null; distributionChannel: string | null;
  comments: string | null; confidence: number;
};
type Extraction = { summary: string; records: ExtractedRecord[] };
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const basePrompt = `Tu es un analyste senior de veille concurrentielle spécialisé dans la distribution pharmaceutique en Algérie. Analyse intégralement le document, y compris les tableaux et petites mentions. Extrais UNE LIGNE par produit/offre, sans jamais inventer. Identifie si possible : grossiste, laboratoire, produit, gamme, molécule, classe thérapeutique, code produit, CIP, prix HT/TTC/promotionnel, remise, unités gratuites, quota, conditions commerciales, dates de début/fin, région, wilaya, ville, commercial et canal de distribution. Convertis les montants et pourcentages en nombres, les dates en ISO AAAA-MM-JJ. Pour les offres 10+1, freeUnits vaut 1 et les conditions conservent "10+1". Distingue OFFER, PROMOTION, FLASH_SALE, RESTOCK, DISCOUNT, NEW_PRODUCT et OTHER. Utilise null lorsqu'une information manque. La confiance est entre 0 et 1.`;
function instructions(context?: string) { return context ? `${basePrompt}\n\nMÉTADONNÉES FOURNIES PAR L’UTILISATEUR (prioritaires mais à vérifier) :\n${context}` : basePrompt; }

const required = ["date","startDate","endDate","wholesaler","laboratory","product","productRange","molecule","therapeuticClass","productCode","cip","price","priceHt","priceTtc","promotionalPrice","currency","offerType","discountPercent","freeUnits","quota","commercialConditions","wilaya","city","region","salesperson","distributionChannel","comments","confidence"];
const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };
const schema = { type: "object", additionalProperties: false, required: ["summary", "records"], properties: {
  summary: { type: "string" }, records: { type: "array", items: { type: "object", additionalProperties: false, required, properties: {
    date: nullableString, startDate: nullableString, endDate: nullableString, wholesaler: nullableString, laboratory: nullableString,
    product: { type: "string" }, productRange: nullableString, molecule: nullableString, therapeuticClass: nullableString, productCode: nullableString, cip: nullableString,
    price: nullableNumber, priceHt: nullableNumber, priceTtc: nullableNumber, promotionalPrice: nullableNumber, currency: { type: "string" },
    offerType: { type: "string", enum: ["OFFER","PROMOTION","FLASH_SALE","RESTOCK","DISCOUNT","NEW_PRODUCT","OTHER"] },
    discountPercent: nullableNumber, freeUnits: nullableNumber, quota: nullableString, commercialConditions: nullableString,
    wilaya: nullableString, city: nullableString, region: nullableString, salesperson: nullableString, distributionChannel: nullableString,
    comments: nullableString, confidence: { type: "number" }
  } } }
} };

function text(value: unknown, max = 300) { return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null; }
function amount(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
function cleanRecords(value: Extraction): Extraction {
  const seen = new Set<string>();
  const records = (value.records || []).filter(r => r?.product?.trim()).map(r => ({
    ...r, product: r.product.trim().slice(0, 300), wholesaler: text(r.wholesaler, 200), laboratory: text(r.laboratory, 200),
    productRange: text(r.productRange), molecule: text(r.molecule), therapeuticClass: text(r.therapeuticClass), productCode: text(r.productCode, 100), cip: text(r.cip, 100),
    price: amount(r.price), priceHt: amount(r.priceHt), priceTtc: amount(r.priceTtc), promotionalPrice: amount(r.promotionalPrice),
    currency: (r.currency || "DZD").trim().toUpperCase().slice(0, 8), discountPercent: amount(r.discountPercent) !== null && Number(r.discountPercent) <= 100 ? Number(r.discountPercent) : null,
    freeUnits: amount(r.freeUnits) === null ? null : Math.round(Number(r.freeUnits)), quota: text(r.quota, 300), commercialConditions: text(r.commercialConditions, 2000),
    wilaya: text(r.wilaya, 100), city: text(r.city, 100), region: text(r.region, 150), salesperson: text(r.salesperson, 200), distributionChannel: text(r.distributionChannel, 200),
    comments: text(r.comments, 2000), confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0))
  })).filter(r => { const key = [r.product.toLowerCase(), r.wholesaler?.toLowerCase(), r.promotionalPrice ?? r.price, r.offerType].join("|"); if (seen.has(key)) return false; seen.add(key); return true; });
  return { summary: value.summary || "", records };
}
function aiClient() { if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY n’est pas configurée"); return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }
async function callAI(content: string | { mimeType: string; buffer: Buffer }, context?: string) {
  const userContent = typeof content === "string" ? [{ type: "text", text: `DOCUMENT À ANALYSER :\n${content}` }] : [{ type: "text", text: "Analyse cette image ou capture d’écran." }, { type: "image_url", image_url: { url: `data:${content.mimeType};base64,${content.buffer.toString("base64")}`, detail: "high" } }];
  const completion = await aiClient().chat.completions.create({ model, store: false, temperature: 0, messages: [{ role: "system", content: instructions(context) }, { role: "user", content: userContent as never }], response_format: { type: "json_schema", json_schema: { name: "pharma_competitive_intelligence_v2", strict: true, schema } } });
  const raw = completion.choices[0]?.message?.content; if (!raw) throw new Error("L’IA n’a retourné aucune donnée"); return cleanRecords(JSON.parse(raw) as Extraction);
}
async function callPdfAI(buffer: Buffer, filename: string, context?: string) {
  const response = await aiClient().responses.create({ model, store: false, temperature: 0, instructions: instructions(context), input: [{ role: "user", content: [{ type: "input_text", text: "Analyse toutes les pages de ce PDF, y compris tableaux, images et pages scannées." }, { type: "input_file", filename, file_data: `data:application/pdf;base64,${buffer.toString("base64")}` }] }], text: { format: { type: "json_schema", name: "pharma_competitive_intelligence_v2", strict: true, schema } } });
  if (!response.output_text) throw new Error("L’IA n’a retourné aucune donnée pour ce PDF"); return cleanRecords(JSON.parse(response.output_text) as Extraction);
}
export async function extractText(buffer: Buffer, mimeType: string, filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (mimeType.startsWith("image/") || [".png",".jpg",".jpeg",".webp"].includes(ext)) return null;
  if (ext === ".pdf" || mimeType === "application/pdf") return (await pdfParse(buffer)).text;
  if (ext === ".docx" || mimeType.includes("wordprocessingml")) return (await mammoth.extractRawText({ buffer })).value;
  if ([".xlsx",".csv"].includes(ext) || mimeType.includes("spreadsheet") || mimeType === "text/csv") {
    const workbook = new ExcelJS.Workbook(); if (ext === ".csv" || mimeType === "text/csv") await workbook.csv.read(Readable.from(buffer)); else await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    return workbook.worksheets.map(sheet => { const rows: string[] = []; sheet.eachRow({ includeEmpty: false }, row => { const cells = (row.values as ExcelJS.CellValue[]).slice(1).map(value => { if (value instanceof Date) return value.toISOString(); if (value && typeof value === "object") { if ("text" in value) return String(value.text); if ("result" in value) return String(value.result ?? ""); if ("richText" in value) return value.richText.map(x => x.text).join(""); } return String(value ?? ""); }); rows.push(cells.map(cell => /[;\n\"]/g.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(";")); }); return `### FEUILLE: ${sheet.name}\n${rows.join("\n")}`; }).join("\n\n");
  }
  return buffer.toString("utf8");
}
export async function analyzeDocument(buffer: Buffer, mimeType: string, filename: string, context?: string): Promise<Extraction & { rawText: string | null }> {
  const content = await extractText(buffer, mimeType, filename);
  if (content === null) return { ...(await callAI({ mimeType, buffer }, context)), rawText: null };
  const normalized = content.replace(/\u0000/g, "").trim();
  if (path.extname(filename).toLowerCase() === ".pdf" || mimeType === "application/pdf") return { ...(await callPdfAI(buffer, filename, context)), rawText: normalized.slice(0, 1_000_000) || null };
  if (!normalized) throw new Error("Aucun texte exploitable détecté dans le document.");
  const chunks = normalized.match(/[\s\S]{1,60000}/g)?.slice(0, 20) || []; const partials: Extraction[] = [];
  for (let i=0;i<chunks.length;i++) partials.push(await callAI(`Partie ${i+1}/${chunks.length}\n${chunks[i]}`, context));
  return { summary: partials.map(x=>x.summary).join(" "), records: cleanRecords({ summary:"", records:partials.flatMap(x=>x.records) }).records, rawText:normalized.slice(0,1_000_000) };
}
