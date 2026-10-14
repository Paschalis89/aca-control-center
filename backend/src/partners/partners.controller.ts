import {Body,ConflictException,Controller,Delete,Get,NotFoundException,Param,Patch,Post} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {Db} from '../db.service';import {CurrentUser,Roles} from '../auth/auth';import {Audit} from '../audit/audit.service';import {parse} from '../validation';import {z} from 'zod';
import {calculateLineContribution} from '../commerce/shopify.service';
const input=z.object({name:z.string().trim().min(2).max(160),shopifyVendor:z.string().trim().min(1).max(160).optional().nullable(),crmReference:z.string().trim().max(160).optional().nullable(),notes:z.string().max(2000).optional().nullable(),active:z.boolean().optional()}).strict();
const handlePartnerUniqueConflict=(error:unknown):never=>{
 if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002')
  throw new ConflictException('Shopify vendor already assigned to another partner');
 throw error;
};
@Controller('partners')export class PartnersController{
 constructor(private db:Db,private audit:Audit){}
 @Get() async list(){const partners=await this.db.partner.findMany({include:{products:true},orderBy:{name:'asc'}});return partners.map(p=>({...p,productsCount:p.products.length,products:undefined}));}
 @Get('profitability')async profitability(){
  const [partners,lines]=await Promise.all([this.db.partner.findMany(),this.db.commerceLine.findMany({where:{partnerIdAtOrder:{not:null}},include:{order:true}})]);
  return partners.map(p=>{
   const entries=lines.filter(l=>l.partnerIdAtOrder===p.id);
   let evaluated=0,flagged=0,contribution=0,baseOwed=0;
   const seen=new Set<string>();
   for(const l of entries){if(l.order.cancelledAt)continue;seen.add(l.orderGid);
    const c=calculateLineContribution(l,l.order);
    if(c===null){flagged++;continue;}evaluated++;contribution+=c;baseOwed+=Number(l.baseCostAtOrder)*l.quantity;
   }
   return {partnerId:p.id,partner:p.name,orders:seen.size,evaluatedLines:evaluated,flaggedLines:flagged,contribution:Math.round(contribution*100)/100,estimatedBaseOwed:Math.round(baseOwed*100)/100,status:flagged>0?'INCOMPLETE':'PARTIAL_VERIFIED'};
  });
 }
 @Roles('ADMIN') @Post()async create(@Body()body:any,@CurrentUser()u:any){const d=parse(input,body);const p=await this.db.partner.create({data:d}).catch(handlePartnerUniqueConflict);await this.audit.log(u.id,'CREATE','PARTNER',p.id);return p;}
 @Roles('ADMIN') @Patch(':id')async update(@Param('id')id:string,@Body()body:any,@CurrentUser()u:any){const d=parse(input.partial(),body);const prev=await this.db.partner.findUnique({where:{id}});if(!prev)throw new NotFoundException();const p=await this.db.partner.update({where:{id},data:d}).catch(handlePartnerUniqueConflict);await this.audit.log(u.id,'UPDATE','PARTNER',p.id);return p;}
 @Roles('ADMIN') @Delete(':id')async disable(@Param('id')id:string,@CurrentUser()u:any){const p=await this.db.partner.findUnique({where:{id}});if(!p)throw new NotFoundException();await this.db.partner.update({where:{id},data:{active:false}});await this.audit.log(u.id,'DISABLE','PARTNER',id);return{ok:true};}
}
