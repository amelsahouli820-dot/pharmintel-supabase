import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Redis from "ioredis";

export const unauthorized = () => NextResponse.json({ error: "Authentification requise." }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Vous ne disposez pas des droits nécessaires." }, { status: 403 });
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
export function assertSameOrigin(request: NextRequest) { const origin = request.headers.get("origin"); if (!origin) return true; const expected = process.env.APP_URL; return expected ? origin === new URL(expected).origin : origin === request.nextUrl.origin; }
export function clientIp(request: NextRequest) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null; }
export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string, metadata?: object, ipAddress?: string | null) { await db.auditLog.create({ data: { actorId, action, entityType, entityId, metadata, ipAddress } }).catch(() => undefined); }

const buckets = new Map<string, { count: number; reset: number }>();
declare global { var rateLimitRedis: Redis | undefined; }
const redis = process.env.REDIS_URL ? (global.rateLimitRedis ?? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })) : null;
if (redis && process.env.NODE_ENV !== "production") global.rateLimitRedis = redis;
function localLimit(key: string, max: number, windowMs: number) { const now = Date.now(); const bucket = buckets.get(key); if (!bucket || bucket.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; } if (bucket.count >= max) return false; bucket.count += 1; return true; }
export async function rateLimit(key: string, max = 8, windowMs = 60_000) {
  if (!redis) return localLimit(key, max, windowMs);
  try { if (redis.status === "wait") await redis.connect(); const count = Number(await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n", 1, `pharmintel:limit:${key}`, windowMs)); return count <= max; }
  catch { return localLimit(key, max, windowMs); }
}
