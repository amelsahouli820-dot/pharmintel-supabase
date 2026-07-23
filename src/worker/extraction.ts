import OpenAI from "openai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import path from "node:path";
import { Readable } from "node:stream";

export type ExtractedRecord = {
  date: string | null;
  wholesaler: string | null;
  laboratory: string | null;
  product: string;
  price: number | null;
  currency: string;
  offerType: "OFFER" | "PROMOTION" | "FLASH_SALE" | "RESTOCK" | "DISCOUNT" | "NEW_PRODUCT" | "OTHER";
  discountPercent: number | null;
  wilaya: string | null;
  comments: string | null;
  confidence: number;
};

type Extraction = { summary: string; records: ExtractedRecord[] };
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const prompt = `Tu es un analyste de veille concurrentielle spécialisé dans la distribution pharmaceutique en Algérie. Analyse intégralement le contenu fourni. Extrais UNE LIGNE par produit/offre, sans inventer de valeur. Conserve les noms commerciaux, grossistes et laboratoires tels qu'ils apparaissent. Convertis les prix au format numérique, les dates en ISO AAAA-MM-JJ et les remises en pourcentage numérique. Distingue OFFER, PROMOTION, FLASH_SALE, RESTOCK (arrivage), DISCOUNT (remise), NEW_PRODUCT et OTHER. Si une information manque, utilise null. La confiance doit être comprise entre 0 et 1.`;

const schema = {
  type: "object", additionalProperties: false, required: ["summary", "records"],
  properties: {
    summary: { type: "string" },
    records: { type: "array", items: { type: "object", additionalProperties: false, required: ["date", "wholesaler", "laboratory", "product", "price", "currency", "offerType", "discountPercent", "wilaya", "comments", "confidence"], properties: {
      date: { type: ["string", "null"] }, wholesaler: { type: ["string", "null"] }, laboratory: { type: ["string", "null"] }, product: { type: "string" },
      price: { type: ["number", "null"] }, currency: { type: "string" }, offerType: { type: "string", enum: ["OFFER", "PROMOTION", "FLASH_SALE", "RESTOCK", "DISCOUNT", "NEW_PRODUCT", "OTHER"] },
      discountPercent: { type: ["number", "null"] }, wilaya: { type: ["string", "null"] }, comments: { type: ["string", "null"] }, confidence: { type: "number" }
    }} }
  }
};

function cleanRecords(value: Extraction): Extraction {
  const seen = new Set<string>();
  const records = (value.records || []).filter(r => r?.product?.trim()).map(r => ({
    ...r, product: r.product.trim().slice(0, 300), wholesaler: r.wholesaler?.trim().slice(0, 200) || null,
    laboratory: r.laboratory?.trim().slice(0, 200) || null, currency: (r.currency || "DZD").trim().toUpperCase().slice(0, 8),
    price: typeof r.price === "number" && r.price >= 0 ? r.price : null,
    discountPercent: typeof r.discountPercent === "number" && r.discountPercent >= 0 && r.discountPercent <= 100 ? r.discountPercent : null,
    confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)), comments: r.comments?.trim().slice(0, 2000) || null,
    wilaya: r.wilaya?.trim().slice(0, 100) || null
  })).filter(r => {
    const key = [r.product.toLowerCase(), r.wholesaler?.toLowerCase(), r.price, r.offerType].join("|");
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  return { summary: value.summary || "", records };
}

function aiClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY n’est pas configurée");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function callAI(content: string | { mimeType: string; buffer: Buffer }) {
  const openai = aiClient();
  const userContent = typeof content === "string"
    ? [{ type: "text", text: `DOCUMENT À ANALYSER :\n${content}` }]
    : [{ type: "text", text: "Analyse cette image ou capture d’écran." }, { type: "image_url", image_url: { url: `data:${content.mimeType};base64,${content.buffer.toString("base64")}`, detail: "high" } }];
  const completion = await openai.chat.completions.create({
    model, store: false, temperature: 0, messages: [{ role: "system", content: prompt }, { role: "user", content: userContent as never }],
    response_format: { type: "json_schema", json_schema: { name: "pharma_competitive_intelligence", strict: true, schema } }
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("L’IA n’a retourné aucune donnée");
  return cleanRecords(JSON.parse(raw) as Extraction);
}

async function callPdfAI(buffer: Buffer, filename: string) {
  const openai = aiClient();
  const response = await openai.responses.create({
    model, store: false, temperature: 0, instructions: prompt,
    input: [{ role: "user", content: [
      { type: "input_text", text: "Analyse toutes les pages de ce PDF, y compris les tableaux, images et pages scannées." },
      { type: "input_file", filename, file_data: `data:application/pdf;base64,${buffer.toString("base64")}` }
    ] }],
    text: { format: { type: "json_schema", name: "pharma_competitive_intelligence", strict: true, schema } }
  });
  if (!response.output_text) throw new Error("L’IA n’a retourné aucune donnée pour ce PDF");
  return cleanRecords(JSON.parse(response.output_text) as Extraction);
}

export async function extractText(buffer: Buffer, mimeType: string, filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return null;
  if (ext === ".pdf" || mimeType === "application/pdf") return (await pdfParse(buffer)).text;
  if (ext === ".docx" || mimeType.includes("wordprocessingml")) return (await mammoth.extractRawText({ buffer })).value;
  if ([".xlsx", ".csv"].includes(ext) || mimeType.includes("spreadsheet") || mimeType === "text/csv") {
    const workbook = new ExcelJS.Workbook();
    if (ext === ".csv" || mimeType === "text/csv") await workbook.csv.read(Readable.from(buffer));
    else await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    return workbook.worksheets.map(sheet => {
      const rows: string[] = [];
      sheet.eachRow({ includeEmpty: false }, row => {
        const cells = (row.values as ExcelJS.CellValue[]).slice(1).map(value => {
          if (value instanceof Date) return value.toISOString();
          if (value && typeof value === "object") {
            if ("text" in value) return String(value.text);
            if ("result" in value) return String(value.result ?? "");
            if ("richText" in value) return value.richText.map(x => x.text).join("");
          }
          return String(value ?? "");
        });
        rows.push(cells.map(cell => /[;\n\"]/g.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(";"));
      });
      return `### FEUILLE: ${sheet.name}\n${rows.join("\n")}`;
    }).join("\n\n");
  }
  return buffer.toString("utf8");
}

export async function analyzeDocument(buffer: Buffer, mimeType: string, filename: string): Promise<Extraction & { rawText: string | null }> {
  const text = await extractText(buffer, mimeType, filename);
  if (text === null) return { ...(await callAI({ mimeType, buffer })), rawText: null };
  const normalized = text.replace(/\u0000/g, "").trim();
  if (path.extname(filename).toLowerCase() === ".pdf" || mimeType === "application/pdf") {
    return { ...(await callPdfAI(buffer, filename)), rawText: normalized.slice(0, 1_000_000) || null };
  }
  if (!normalized) throw new Error("Aucun texte exploitable détecté dans le document. Convertissez le PDF scanné en image ou activez un service OCR.");
  const chunks = normalized.match(/[\s\S]{1,60000}/g)?.slice(0, 20) || [];
  const partials: Extraction[] = [];
  for (let i = 0; i < chunks.length; i++) partials.push(await callAI(`Partie ${i + 1}/${chunks.length}\n${chunks[i]}`));
  return { summary: partials.map(x => x.summary).join(" "), records: cleanRecords({ summary: "", records: partials.flatMap(x => x.records) }).records, rawText: normalized.slice(0, 1_000_000) };
}
