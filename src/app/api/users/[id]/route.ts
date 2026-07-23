import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { updateUserSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  if (!assertSameOrigin(request)) return forbidden();
  const admin = await requireApiUser("ADMIN");
  if (!admin) return unauthorized();
  const { id } = await context.params;
  const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || "Informations invalides.");
  if (id === admin.id && (parsed.data.status === "SUSPENDED" || (parsed.data.role && parsed.data.role !== "ADMIN"))) return badRequest("Vous ne pouvez pas retirer vos propres droits administrateur.");
  const current = await db.user.findUnique({ where: { id }, select: { status: true } });
  if (!current) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  const { temporaryPassword, ...changes } = parsed.data;
  if (current.status === "PENDING" && changes.status === "ACTIVE" && !temporaryPassword) return badRequest("Définissez un mot de passe temporaire avant d’autoriser ce compte.");
  if (changes.supervisorId) {
    const supervisor = await db.user.findFirst({ where: { id: changes.supervisorId, role: "SUPERVISOR", status: "ACTIVE" } });
    if (!supervisor) return badRequest("Le superviseur sélectionné n’est pas valide.");
  }
  if (changes.role && changes.role !== "DELEGATE") { changes.supervisorId = null; changes.region = null; changes.wilaya = null; }
  const user = await db.user.update({ where: { id }, data: { ...changes, ...(temporaryPassword ? { passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true, sessionVersion: { increment: 1 } } : {}),
      ...(changes.status === "SUSPENDED" && !temporaryPassword ? { sessionVersion: { increment: 1 } } : {}) } }).catch(() => null);
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  await audit(admin.id, "USER_UPDATED", "User", id, { fields: Object.keys(parsed.data) }, clientIp(request));
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, status: user.status, permissions: user.permissions } });
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!assertSameOrigin(request)) return forbidden();
  const admin = await requireApiUser("ADMIN");
  if (!admin) return unauthorized();
  const { id } = await context.params;
  if (id === admin.id) return badRequest("Vous ne pouvez pas supprimer votre propre compte.");
  const user = await db.user.findUnique({ where: { id }, include: { _count: { select: { documents: true } } } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (user._count.documents > 0) {
    await db.user.update({ where: { id }, data: { status: "SUSPENDED", sessionVersion: { increment: 1 } } });
    await audit(admin.id, "USER_ARCHIVED", "User", id, undefined, clientIp(request));
    return NextResponse.json({ ok: true, archived: true });
  }
  await db.user.delete({ where: { id } });
  await audit(admin.id, "USER_DELETED", "User", id, undefined, clientIp(request));
  return NextResponse.json({ ok: true, archived: false });
}
