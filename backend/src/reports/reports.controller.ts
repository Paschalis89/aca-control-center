import {BadRequestException,Controller,Get,Query,Res} from '@nestjs/common';
import {Response} from 'express';
import {Db} from '../db.service';
import {ShopifySync} from '../commerce/shopify.service';
import {forecast,numbers} from '../finance';
const yearOf=(v?:string)=>{const y=v?Number(v):new Date().getUTCFullYear();if(!Number.isInteger(y)||y<2020||y>2100)throw new BadRequestException('Invalid year');return y;};
const escapeCsv=(value:any)=>{const s=String(value===null||value===undefined?'':value);const safe=/^[\s]*[=+@\-\t\r]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"';};
function download(res:Response,name:string,header:string[],rows:any[][]){res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${name}"`);res.send('\ufeff'+[header,...rows].map(row=>row.map(escapeCsv).join(',')).join('\r\n'));}
@Controller('reports')export class ReportsController{
 constructor(private db:Db,private shopify:ShopifySync){}
 @Get('summary')async summary(@Query('year')value?:string){const year=yearOf(value),start=new Date(Date.UTC(year,0,1)),end=new Date(Date.UTC(year+1,0,1));
  const [expenses,orders,workspace,campaigns]=await Promise.all([
    this.db.expense.findMany({where:{deletedAt:null,status:{not:'CANCELLED'},expenseDate:{gte:start,lt:end}}}),
    this.db.commerceOrder.findMany({where:{placedAt:{gte:start,lt:end},cancelledAt:null},include:{lines:true}}),
    this.db.workspaceSetting.findUnique({where:{id:'main'}}),
    this.db.marketingCampaign.findMany({where:{startDate:{gte:start,lt:end}}})]);
  const p=workspace?.currentPlanId?await this.db.forecastPlan.findUnique({where:{id:workspace.currentPlanId},include:{years:true}}):null;
  const model=p?.years.find(y=>y.year===year&&y.scenario==='CENTRALE');
  const planned=model?forecast(numbers(model)):null;
  const recordedExpenses=expenses.reduce((n,e)=>n+Number(e.netAmount),0),paidExpenses=expenses.filter(e=>e.status==='PAID').reduce((n,e)=>n+Number(e.netAmount),0);
  const gmvs=orders.reduce((n,o)=>n+Number(o.totalPrice),0),netSubtotal=orders.reduce((n,o)=>n+Number(o.subtotalPrice),0);
  const marketingSpend=campaigns.reduce((n,c)=>n+Number(c.spend),0);
  return {year,plan:p?{id:p.id,name:p.name,version:p.version}:null,forecast:planned?{revenue:planned.acaRevenue,costs:planned.totalCosts,operatingResult:planned.operatingResult,orders:model!.orders}:null,
  actual:{recordedExpenses,paidExpenses,expenseCount:expenses.length,shopifySynced:!!(await this.db.integrationState.findUnique({where:{key:'shopify'}}))?.lastSyncAt,orders:orders.length,gmv:gmvs,shopifySubtotal:netSubtotal,marketingSpend},
  notes:['Expenses use net amounts and are recorded by date, not full accrual accounting.','Campaign spend may already be registered as an Expense; it is NOT added a second time.','Shopify subtotal is not ACA revenue and cannot be used to calculate net profit without partner base costs, taxes and fees.','Forecast values are separate from the actuals.']};
 }
 @Get('expenses.csv')async expensesCsv(@Res()res:Response,@Query('year')v?:string){const year=yearOf(v);const records=await this.db.expense.findMany({where:{deletedAt:null,expenseDate:{gte:new Date(Date.UTC(year,0,1)),lt:new Date(Date.UTC(year+1,0,1))}},orderBy:{expenseDate:'asc'}});
  download(res,`aca-expenses-${year}.csv`,['Date','Title','Category','Supplier','Net EUR','VAT EUR','Gross EUR','Status'],records.map(e=>[e.expenseDate.toISOString().slice(0,10),e.title,e.category,e.supplier,Number(e.netAmount),Number(e.vatAmount),Number(e.grossAmount),e.status]));}
 @Get('orders.csv')async ordersCsv(@Res()res:Response,@Query('year')v?:string){const year=yearOf(v);const records=await this.db.commerceOrder.findMany({where:{placedAt:{gte:new Date(Date.UTC(year,0,1)),lt:new Date(Date.UTC(year+1,0,1))}},orderBy:{placedAt:'asc'}});
  download(res,`aca-shopify-orders-${year}.csv`,['Placed','Order','Currency','Payment Status','Cancelled','Total','Current Subtotal','Refunded'],records.map(o=>[o.placedAt.toISOString().slice(0,10),o.name,o.currency,o.paymentStatus,o.cancelledAt?'yes':'no',Number(o.totalPrice),Number(o.subtotalPrice),Number(o.totalRefunded)]));}
 @Get('campaigns.csv')async campaignsCsv(@Res()res:Response,@Query('year')v?:string){const year=yearOf(v);const records=await this.db.marketingCampaign.findMany({where:{startDate:{gte:new Date(Date.UTC(year,0,1)),lt:new Date(Date.UTC(year+1,0,1))}},orderBy:{startDate:'asc'}});
  download(res,`aca-campaigns-${year}.csv`,['Name','Channel','Start','Spend','Attributed Orders','Attributed Revenue'],records.map(c=>[c.name,c.channel,c.startDate.toISOString().slice(0,10),Number(c.spend),c.attributedOrders,Number(c.attributedRevenue)]));}
}
