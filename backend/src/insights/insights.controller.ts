import {Controller,Get,Post,Body,Query,BadRequestException,ServiceUnavailableException,BadGatewayException,HttpException} from '@nestjs/common';
import {CurrentUser,Roles} from '../auth/auth';
import {Audit} from '../audit/audit.service';
import {parse} from '../validation';
import {z} from 'zod';
import {Db} from '../db.service';
import {forecast,numbers} from '../finance';
@Controller('insights')export class InsightsController{
 private readonly aiCalls=new Map<string,{day:string,count:number}>();
 constructor(private db:Db,private audit:Audit){}
 // Step 4 groundwork: explainable deterministic insights, not an LLM and never fabricated CRM data.
 @Get()async insights(@Query('year')v?:string){const year=v?Number(v):new Date().getUTCFullYear();if(!Number.isInteger(year)||year<2020||year>2100)throw new BadRequestException('Invalid year');
  const ws=await this.db.workspaceSetting.findUnique({where:{id:'main'}});
  const plan=ws?.currentPlanId?await this.db.forecastPlan.findUnique({where:{id:ws.currentPlanId},include:{years:true}}):null;
  const row=plan?.years.find(r=>r.scenario==='CENTRALE'&&r.year===year);
  const insights:{severity:string;title:string;detail:string;source:string}[]=[];
  if(row){const n=forecast(numbers(row));
   if(n.operatingResult<0)insights.push({severity:'warning',title:'Forecast operating loss',detail:`Central forecast for ${year} is ${n.operatingResult.toFixed(0)} EUR before taxes.`,source:'Approved forecast'});
   if(n.contributionPerOrder<=0)insights.push({severity:'critical',title:'Negative unit economics',detail:'Estimated variable cost per order meets or exceeds the ACA markup contribution.',source:'Approved forecast'});
   if(n.breakEvenOrders!==null&&n.breakEvenOrders>row.orders)insights.push({severity:'warning',title:'Forecast below break-even',detail:`Plan assumes ${row.orders} orders; break-even requires about ${n.breakEvenOrders}.`,source:'Approved forecast'});
  }
  const start=new Date(Date.UTC(year,0,1)),end=new Date(Date.UTC(year+1,0,1));
  const [expenses,orders,partnerCosts]=await Promise.all([this.db.expense.count({where:{deletedAt:null,expenseDate:{gte:start,lt:end}}}),this.db.commerceOrder.count({where:{placedAt:{gte:start,lt:end}}}),this.db.partnerProduct.count()]);
  if(expenses===0)insights.push({severity:'info',title:'No expenses entered',detail:`There are no actual expense records for ${year}. Add invoices and recurring costs to compare actuals.`,source:'Expense register'});
  if(orders===0)insights.push({severity:'info',title:'No Shopify sales imported',detail:'Connect the read-only Shopify integration and synchronize orders before interpreting actual revenue.',source:'Commerce mirror'});
  if(orders>0&&partnerCosts===0)insights.push({severity:'warning',title:'Missing partner price agreements',detail:'Orders exist but no variant-level partner base costs have been configured; ACA margins are incomplete.',source:'Commerce mirror'});
  return {year,engine:'DETERMINISTIC_RULES',externalAIEnabled:process.env.FINANCIAL_AI_ENABLED==='true'&&Boolean(process.env.OPENAI_API_KEY),crmSyncEnabled:false,insights,notice:'Deterministic warnings. Optional AI only sees aggregate numerical facts and is disabled unless explicitly configured.'};
 }
 @Roles('ADMIN') @Post('ask')async ask(@Body()body:any,@CurrentUser()u:any){
  const d=parse(z.object({year:z.coerce.number().int().min(2020).max(2100),question:z.string().trim().min(5).max(600)}).strict(),body);
  if(process.env.FINANCIAL_AI_ENABLED!=='true'||!process.env.OPENAI_API_KEY)throw new ServiceUnavailableException('AI assistant is disabled until configured');
  const day=new Date().toISOString().slice(0,10),used=this.aiCalls.get(u.id);
  if(used?.day===day&&used.count>=10)throw new HttpException('Daily AI request limit reached',429);
  const context=await this.insights(String(d.year));
  // Only aggregate, explainable financial facts are transmitted. Never send orders, names, emails or receipts.
  const facts=JSON.stringify({year:context.year,deterministicAlerts:context.insights});
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(25000),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.5',store:false,max_output_tokens:500,instructions:'You are a financial analysis aide for a craft marketplace. Answer ONLY from the provided aggregate facts. Distinguish budgets from actuals, never invent figures, and explicitly mention missing information. Do not give tax or legal certainty. Do not take actions.',input:`FACTS: ${facts}\nQUESTION: ${d.question}`})});
  if(!response.ok)throw new BadGatewayException(`Financial AI HTTP ${response.status}`);
  const result:any=await response.json();
  const answer=(result.output||[]).flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('\n').slice(0,5000);
  if(!answer)throw new BadGatewayException('Financial AI returned no text');
  this.aiCalls.set(u.id,{day,count:(used?.day===day?used.count:0)+1});
  await this.audit.log(u.id,'ASK','FINANCIAL_AI',null,{year:d.year});
  return {answer,year:d.year,model:process.env.OPENAI_MODEL||'gpt-5.5',dataScope:'aggregate deterministic signals only'};
 }

}
