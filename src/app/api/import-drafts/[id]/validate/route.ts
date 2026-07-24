import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin, audit, badRequest, clientIp, forbidden, unauthorized } from "@/lib/http";
import { documentMetadataSchema } from "@/lib/validation";
import { putFile } from "@/lib/storage";
import { linkSignal } from "@/lib/signals";
type C={params:Promise<{id:string}>};
const offerMap:Record<string,any>={FLASH_SALE:"FLASH_SALE",RESTOCK:"RESTOCK",QUOTA:"OFFER",PROMOTION:"PROMOTION",REBATE:"DISCOUNT",EXCEPTIONAL_DISCOUNT:"DISCOUNT",PRODUCT_LAUNCH:"NEW_PRODUCT",COMMERCIAL_PROPOSAL:"OFFER"};
export async function POST(request:NextRequest,{params}:C){
 if(!assertSameOrigin(request))return forbidden();const user=await requireApiUser();if(!user)return unauthorized();const{id}=await params;
 const draft=await db.importDraft.findFirst({where:{id,userId:user.id},include:{files:true}});if(!draft)return NextResponse.json({error:"Brouillon introuvable."},{status:404});
 const parsed=documentMetadataSchema.safeParse(draft.metadata);if(!parsed.success)return badRequest(parsed.error.issues[0]?.message||"Complétez les champs obligatoires du brouillon.");const m=parsed.data;
 if(!draft.files.length&&(!m.product||!m.comments))return badRequest("Sans fichier, le produit et la description/commentaire sont obligatoires.");
 const wilayaRef=m.wilaya?await db.referenceEntity.findFirst({where:{type:"WILAYA",name:m.wilaya,active:true},select:{region:true}}):null;if(m.wilaya&&!wilayaRef)return badRequest("La wilaya sélectionnée n’est plus disponible.");
 const region=wilayaRef?.region||m.region||null,aiReady=Boolean(process.env.OPENAI_API_KEY),toDate=(x:string)=>x?new Date(`${x}T12:00:00Z`):null;
 for(const file of draft.files)if(await db.document.findFirst({where:{sha256:file.sha256,userId:user.id}}))return NextResponse.json({error:`Le fichier ${file.originalName} a déjà été importé.`},{status:409});
 const created:string[]=[];
 if(draft.files.length){
  for(const file of draft.files){
   const document=await db.document.create({data:{userId:user.id,originalName:file.originalName,storageKey:file.storageKey,mimeType:file.mimeType,size:file.size,sha256:file.sha256,status:aiReady?"PENDING":"WAITING_AI",reviewStatus:aiReady?"PENDING_AI":"PENDING",wholesaler:m.wholesaler==="OTHER"?m.customWholesaler:m.wholesaler,customWholesaler:m.wholesaler==="OTHER"?m.customWholesaler:null,documentType:m.documentType,customDocumentType:m.documentType==="OTHER"?m.customDocumentType:null,documentDate:toDate(m.documentDate),receivedAt:toDate(m.receivedAt)||new Date(),region,wilaya:m.wilaya||null,laboratory:m.laboratory||null,comments:m.comments||null,confidentiality:m.confidentiality,priority:m.priority,scoreEvents:{create:{userId:user.id,points:10,reason:"DOCUMENT_IMPORTED",details:file.originalName}},...(aiReady?{processingJob:{create:{status:"QUEUED"}}}:{})}});created.push(document.id)
  }
 }else{
  const payload=Buffer.from(JSON.stringify({...m,entryMode:"draft-manual",validatedAt:new Date().toISOString()},null,2));const key=`${user.id}/${new Date().toISOString().slice(0,10)}/${randomUUID()}-information-terrain.json`;await putFile(key,payload,"application/json");
  const document=await db.document.create({data:{userId:user.id,originalName:`Information terrain - ${m.product}.json`,storageKey:key,mimeType:"application/json",size:payload.length,sha256:createHash("sha256").update(payload).digest("hex"),status:"COMPLETED",reviewStatus:"PENDING",sourceKind:"MANUAL",wholesaler:m.wholesaler==="OTHER"?m.customWholesaler:m.wholesaler,documentType:m.documentType,customDocumentType:m.customDocumentType||null,documentDate:toDate(m.documentDate)||new Date(),receivedAt:new Date(),region,wilaya:m.wilaya||null,laboratory:m.laboratory||null,comments:m.comments,priority:m.priority,confidentiality:m.confidentiality,records:{create:{userId:user.id,observedAt:toDate(m.documentDate)||new Date(),wholesaler:m.wholesaler==="OTHER"?m.customWholesaler:m.wholesaler,laboratory:m.laboratory||null,product:m.product,offerType:offerMap[m.documentType]||"OTHER",wilaya:m.wilaya||null,region,comments:m.comments,confidence:.8,rawExtraction:{entryMode:"draft-manual",...m}}},scoreEvents:{create:{userId:user.id,points:8,reason:"MANUAL_INFORMATION",details:m.product}}},include:{records:true}});
  created.push(document.id);const record=document.records[0];if(record)await linkSignal({recordId:record.id,documentId:document.id,userId:user.id,wholesaler:record.wholesaler,laboratory:record.laboratory,product:record.product,offerType:record.offerType,region,wilaya:m.wilaya||null})
 }
 await db.importDraft.delete({where:{id}});const recipients=await db.user.findMany({where:{status:"ACTIVE",OR:[{role:"ADMIN"},...(user.supervisorId?[{id:user.supervisorId}]:[])]},select:{id:true}});if(recipients.length)await db.alert.createMany({data:recipients.map(x=>({userId:x.id,type:draft.files.length?"DOCUMENT_IMPORTED":"NEW_FIELD_INFORMATION",severity:m.priority==="URGENT"?"CRITICAL":"INFO",title:draft.files.length?"Nouvel import validé":"Nouvelle information terrain",message:`${user.name} — ${m.wholesaler}`}))});
 await audit(user.id,"IMPORT_DRAFT_VALIDATED","ImportDraft",id,{documents:created,result:"SUCCESS"},clientIp(request));return NextResponse.json({ok:true,documents:created,message:"Importation réalisée avec succès."})
}
