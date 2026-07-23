import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, unauthorized } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const user = await requireApiUser();
  if (!user) return unauthorized();
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || "Mot de passe invalide.");
  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, fullUser.passwordHash))) return badRequest("Le mot de passe temporaire est incorrect.");
  if (await bcrypt.compare(parsed.data.newPassword, fullUser.passwordHash)) return badRequest("Le nouveau mot de passe doit être différent.");
  const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), mustChangePassword: false, sessionVersion: { increment: 1 } } });
  await createSession(updated);
  await audit(user.id, "PASSWORD_CHANGED", "User", user.id, undefined, clientIp(request));
  return NextResponse.json({ ok: true });
}
