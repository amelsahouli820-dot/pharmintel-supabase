import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, rateLimit } from "@/lib/http";
import { registrationSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const ip = clientIp(request) || "unknown";
  if (!(await rateLimit(`registration:${ip}`, 5, 60 * 60_000))) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || "Informations invalides.");

  const existing = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!existing) {
    const user = await db.user.create({ data: {
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,firstName:parsed.data.firstName,lastName:parsed.data.lastName,jobTitle:parsed.data.jobTitle,service:parsed.data.service||null,email: parsed.data.email,personalEmail:parsed.data.personalEmail||null,phone:parsed.data.phone,personalPhone:parsed.data.personalPhone||null,region:parsed.data.region,wilaya:parsed.data.wilaya,messagingApps:parsed.data.messagingApps,notificationPreferences:parsed.data.notificationPreferences,urgentAlerts:parsed.data.urgentAlerts,
      passwordHash: await bcrypt.hash(randomBytes(48).toString("base64url"), 12),
      role: "DELEGATE", status: "PENDING", mustChangePassword: true,
      permissions: { canImport: true, canUseAI: true, canExport: true }
    }});
    const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    if (admins.length) await db.alert.createMany({ data: admins.map(admin => ({
      userId: admin.id, type: "USER_REGISTRATION_REQUEST", severity: "INFO",
      title: "Nouvelle demande d’accès", message: `${user.name} (${user.email}) souhaite rejoindre PharmIntel.`
    })) });
    await audit(null, "REGISTRATION_REQUESTED", "User", user.id, { email: user.email }, ip);
  }
  return NextResponse.json({ ok: true, message: "Votre demande a été transmise à l’administrateur." }, { status: 201 });
}
