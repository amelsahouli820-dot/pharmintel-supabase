import { NextRequest,NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canViewAudit } from "@/lib/access";
import { db } from "@/lib/db";
import { forbidden,unauthorized } from "@/lib/http";
export async function GET(request:NextRequest){const user=await requireApiUser();if(!user)return unauthorized();if(!canViewAudit(user))return forbidden();const s=request.nextUrl.searchParams;const action=s.get("action")||undefined;const search=s.get("search")?.trim();const items=await db.auditLog.findMany({where:{...(action?{action}:{}),...(search?{OR:[{action:{contains:search,mode:"insensitive"}},{entityType:{contains:search,mode:"insensitive"}},{actor:{name:{contains:search,mode:"insensitive"}}}]}:{})},orderBy:{createdAt:"desc"},take:250,include:{actor:{select:{name:true,email:true,role:true}}}});return NextResponse.json({items})}
