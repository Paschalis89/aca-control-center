import { Injectable, BadGatewayException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Db } from '../db.service';

// Financial fields only. Deliberately NO customer, address, phone or email fields.
const ORDERS_QUERY = `query ACAOrderMirror($after: String, $search: String!) {
  orders(first: 50, after: $after, sortKey: UPDATED_AT, query: $search) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id name createdAt updatedAt cancelledAt displayFinancialStatus taxesIncluded
      totalPriceSet { shopMoney { amount currencyCode } }
      currentSubtotalPriceSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
      totalDiscountsSet { shopMoney { amount currencyCode } }
      lineItems(first: 100) {
        pageInfo { hasNextPage }
        nodes { id title vendor quantity currentQuantity
          discountedTotalSet { shopMoney { amount currencyCode } }
          variant { id }
          product { id }
        }
      }
    }
  }
}`;

export const moneyValue=(s:any):number=>{
 const v=Number(s?.shopMoney?.amount??0);
 if (!Number.isFinite(v)||v<0) throw new BadGatewayException('Invalid Shopify money field');
 return v;
};
const nonnegative=(n:number)=>Math.round(Math.max(n,0)*100)/100;

@Injectable()
export class ShopifySync {
 private running=false;
 constructor(private db:Db) {}
 status(){
  const domain=process.env.SHOPIFY_SHOP_DOMAIN||'';
  const token=process.env.SHOPIFY_ADMIN_ACCESS_TOKEN||'';
  return {configured:/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)&&token.length>10,
   shop:domain||null,apiVersion:process.env.SHOPIFY_API_VERSION||'2026-07'};
 }
 async state(){return {...this.status(),sync:await this.db.integrationState.findUnique({where:{key:'shopify'}})};}
 private async graphql(query:string,variables:any){
  const {configured,shop,apiVersion}=this.status();
  if(!configured||!shop)throw new ServiceUnavailableException('Shopify integration is not configured');
  if(!/^20\d{2}-(01|04|07|10)$/.test(apiVersion))throw new ServiceUnavailableException('Invalid Shopify API version');
  const response=await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`,{
   method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!},
   body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)
  });
  if(!response.ok)throw new BadGatewayException(`Shopify API HTTP ${response.status}`);
  const result:any=await response.json();
  if(result.errors?.length)throw new BadGatewayException(`Shopify GraphQL: ${result.errors.map((e:any)=>e.message).join('; ').slice(0,300)}`);
  return result.data;
 }
 async sync(){
  if(this.running)throw new ConflictException('Shopify sync already in progress');
  this.running=true;
  let processed=0;let pages=0;
  const state=await this.db.integrationState.upsert({where:{key:'shopify'},create:{key:'shopify'},update:{}});
  const windowStart=state.windowStart||new Date(state.lastSyncAt?state.lastSyncAt.getTime()-86400000:Date.now()-59*86400000);
  let cursor=state.nextCursor||null;
  try{
   const maxPages=Math.min(10,Math.max(1,Number(process.env.SHOPIFY_SYNC_MAX_PAGES||4)));
   let more=false;
   do {
    const filter=`updated_at:>=${windowStart.toISOString().slice(0,10)}`;
    const data=await this.graphql(ORDERS_QUERY,{after:cursor,search:filter});
    const chunk=data?.orders;
    if(!chunk?.pageInfo||!Array.isArray(chunk.nodes))throw new BadGatewayException('Unexpected Shopify response');
    for(const o of chunk.nodes){await this.saveOrder(o);processed++;}
    more=Boolean(chunk.pageInfo.hasNextPage);
    cursor=more?chunk.pageInfo.endCursor:null;
    pages++;
    await this.db.integrationState.update({where:{key:'shopify'},data:{nextCursor:cursor,windowStart:more?windowStart:null, lastSyncAt:more?undefined:new Date(),lastError:null,syncedOrders:{increment:chunk.nodes.length}}});
    if(!more)break;
   }while(pages<maxPages);
   return {processed,pages,partial:more,nextPageAvailable:more,completed:!more};
  }catch(e:any){
   await this.db.integrationState.update({where:{key:'shopify'},data:{lastError:String(e?.message||e).slice(0,500)}});
   throw e;
  }finally{this.running=false;}
 }
 private async saveOrder(o:any){
  const dataLine=o.lineItems;
  if(dataLine?.pageInfo?.hasNextPage)throw new BadGatewayException('Order exceeds 100 line items; cannot mirror safely');
  if(!Array.isArray(dataLine?.nodes))throw new BadGatewayException('Order has missing line items');
  const subtotal=moneyValue(o.currentSubtotalPriceSet), total=moneyValue(o.totalPriceSet);
  const refunds=moneyValue(o.totalRefundedSet);
  const currency=o.totalPriceSet?.shopMoney?.currencyCode;
  if(!currency||currency!==o.currentSubtotalPriceSet?.shopMoney?.currencyCode)throw new BadGatewayException('Inconsistent Shopify currencies');
  if(currency!=='EUR')throw new BadGatewayException('ACA finance currently supports EUR shopMoney only; currency conversion is not configured');
  await this.db.$transaction(async tx=>{
   await tx.commerceOrder.upsert({where:{gid:o.id},create:{gid:o.id,name:o.name,placedAt:new Date(o.createdAt),modifiedAt:new Date(o.updatedAt),cancelledAt:o.cancelledAt?new Date(o.cancelledAt):null,paymentStatus:o.displayFinancialStatus||'UNKNOWN',taxesIncluded:!!o.taxesIncluded,hasDiscounts:moneyValue(o.totalDiscountsSet)>0,currency,totalPrice:total,subtotalPrice:subtotal,totalRefunded:refunds},update:{name:o.name,modifiedAt:new Date(o.updatedAt),cancelledAt:o.cancelledAt?new Date(o.cancelledAt):null,paymentStatus:o.displayFinancialStatus||'UNKNOWN',taxesIncluded:!!o.taxesIncluded,hasDiscounts:moneyValue(o.totalDiscountsSet)>0,currency,totalPrice:total,subtotalPrice:subtotal,totalRefunded:refunds,syncedAt:new Date()}});
   for(const item of dataLine.nodes){
    const variantGid=item.variant?.id||null;
    const price=variantGid?await tx.partnerProduct.findUnique({where:{variantGid}}):null;
    const agreement=price&&price.currency===currency&&price.effectiveFrom.getTime()<=new Date(o.createdAt).getTime()?price:null;
    const quantity=Math.max(0,Number(item.quantity)||0);
    const currentQty=Math.max(0,Number(item.currentQuantity)||0);
    await tx.commerceLine.upsert({where:{gid:item.id},create:{gid:item.id,orderGid:o.id,title:item.title||'',vendor:item.vendor||null,variantGid,productGid:item.product?.id||null,quantity,currentQuantity:currentQty,lineAmount:moneyValue(item.discountedTotalSet),currency,baseCostAtOrder:agreement?agreement.basePrice:null,partnerIdAtOrder:agreement?agreement.partnerId:null},update:{title:item.title||'',vendor:item.vendor||null,variantGid,productGid:item.product?.id||null,quantity,currentQuantity:currentQty,lineAmount:moneyValue(item.discountedTotalSet),currency}});
   }
  },{timeout:15000});
 }
}

export function calculateLineContribution(line:{lineAmount:any,currentQuantity:number,quantity:number,baseCostAtOrder:any},order:{taxesIncluded:boolean,hasDiscounts:boolean,totalRefunded:any,cancelledAt:any}){
 // Refunds/discounts/tax-included orders deliberately excluded from verified margins.
 if(order.cancelledAt||order.taxesIncluded||order.hasDiscounts||Number(order.totalRefunded)>0||line.baseCostAtOrder===null||line.baseCostAtOrder===undefined||line.currentQuantity!==line.quantity)return null;
 return nonnegative(Number(line.lineAmount))-Number(line.baseCostAtOrder)*line.quantity;
}
