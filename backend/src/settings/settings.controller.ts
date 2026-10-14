import {BadRequestException,Body,Controller,Get,Put,Query} from '@nestjs/common';
import {Db} from '../db.service';
import {Audit} from '../audit/audit.service';
import {CurrentUser,Roles} from '../auth/auth';
import {parse} from '../validation';
import {z} from 'zod';
@Controller('settings')export class SettingsController{
 constructor(private db:Db,private audit:Audit){}
 @Get()async get(){return this.db.workspaceSetting.upsert({where:{id:'main'},create:{id:'main'},update:{}});}
 @Roles('ADMIN') @Put()async update(@Body()body:any,@CurrentUser()u:any){const d=parse(z.object({companyName:z.string().min(3).max(140),currency:z.enum(['EUR','USD','GBP']),fiscalYearStartMonth:z.number().int().min(1).max(12)}).partial().strict(),body);const s=await this.db.workspaceSetting.upsert({where:{id:'main'},create:{id:'main',...d},update:d});await this.audit.log(u.id,'UPDATE','SETTINGS','main');return s;}
}
@Controller('activity')export class ActivityController{
 constructor(private db:Db){}
 @Get()list(@Query('take')take?:string){return this.db.auditLog.findMany({orderBy:{createdAt:'desc'},take:Math.min(Math.max(Number(take)||50,1),200),include:{actor:{select:{name:true,email:true}}}});}
}
