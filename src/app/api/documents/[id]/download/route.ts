import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { documentScope } from "@/lib/access";
import { db } from "@/lib/db";
import { audit, clientIp, unauthorized } from "@/lib/http";
import { getFile } from "@/lib/storage";
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,{params}:Context){const user=await requireApiUser();if(!user)return unauthorized();const{id}=await params;const doc=await db.document.findFirst({where:{id,...documentScope(user)},select:{id:true,storageKey:true,originalName:true,mimeType:true}});if(!doc)return NextResponse.json({error:"Document introuvable."},{status:404});const buffer=await getFile(doc.storageKey);await audit(user.id,"DOCUMENT_DOWNLOADED","Document",id,{name:doc.originalName},clientIp(request));const name=doc.originalName.replace(/["\r\n]/g,"_");return new NextResponse(new Uint8Array(buffer),{headers:{"Content-Type":doc.mimeType,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(name)}`,"Cache-Control":"private, no-store"}})}
