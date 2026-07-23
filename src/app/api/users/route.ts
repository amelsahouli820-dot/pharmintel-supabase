import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiUser, permissionsOf } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { createUserSchema } from "@/lib/validation";

export async function GET() {
  const admin = await requireApiUser("ADMIN");
  if (!admin) return unauthorized();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, status: true, permissions: true, supervisorId: true, region: true, wilaya: true, supervisor: { select: { id: true, name: true } }, mustChangePassword: true, lastLoginAt: true, createdAt: true, _count: { select: { documents: true, records: true, delegates: true } } } });
  return NextResponse.json({ users: users.map(u => ({ ...u, permissions: permissionsOf(u.permissions) })) });
}

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return forbidden();
  const admin = await requireApiUser("ADMIN");
  if (!admin) return unauthorized();
  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || "Informations invalides.");
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return NextResponse.json({ error: "Un compte existe déjà pour cette adresse." }, { status: 409 });
  const user = await db.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.temporaryPassword, 12), role: parsed.data.role, permissions: parsed.data.permissions, supervisorId: parsed.data.role === "DELEGATE" ? parsed.data.supervisorId || null : null, region: parsed.data.role === "DELEGATE" ? parsed.data.region || null : null, wilaya: parsed.data.role === "DELEGATE" ? parsed.data.wilaya || null : null, mustChangePassword: true, status: "ACTIVE" } });
  await audit(admin.id, "USER_CREATED", "User", user.id, { email: user.email, role: user.role }, clientIp(request));
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } }, { status: 201 });
}
