import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, permissionsOf } from "@/lib/auth";
import { canDeleteDocument, canEditDocument } from "@/lib/access";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { deleteFile } from "@/lib/storage";
import { documentUpdateSchema } from "@/lib/validation";
type Context={params:Promise<{id:string}>};
export async function PATCH(request:NextRequest,{params}:Context){
 if(!assertSameOrigin(request))return forbidden();const user=await requireApiUser();if(!user)return unauthorized();const{id}=await params;
 const document=await db.document.findUnique({where:{id},select:{id:true,userId:true,reviewStatus:true,user:{select:{supervisorId:true}}}});if(!document)return NextResponse.json({error:"Document introuvable."},{status:404});
 if(!canEditDocument(user,document.userId,document.user.supervisorId)||(!permissionsOf(user.permissions).canEditOwn&&user.role==="DELEGATE"))return forbidden();if(user.role==="DELEGATE"&&["VALIDATED","REJECTED","ARCHIVED"].includes(document.reviewStatus))return badRequest("Ce document ne peut plus être modifié après validation ou rejet.");
 const parsed=documentUpdateSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return badRequest(parsed.error.issues[0]?.message||"Métadonnées invalides.");
 const data={...parsed.data,documentDate:parsed.data.documentDate?new Date(`${parsed.data.documentDate}T12:00:00Z`):parsed.data.documentDate===null?null:undefined,receivedAt:parsed.data.receivedAt?new Date(`${parsed.data.receivedAt}T12:00:00Z`):parsed.data.receivedAt===null?null:undefined};
 const updated=await db.document.update({where:{id},data:{...data,reviewStatus:"MODIFIED"}});if(user.id!==document.userId)await db.alert.create({data:{userId:document.userId,type:"DOCUMENT_MODIFIED",severity:"INFO",title:"Document modifié",message:updated.originalName}});await audit(user.id,"DOCUMENT_UPDATED","Document",id,{fields:Object.keys(parsed.data)},clientIp(request));return NextResponse.json({document:updated});
}
export async function DELETE(request:NextRequest,{params}:Context){
 if(!assertSameOrigin(request))return forbidden();const user=await requireApiUser();if(!user)return unauthorized();const{id}=await params;
 const document=await db.document.findUnique({where:{id},select:{id:true,userId:true,storageKey:true,originalName:true}});if(!document)return NextResponse.json({error:"Document introuvable."},{status:404});
 if(!canDeleteDocument(user,document.userId,permissionsOf(user.permissions).canDeleteOwn))return forbidden();
 await deleteFile(document.storageKey).catch(()=>undefined);await db.document.delete({where:{id}});await audit(user.id,"DOCUMENT_DELETED","Document",id,{name:document.originalName},clientIp(request));return NextResponse.json({ok:true});
}
