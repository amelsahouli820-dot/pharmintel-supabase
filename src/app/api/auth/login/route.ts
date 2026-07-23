import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { assertSameOrigin, audit, badRequest, clientIp, rateLimit } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

const DUMMY_HASH = "$2b$12$rHmZfR/OOHwZgsTzCUcL4.n2UMQ5dwxavFQqJsJoJt7Tncu0p6G9K";

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const ip = clientIp(request) || "unknown";
  if (!(await rateLimit(`login:${ip}`, 10, 15 * 60_000))) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, { status: 429 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Adresse e-mail ou mot de passe invalide.");
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) {
    await audit(user?.id || null, "LOGIN_FAILED", "Session", undefined, { email: parsed.data.email }, ip);
    return NextResponse.json({ error: "Adresse e-mail ou mot de passe incorrect." }, { status: 401 });
  }
  if (user.status === "PENDING") return NextResponse.json({ error: "Votre demande est en attente de validation par l’administrateur." }, { status: 403 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Ce compte n’est pas autorisé. Contactez l’administrateur." }, { status: 403 });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user);
  await audit(user.id, "LOGIN_SUCCESS", "Session", undefined, undefined, ip);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, mustChangePassword: user.mustChangePassword });
}
