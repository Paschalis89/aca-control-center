import { Controller,Get,Post,Query,Body,Param,BadRequestException,NotFoundException } from '@nestjs/common';
import { Db } from '../db.service';
import { ShopifySync,calculateLineContribution } from './shopify.service';
import { CurrentUser,Roles } from '../auth/auth';
import { Audit } from '../audit/audit.service';
import { z } from 'zod';import {parse} from '../validation';
const money=z.coerce.number().finite().min(0).max(100000000);
const productSchema=z.object({variantGid:z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),productGid:z.string().optional().nullable(),partnerId:z.string().min(10),label:z.string().min(2).max(180),basePrice:money,currency:z.enum(['EUR','USD','GBP'])}).strict();
@Controller('sales')
export class CommerceController{
 constructor(private db:Db,private shopify:ShopifySync,private audit:Audit){}
 @Get('integration') status(){return this.shopify.state();}
 @Roles('ADMIN') @Post('sync')async sync(@CurrentUser()u:any){const r=await this.shopify.sync();await this.audit.log(u.id,'SYNC','SHOPIFY',null,{processed:r.processed,partial:r.partial});return r;}
 @Get('overview')async overview(@Query('year')value?:string){const year=value?Number(value):new Date().getUTCFullYear();if(!Number.isInteger(year)||year<2020||year>2100)throw new BadRequestException('Invalid year');
  const orders=await this.db.commerceOrder.findMany({where:{placedAt:{gte:new Date(Date.UTC(year,0,1)),lt:new Date(Date.UTC(year+1,0,1))}},include:{lines:true}});
  let gmv=0,totalOrders=0,knownContribution=0,pricedLines=0,unpricedLines=0,flaggedLines=0,refunds=0;
  for(const order of orders){if(order.cancelledAt)continue;totalOrders++;gmv+=Number(order.totalPrice);refunds+=Number(order.totalRefunded);
   for(const line of order.lines){const result=calculateLineContribution(line,order);if(result===null){if(line.baseCostAtOrder===null)unpricedLines++;else flaggedLines++;}else {pricedLines++;knownContribution+=result;}}
  }
  return {year,connected:this.shopify.status().configured,orders:totalOrders,gmv:Math.round(gmv*100)/100,refunds:Math.round(refunds*100)/100,knownContribution:Math.round(knownContribution*100)/100,pricedLines,unpricedLines,flaggedLines,complete:totalOrders>0&&unpricedLines===0&&flaggedLines===0,currency:'EUR',warning:'GMV includes shipping/taxes and may include pending orders. Contributions exclude refunded, discounted, tax-inclusive, unmatched or currency-mismatched lines. Do not treat partial contributions as company profit.'};
 }
 @Get('orders') async orders(@Query('limit')l?:string){const limit=Math.min(Math.max(Number(l)||30,1),100);return this.db.commerceOrder.findMany({orderBy:{placedAt:'desc'},take:limit,include:{lines:true}});}
 @Roles('ADMIN') @Post('products')async upsertCost(@Body()body:any,@CurrentUser()u:any){const d=parse(productSchema,body);const partner=await this.db.partner.findUnique({where:{id:d.partnerId}});if(!partner)throw new NotFoundException('Partner');const found=await this.db.partnerProduct.findUnique({where:{variantGid:d.variantGid}});
  const p=await this.db.partnerProduct.upsert({where:{variantGid:d.variantGid},create:d,update:{...d,effectiveFrom:new Date()}});
  await this.audit.log(u.id,found?'UPDATE':'CREATE','PARTNER_PRODUCT',p.id,{variantGid:d.variantGid,basePrice:d.basePrice});return p;}
 @Get('products')products(){return this.db.partnerProduct.findMany({include:{partner:{select:{name:true}}},orderBy:{updatedAt:'desc'},take:300});}
}
