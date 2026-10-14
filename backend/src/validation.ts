import {BadRequestException} from '@nestjs/common';
import {z} from 'zod';
export function parse<T extends z.ZodTypeAny>(schema:T,value:unknown):z.infer<T>{
  const r=schema.safeParse(value); if(!r.success)throw new BadRequestException(r.error.flatten()); return r.data;
}
export const money=z.coerce.number().finite().min(0).max(1000000000);
export const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const expenseSchema=z.object({title:z.string().trim().min(2).max(200),category:z.string().trim().min(2).max(80),supplier:z.string().trim().max(200).optional().nullable(),notes:z.string().max(5000).optional().nullable(),netAmount:money,vatRate:z.coerce.number().min(0).max(100),expenseDate:date,dueDate:date.optional().nullable(),paidAt:date.optional().nullable(),status:z.enum(['PLANNED','PENDING','PAID','CANCELLED']).default('PENDING')}).strict();
export const recurringSchema=expenseSchema.pick({title:true,category:true,supplier:true,notes:true,netAmount:true,vatRate:true}).extend({frequency:z.enum(['MONTHLY','YEARLY']),startDate:date,endDate:date.optional().nullable(),active:z.boolean().default(true)}).strict();
export const planYearSchema=z.object({partners:z.coerce.number().int().min(0).max(100000),orders:z.coerce.number().int().min(0).max(100000000),basePrice:money,markup:z.coerce.number().min(0).max(3),variablePerOrder:money,marketingMonthly:money,designerMonthly:money,toolsMonthly:money,adminMonthly:money,advertisingAnnual:money,contractorsAnnual:money,employeesAnnual:money,investmentsAnnual:money,otherRevenueAnnual:money}).strict();
export const planSchema=z.object({name:z.string().trim().min(3).max(120),notes:z.string().max(3000).optional(),startYear:z.number().int().min(2020).max(2100),endYear:z.number().int().min(2020).max(2100)}).strict().refine(p=>p.endYear>=p.startYear&&p.endYear-p.startYear<=9,{message:'Period must be 1–10 years'});
