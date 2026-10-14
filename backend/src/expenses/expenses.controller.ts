import {Controller,Get,Post,Patch,Delete,Param,Query,Body,NotFoundException,BadRequestException,UseInterceptors,UploadedFile,Res} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {diskStorage} from 'multer';
import {randomUUID} from 'crypto';
import {extname,resolve} from 'path';
import {existsSync,mkdirSync} from 'fs';
import {Response} from 'express';
import {Db} from '../db.service';
import {Audit} from '../audit/audit.service';
import {CurrentUser} from '../auth/auth';
import {expenseSchema,recurringSchema,parse} from '../validation';
import {z} from 'zod';
const when=(s?:string|null)=>s?new Date(s+'T12:00:00Z'):null;
const calc=(base:number,rate:number)=>({netAmount:base,vatRate:rate,vatAmount:Math.round(base*rate)/100,grossAmount:Math.round(base*(1+rate/100)*100)/100});
const dir=resolve(process.env.UPLOAD_DIR||'/app/uploads');
const safeFile=(file:{mimetype:string}):boolean=>['application/pdf','image/png','image/jpeg'].includes(file.mimetype);
@Controller('expenses')export class ExpensesController {
 constructor(private db:Db,private audit:Audit){}
 @Get() async list(@Query() q:any){const year=q.year===undefined?undefined:Number(q.year);const month=q.month===undefined?undefined:Number(q.month);
  if(year!==undefined&&(!Number.isInteger(year)||year<2020||year>2100))throw new BadRequestException('Invalid year');
  if(month!==undefined&&(!Number.isInteger(month)||month<1||month>12))throw new BadRequestException('Invalid month');
  const start=year?new Date(Date.UTC(year,(month||1)-1,1)):undefined,end=year?new Date(Date.UTC(year,month||12,1)):undefined;
  const where:any={deletedAt:null}; if(year)where.expenseDate={gte:start,lt:end};if(q.status)where.status=q.status;if(q.category)where.category=q.category;
  if(q.search)where.OR=[{title:{contains:String(q.search),mode:'insensitive'}},{supplier:{contains:String(q.search),mode:'insensitive'}}];
  return this.db.expense.findMany({where,orderBy:{expenseDate:'desc'},take:500});
 }
 @Post() async create(@Body() body:any,@CurrentUser()u:any){const d=parse(expenseSchema,body), amounts=calc(d.netAmount,d.vatRate);
  const item=await this.db.expense.create({data:{...d,...amounts,supplier:d.supplier||null,notes:d.notes||null,expenseDate:when(d.expenseDate)!,dueDate:when(d.dueDate),paidAt:d.status==='PAID'?(when(d.paidAt)||new Date()):null,createdById:u.id}});
  await this.audit.log(u.id,'CREATE','EXPENSE',item.id,{title:item.title,netAmount:d.netAmount});return item;
 }
 @Patch(':id') async update(@Param('id')id:string,@Body()body:any,@CurrentUser()u:any){const d=parse(expenseSchema.partial(),body);const existing=await this.db.expense.findFirst({where:{id,deletedAt:null}});if(!existing)throw new NotFoundException();
  const base=d.netAmount??Number(existing.netAmount),rate=d.vatRate??Number(existing.vatRate);
  const item=await this.db.expense.update({where:{id},data:{...d,...calc(base,rate),expenseDate:d.expenseDate?when(d.expenseDate)!:undefined,dueDate:d.dueDate===null?null:d.dueDate?when(d.dueDate):undefined,paidAt:d.paidAt===null?null:d.paidAt?when(d.paidAt):d.status==='PAID'&&!existing.paidAt?new Date():undefined}});
  await this.audit.log(u.id,'UPDATE','EXPENSE',id,{fields:Object.keys(d)});return item;
 }
 @Delete(':id')async remove(@Param('id')id:string,@CurrentUser()u:any){const existing=await this.db.expense.findFirst({where:{id,deletedAt:null}});if(!existing)throw new NotFoundException();await this.db.expense.update({where:{id},data:{deletedAt:new Date()}});await this.audit.log(u.id,'DELETE','EXPENSE',id);return {ok:true};}
 @Post(':id/receipt')@UseInterceptors(FileInterceptor('file',{storage:diskStorage({destination:(_req,_file,cb)=>{mkdirSync(dir,{recursive:true});cb(null,dir);},filename:(_req,file,cb)=>cb(null,randomUUID()+extname(file.originalname).toLowerCase())}),limits:{fileSize:8*1024*1024},fileFilter:(_req,file,cb)=>cb(null,safeFile(file))}))
 async receipt(@Param('id')id:string,@UploadedFile()file:Express.Multer.File,@CurrentUser()u:any){if(!file)throw new BadRequestException('Only PDF, JPG, PNG files up to 8 MB');const exp=await this.db.expense.findFirst({where:{id,deletedAt:null}});if(!exp)throw new NotFoundException();const item=await this.db.expense.update({where:{id},data:{receiptName:file.originalname.slice(0,255),receiptPath:file.filename,receiptMime:file.mimetype}});await this.audit.log(u.id,'UPLOAD_RECEIPT','EXPENSE',id);return {id:item.id,receiptName:item.receiptName};}
 @Get(':id/receipt')async download(@Param('id')id:string,@Res()res:Response){const e=await this.db.expense.findFirst({where:{id,deletedAt:null}});if(!e?.receiptPath)throw new NotFoundException();const file=resolve(dir,e.receiptPath);if(!file.startsWith(dir+'/')||!existsSync(file))throw new NotFoundException();res.type(e.receiptMime||'application/octet-stream');return res.download(file,e.receiptName||'receipt');}
}
@Controller('recurring')export class RecurringController {
 constructor(private db:Db,private audit:Audit){}
 @Get()list(){return this.db.recurringExpense.findMany({orderBy:{createdAt:'desc'}});}
 @Post()async create(@Body()body:any,@CurrentUser()u:any){const d=parse(recurringSchema,body);if(d.endDate&&d.endDate<d.startDate)throw new BadRequestException('End before start');const e=await this.db.recurringExpense.create({data:{...d,supplier:d.supplier||null,notes:d.notes||null,startDate:when(d.startDate)!,endDate:when(d.endDate),createdById:u.id}});await this.audit.log(u.id,'CREATE','RECURRING',e.id);return e;}
 @Patch(':id')async update(@Param('id')id:string,@Body()body:any,@CurrentUser()u:any){const d=parse(recurringSchema.partial(),body),item=await this.db.recurringExpense.findUnique({where:{id}});if(!item)throw new NotFoundException();const e=await this.db.recurringExpense.update({where:{id},data:{...d,startDate:d.startDate?when(d.startDate)!:undefined,endDate:d.endDate===null?null:d.endDate?when(d.endDate):undefined}});await this.audit.log(u.id,'UPDATE','RECURRING',id);return e;}
 @Delete(':id')async remove(@Param('id')id:string,@CurrentUser()u:any){const e=await this.db.recurringExpense.findUnique({where:{id}});if(!e)throw new NotFoundException();await this.db.recurringExpense.update({where:{id},data:{active:false}});await this.audit.log(u.id,'DISABLE','RECURRING',id);return {ok:true};}
}
