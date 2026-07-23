import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "pharmintel_session";
const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET doit contenir au moins 32 caractères");
  return new TextEncoder().encode(value);
};

export type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  sessionVersion: number;
};

export async function createSession(user: { id: string; email: string; name: string; role: Role; mustChangePassword: boolean; sessionVersion: number }) {
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword, sessionVersion: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("8h").sign(secret());
  const store = await cookies();
  const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearSession() {
  const store = await cookies();
  const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function readSession(): Promise<SessionPayload | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload as SessionPayload;
  } catch { return null; }
}

export async function requireSession() {
  const session = await readSession();
  if (!session?.sub) redirect("/connexion");
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true, status: true, permissions: true, mustChangePassword: true, sessionVersion: true } });
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion) redirect("/connexion");
  return user;
}

export async function requireApiUser(role?: Role) {
  const session = await readSession();
  if (!session?.sub) return null;
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true, status: true, permissions: true, mustChangePassword: true, sessionVersion: true } });
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion || (role && user.role !== role)) return null;
  return user;
}

export function permissionsOf(value: unknown) {
  const p = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { canImport: p.canImport !== false, canUseAI: p.canUseAI !== false, canExport: p.canExport !== false };
}
