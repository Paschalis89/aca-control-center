import {Injectable,OnModuleInit} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {Db} from '../db.service';
@Injectable()export class RecurrencesService implements OnModuleInit {
 constructor(private db:Db){}
 async onModuleInit(){await this.generate();}
 @Cron('0 5 1 * *') async generate(){
  const now=new Date(), templates=await this.db.recurringExpense.findMany({where:{active:true}});
  for(const t of templates){
   let year=t.startDate.getUTCFullYear(),month=t.startDate.getUTCMonth();
   const lastYear=now.getUTCFullYear(),lastMonth=now.getUTCMonth(); let loops=0;
   while((year<lastYear||(year===lastYear&&month<=lastMonth))&&loops++<120){
    const dt=new Date(Date.UTC(year,month,Math.min(t.startDate.getUTCDate(),28),12));
    if((!t.endDate||dt<=t.endDate)&&dt<=now){
     const key=`${year}-${String(month+1).padStart(2,'0')}`;
     const amount=Number(t.netAmount), rate=Number(t.vatRate),vat=Math.round(amount*rate)/100;
     await this.db.expense.upsert({where:{recurringId_occurrenceKey:{recurringId:t.id,occurrenceKey:key}},create:{title:t.title,category:t.category,supplier:t.supplier,notes:t.notes,netAmount:amount,vatRate:rate,vatAmount:vat,grossAmount:Math.round((amount+vat)*100)/100,expenseDate:dt,dueDate:dt,status:'PENDING',currency:t.currency,createdById:t.createdById,recurringId:t.id,occurrenceKey:key},update:{}});
    }
    if(t.frequency==='YEARLY')year++; else {month++;if(month>=12){month=0;year++;}}
   }
  }
 }
}
