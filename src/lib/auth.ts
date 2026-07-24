import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { randomUUID } from "node:crypto";

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
  jti: string;
};

export async function createSession(user: { id: string; email: string; name: string; role: Role; mustChangePassword: boolean; sessionVersion: number }, context?:{ipAddress?:string|null;userAgent?:string|null}) {
  const jti=randomUUID();const expiresAt=new Date(Date.now()+8*60*60*1000);
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword, sessionVersion: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setJti(jti).setIssuedAt().setExpirationTime("8h").sign(secret());
  await db.session.create({data:{tokenId:jti,userId:user.id,ipAddress:context?.ipAddress||null,userAgent:context?.userAgent?.slice(0,500)||null,expiresAt}});
  const store = await cookies();
  const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearSession() {
  const current=await readSession();if(current?.jti)await db.session.updateMany({where:{tokenId:current.jti,revokedAt:null},data:{revokedAt:new Date()}}).catch(()=>undefined);
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

async function storedSessionActive(session:SessionPayload){if(!session.jti)return false;const stored=await db.session.findUnique({where:{tokenId:session.jti},select:{id:true,userId:true,revokedAt:true,expiresAt:true,lastSeenAt:true}});if(!stored||stored.userId!==session.sub||stored.revokedAt||stored.expiresAt<=new Date())return false;if(Date.now()-stored.lastSeenAt.getTime()>5*60*1000)await db.session.update({where:{id:stored.id},data:{lastSeenAt:new Date()}}).catch(()=>undefined);return true}

export async function requireSession() {
  const session = await readSession();
  if (!session?.sub||!(await storedSessionActive(session))) redirect("/connexion");
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true, status: true, permissions: true, region: true, wilaya: true, supervisorId: true, mustChangePassword: true, sessionVersion: true } });
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion) redirect("/connexion");
  return user;
}

export async function requireApiUser(role?: Role) {
  const session = await readSession();
  if (!session?.sub||!(await storedSessionActive(session))) return null;
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true, status: true, permissions: true, region: true, wilaya: true, supervisorId: true, mustChangePassword: true, sessionVersion: true } });
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion || (role && user.role !== role)) return null;
  return user;
}

export function permissionsOf(value: unknown) {
  const p = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { canImport: p.canImport !== false, canUseAI: p.canUseAI !== false, canExport: p.canExport !== false, canEditOwn: p.canEditOwn !== false, canDeleteOwn: p.canDeleteOwn === true };
}
