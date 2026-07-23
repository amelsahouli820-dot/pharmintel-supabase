import { NextRequest, NextResponse } from "next/server";
import { clearSession, readSession } from "@/lib/auth";
import { assertSameOrigin, audit, clientIp } from "@/lib/http";

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const session = await readSession();
  await clearSession();
  if (session?.sub) await audit(session.sub, "LOGOUT", "Session", undefined, undefined, clientIp(request));
  return NextResponse.json({ ok: true });
}
