import { NextResponse } from "next/server";
import { requireApiUser, permissionsOf } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  return NextResponse.json({ user: { ...user, permissions: permissionsOf(user.permissions) } });
}
