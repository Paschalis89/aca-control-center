export type FinancialInputs = {
  year:number; partners:number; orders:number; basePrice:number; markup:number; variablePerOrder:number;
  marketingMonthly:number; designerMonthly:number; toolsMonthly:number; adminMonthly:number;
  advertisingAnnual:number; contractorsAnnual:number; employeesAnnual:number; investmentsAnnual:number; otherRevenueAnnual:number;
};
export function forecast(row:FinancialInputs) {
  const base=Number(row.basePrice), markup=Number(row.markup), orders=Number(row.orders);
  const price=base*(1+markup), gmv=orders*price, acaRevenue=orders*base*markup+Number(row.otherRevenueAnnual||0);
  const variableCosts=orders*Number(row.variablePerOrder);
  const fixedCosts=12*(Number(row.marketingMonthly)+Number(row.designerMonthly)+Number(row.toolsMonthly)+Number(row.adminMonthly)) + Number(row.advertisingAnnual)+Number(row.contractorsAnnual)+Number(row.employeesAnnual);
  const operatingResult=acaRevenue-variableCosts-fixedCosts;
  const cashFlow=operatingResult-Number(row.investmentsAnnual);
  const contributionPerOrder=base*markup-Number(row.variablePerOrder);
  return {price,gmv,acaRevenue,variableCosts,fixedCosts,totalCosts:fixedCosts+variableCosts,operatingResult,cashFlow,contributionPerOrder,breakEvenOrders: contributionPerOrder>0?Math.ceil(Math.max(0,fixedCosts-Number(row.otherRevenueAnnual||0))/contributionPerOrder):null};
}
export function numbers(row:any):FinancialInputs {
  const keys=['basePrice','markup','variablePerOrder','marketingMonthly','designerMonthly','toolsMonthly','adminMonthly','advertisingAnnual','contractorsAnnual','employeesAnnual','investmentsAnnual','otherRevenueAnnual'];
  const copy={...row}; for(const k of keys)copy[k]=Number(row[k]??0);
  return copy as FinancialInputs;
}
