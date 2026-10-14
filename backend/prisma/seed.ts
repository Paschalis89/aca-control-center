import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';
const db = new PrismaClient();
async function main(){
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if(!email||!password||password.length<12)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) in .env before seeding.');
  let admin=await db.user.findUnique({where:{email}});
  if(!admin){admin=await db.user.create({data:{email,name:process.env.ADMIN_NAME||'ACA Administrator',passwordHash:await hash(password,12),role:'ADMIN'}});console.log('Administrator created:',email);}
  let plan=await db.forecastPlan.findFirst({where:{name:'ACA Baseline 2027-2030',version:1}});
  if(!plan){
    const rows=JSON.parse(readFileSync(join(__dirname,'forecast-input.json'),'utf8'));
    plan=await db.forecastPlan.create({data:{name:'ACA Baseline 2027-2030',notes:'Imported from ACA_Forecast_Costi_Reali_2027_2030.xlsx. Planning assumptions, not actual transactions. PRUDENTE/FAVOREVOLE monthly core costs are split evenly into 4 editable categories until confirmed.',version:1,status:'APPROVED',startYear:2027,endYear:2030,approvedAt:new Date(),createdById:admin.id,years:{create:rows.map((r:any)=>r)}}});
    await db.forecastPlan.create({data:{name:'ACA Working Forecast 2027-2030',notes:'Editable working copy of approved source baseline',version:2,parentId:plan.id,status:'DRAFT',startYear:2027,endYear:2030,createdById:admin.id,years:{create:rows.map((r:any)=>r)}}});
    console.log('Seeded 12 scenario rows and editable draft.');
  }
  await db.workspaceSetting.upsert({where:{id:'main'},create:{id:'main',currentPlanId:plan.id},update:{}});
  console.log('Seed complete. Actual expenses are intentionally empty.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>db.$disconnect());
