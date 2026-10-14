import {Controller,Get,Query,BadRequestException} from '@nestjs/common';
import {Db} from '../db.service';
import {forecast,numbers} from '../finance';
@Controller('overview')export class OverviewController {
 constructor(private db:Db){}
 @Get()async overview(@Query('year')q:string){const year=q?Number(q):new Date().getFullYear();if(!Number.isInteger(year)||year<2020||year>2100)throw new BadRequestException('Invalid year');
  const ws=await this.db.workspaceSetting.findUnique({where:{id:'main'}});
  const plan=ws?.currentPlanId?await this.db.forecastPlan.findUnique({where:{id:ws.currentPlanId},include:{years:true}}):null;
  const rows=(plan?.years||[]).filter(y=>y.year===year).map(y=>({scenario:y.scenario,...numbers(y),...forecast(numbers(y))}));
  const expenses=await this.db.expense.findMany({where:{deletedAt:null,expenseDate:{gte:new Date(Date.UTC(year,0,1)),lt:new Date(Date.UTC(year+1,0,1))}}});
  const monthly=Array.from({length:12},(_,i)=>({month:i+1,expenses:0,paid:0,projectedRevenue:0,projectedCosts:0}));
  for(const e of expenses){const m=e.expenseDate.getUTCMonth();monthly[m].expenses+=Number(e.grossAmount);if(e.status==='PAID')monthly[m].paid+=Number(e.grossAmount);}
  const base=rows.find(r=>r.scenario==='CENTRALE');if(base)for(const m of monthly){m.projectedRevenue=base.acaRevenue/12;m.projectedCosts=base.totalCosts/12;}
  const recent=await this.db.auditLog.findMany({orderBy:{createdAt:'desc'},take:8,include:{actor:{select:{name:true}}}});
  const sync=await this.db.integrationState.findUnique({where:{key:'shopify'}});
  const commerce=sync?.lastSyncAt?await this.db.commerceOrder.aggregate({where:{placedAt:{gte:new Date(Date.UTC(year,0,1)),lt:new Date(Date.UTC(year+1,0,1))},cancelledAt:null},_count:{_all:true},_sum:{totalPrice:true}}):null;
  const spent=expenses.filter(e=>e.status!=='CANCELLED').reduce((a,e)=>a+Number(e.grossAmount),0),paid=expenses.filter(e=>e.status==='PAID').reduce((a,e)=>a+Number(e.grossAmount),0);
  return {year,plan:plan?{id:plan.id,name:plan.name,version:plan.version,status:plan.status}:null,projected:base??null,scenarios:rows,actual:{expenses:spent,paidExpenses:paid,expenseCount:expenses.length,shopifyConnected:!!sync?.lastSyncAt,actualOrders:commerce?commerce._count._all:null,actualGmv:commerce?Number(commerce._sum.totalPrice||0):null,actualRevenue:null},monthly,activity:recent.map(x=>({id:x.id,action:x.action,entity:x.entity,createdAt:x.createdAt,actor:x.actor?.name||'System'}))};
 }
}
