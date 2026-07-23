import { NextRequest,NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canValidateDocuments,documentScope } from "@/lib/access";
import { db } from "@/lib/db";
import { assertSameOrigin,audit,clientIp,forbidden,unauthorized } from "@/lib/http";
type Context={params:Promise<{id:string}>};
export async function POST(request:NextRequest,{params}:Context){if(!assertSameOrigin(request))return forbidden();const user=await requireApiUser();if(!user)return unauthorized();if(!canValidateDocuments(user))return forbidden();const{id}=await params;const doc=await db.document.findFirst({where:{id,...documentScope(user)},select:{id:true}});if(!doc)return NextResponse.json({error:"Document introuvable ou hors de votre équipe."},{status:404});await db.document.update({where:{id},data:{reviewStatus:"VALIDATED"}});await audit(user.id,"DOCUMENT_VALIDATED","Document",id,undefined,clientIp(request));return NextResponse.json({ok:true})}
