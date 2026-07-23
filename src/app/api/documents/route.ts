import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { requireApiUser, permissionsOf } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { putFile } from "@/lib/storage";

const allowedExtensions = new Set([".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv"]);

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const take = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 15));
  const where = user.role === "ADMIN" ? {} : { userId: user.id };
  const [items, total] = await Promise.all([
    db.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { user: { select: { name: true } }, _count: { select: { records: true } } } }),
    db.document.count({ where })
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / take) });
}

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (!permissionsOf(user.permissions).canImport) return forbidden();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("Sélectionnez un document à importer.");
  const ext = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.has(ext)) return badRequest("Format non pris en charge. Utilisez PDF, Word, Excel, image, CSV ou texte.");
  const maxBytes = (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024;
  if (!file.size || file.size > maxBytes) return badRequest(`La taille du fichier doit être comprise entre 1 octet et ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const duplicate = await db.document.findFirst({ where: { userId: user.id, sha256, status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "Ce document a déjà été importé.", documentId: duplicate.id }, { status: 409 });
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  const key = `${user.id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  await putFile(key, buffer, file.type || "application/octet-stream");
  const document = await db.document.create({ data: { userId: user.id, originalName: file.name.slice(0, 255), storageKey: key, mimeType: file.type || "application/octet-stream", size: file.size, sha256, processingJob: { create: { status: "QUEUED" } } } });
  await audit(user.id, "DOCUMENT_UPLOADED", "Document", document.id, { name: document.originalName, size: document.size }, clientIp(request));
  return NextResponse.json({ document }, { status: 201 });
}
