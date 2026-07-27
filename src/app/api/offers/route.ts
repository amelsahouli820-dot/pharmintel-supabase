import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { recordScope } from "@/lib/access";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { calculateCommercial } from "@/lib/commercial";
export async function GET(request:NextRequest){
 const user=await requireApiUser();if(!user)return unauthorized();const s=request.nextUrl.searchParams,search=s.get("search")?.trim();
 const from=s.get("from")?new Date(`${s.get("from")}T00:00:00Z`):undefined,to=s.get("to")?new Date(`${s.get("to")}T23:59:59Z`):undefined;
 const items=await db.intelligenceRecord.findMany({
  where:{...recordScope(user),AND:[{OR:[{discountPercent:{not:null}},{ugPercent:{not:null}},{offerText:{not:null}},{promotionalPrice:{not:null}}]},...(search?[{OR:[{product:{contains:search,mode:"insensitive" as const}},{wholesaler:{contains:search,mode:"insensitive" as const}},{laboratory:{contains:search,mode:"insensitive" as const}}]}]:[])],...(s.get("wholesaler")?{wholesaler:{contains:s.get("wholesaler")!,mode:"insensitive"}}:{}),...(s.get("laboratory")?{laboratory:{contains:s.get("laboratory")!,mode:"insensitive"}}:{}),...(s.get("product")?{product:{contains:s.get("product")!,mode:"insensitive"}}:{}),...(from||to?{observedAt:{...(from?{gte:from}:{}),...(to?{lte:to}:{})}}:{})},
  orderBy:{observedAt:"desc"},take:5000,include:{user:{select:{name:true}},document:{select:{sourceKind:true,originalName:true,watchType:{select:{name:true}}}}}
 });
 return NextResponse.json({items:items.map(x=>{const c=calculateCommercial({priceHt:Number(x.priceHt||x.price||0)||null,discountPercent:x.discountPercent?Number(x.discountPercent):null,ugPercent:x.ugPercent?Number(x.ugPercent):null,offerText:x.offerText,offerBuyQty:x.offerBuyQty,offerFreeQty:x.offerFreeQty});return{...x,priceHt:x.priceHt?.toString()||x.price?.toString(),discountPercent:c.discountPercent,ugPercent:c.ugPercent,offerText:c.offerText,netPrice:x.netPrice?.toString()||c.netPrice,priceAfterUg:x.priceAfterUg?.toString()||c.priceAfterUg,savings:x.savings?.toString()||c.savings}})})
}
