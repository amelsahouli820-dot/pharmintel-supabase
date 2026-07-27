import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, clientIp, unauthorized } from "@/lib/http";
import { recordScope } from "@/lib/access";
export async function GET(request:NextRequest){
 const user=await requireApiUser();if(!user)return unauthorized();const s=request.nextUrl.searchParams;
 const page=Math.max(1,Number(s.get("page"))||1),take=Math.min(100,Math.max(1,Number(s.get("limit"))||20)),search=s.get("search")?.trim();
 const from=s.get("from")?new Date(`${s.get("from")}T00:00:00Z`):undefined,to=s.get("to")?new Date(`${s.get("to")}T23:59:59Z`):undefined,status=s.get("reviewStatus");
 const documentFilter:Prisma.DocumentWhereInput={...(s.get("watchTypeId")?{watchTypeId:s.get("watchTypeId")!}:{}),...(s.get("documentType")?{documentType:s.get("documentType") as any}:{}),...(status?{reviewStatus:status==="PENDING"?{in:["PENDING","PENDING_AI","NEEDS_REVIEW","MODIFIED"]}:status as any}:{})};
 const textFields=["product","wholesaler","laboratory","molecule","therapeuticClass","productCode","cip","salesperson","comments"];
 const where:Prisma.IntelligenceRecordWhereInput={
  ...recordScope(user),...(s.get("type")?{offerType:s.get("type") as any}:{}),...(s.get("wholesaler")?{wholesaler:{contains:s.get("wholesaler")!,mode:"insensitive"}}:{}),...(s.get("laboratory")?{laboratory:{contains:s.get("laboratory")!,mode:"insensitive"}}:{}),...(s.get("region")?{region:s.get("region")!}:{}),...(s.get("wilaya")?{wilaya:s.get("wilaya")!}:{}),...(s.get("userId")?{userId:s.get("userId")!}:{}),...(from||to?{observedAt:{...(from?{gte:from}:{}),...(to?{lte:to}:{})}}:{}),...(Object.keys(documentFilter).length?{document:documentFilter}:{}),
  ...(search?{OR:[...textFields.map(field=>({[field]:{contains:search,mode:"insensitive"}})),{user:{name:{contains:search,mode:"insensitive"}}},{document:{OR:[{originalName:{contains:search,mode:"insensitive"}},{entityName:{contains:search,mode:"insensitive"}},{comments:{contains:search,mode:"insensitive"}}]}}] as any}:{})
 };
 const [items,total]=await Promise.all([
  db.intelligenceRecord.findMany({
   where,orderBy:[{observedAt:"desc"},{createdAt:"desc"}],skip:(page-1)*take,take,
   include:{user:{select:{id:true,name:true}},document:{select:{originalName:true,documentType:true,reviewStatus:true,entityName:true,watchType:{select:{id:true,name:true,metadata:true}}}}}
  }),
  db.intelligenceRecord.count({where})
 ]);
 await audit(user.id,"DATA_VIEWED","IntelligenceRecord",undefined,{page,results:items.length,filters:Object.fromEntries(s.entries())},clientIp(request));return NextResponse.json({items,total,page,pages:Math.ceil(total/take)})
}
