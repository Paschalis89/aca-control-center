import {BadRequestException,Body,Controller,Get,NotFoundException,Param,Post,Put,Query} from '@nestjs/common';
import {Db} from '../db.service';
import {CurrentUser,Roles} from '../auth/auth';
import {planSchema,planYearSchema,parse} from '../validation';
import {Audit} from '../audit/audit.service';
import {forecast,numbers} from '../finance';
@Controller('forecasts')export class ForecastsController {
 constructor(private db:Db,private audit:Audit){}
 @Get('plans') list(){return this.db.forecastPlan.findMany({orderBy:{createdAt:'desc'},select:{id:true,name:true,notes:true,version:true,status:true,startYear:true,endYear:true,createdAt:true,approvedAt:true,parentId:true}});}
 @Get('plans/:id') async detail(@Param('id')id:string){const p=await this.db.forecastPlan.findUnique({where:{id},include:{years:{orderBy:[{year:'asc'},{scenario:'asc'}]}}});if(!p)throw new NotFoundException();return {...p,years:p.years.map(y=>({...y,...forecast(numbers(y))}))};}
 @Post('plans') async create(@Body()body:any,@CurrentUser()u:any){const d=parse(planSchema,body);const p=await this.db.forecastPlan.create({data:{...d,createdById:u.id}});await this.audit.log(u.id,'CREATE','PLAN',p.id);return p;}
 @Post('plans/:id/clone')async clone(@Param('id')id:string,@CurrentUser()u:any){const original=await this.db.forecastPlan.findUnique({where:{id},include:{years:true}});if(!original)throw new NotFoundException();
  const max=await this.db.forecastPlan.aggregate({where:{parentId:original.parentId||original.id},_max:{version:true}});const version=Math.max(original.version,max._max.version||0)+1;
  const newPlan=await this.db.forecastPlan.create({data:{name:original.name,notes:original.notes,version,parentId:original.parentId||original.id,startYear:original.startYear,endYear:original.endYear,createdById:u.id,years:{create:original.years.map(({id,planId,createdAt,updatedAt,...y})=>({scenario:y.scenario,year:y.year,partners:y.partners,orders:y.orders,basePrice:y.basePrice,markup:y.markup,variablePerOrder:y.variablePerOrder,marketingMonthly:y.marketingMonthly,designerMonthly:y.designerMonthly,toolsMonthly:y.toolsMonthly,adminMonthly:y.adminMonthly,advertisingAnnual:y.advertisingAnnual,contractorsAnnual:y.contractorsAnnual,employeesAnnual:y.employeesAnnual,investmentsAnnual:y.investmentsAnnual,otherRevenueAnnual:y.otherRevenueAnnual}))}}});
  await this.audit.log(u.id,'CLONE','PLAN',newPlan.id,{original:id});return newPlan;
 }
 @Roles('ADMIN') @Post('plans/:id/approve')async approve(@Param('id')id:string,@CurrentUser()u:any){const p=await this.db.forecastPlan.findUnique({where:{id},include:{years:true}});if(!p)throw new NotFoundException();if(p.status!=='DRAFT')throw new BadRequestException('Only draft plans can be approved');
  const required=(p.endYear-p.startYear+1)*3;if(p.years.length!==required)throw new BadRequestException(`Complete all ${required} scenario/year rows first`);
  await this.db.$transaction([this.db.forecastPlan.update({where:{id},data:{status:'APPROVED',approvedAt:new Date()}}),this.db.workspaceSetting.upsert({where:{id:'main'},create:{id:'main',currentPlanId:id},update:{currentPlanId:id}})]);
  await this.audit.log(u.id,'APPROVE','PLAN',id);return {ok:true};
 }
 @Put('plans/:id/scenarios/:scenario/years/:year')async upsertYear(@Param('id')id:string,@Param('scenario')scenario:string,@Param('year')rawYear:string,@Body()body:any,@CurrentUser()u:any){
  const p=await this.db.forecastPlan.findUnique({where:{id}});if(!p)throw new NotFoundException();if(p.status!=='DRAFT')throw new BadRequestException('Approved plans are immutable; clone it to create a revision');
  if(!['PRUDENTE','CENTRALE','FAVOREVOLE'].includes(scenario))throw new BadRequestException('Invalid scenario');const year=Number(rawYear);if(!Number.isInteger(year)||year<p.startYear||year>p.endYear)throw new BadRequestException('Invalid year');
  const d=parse(planYearSchema,body);const key={planId_scenario_year:{planId:id,scenario:scenario as any,year}};
  const updated=await this.db.forecastYear.upsert({where:key,create:{...d,planId:id,scenario:scenario as any,year},update:d});await this.audit.log(u.id,'UPSERT_YEAR','FORECAST_YEAR',updated.id,{scenario,year});return {...updated,...forecast({...d,year})};
 }
}
