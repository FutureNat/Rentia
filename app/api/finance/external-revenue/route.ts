import { z } from 'zod';
import { getExternalRevenue, saveExternalRevenueMonth } from '../../../../db/database';
import { HttpError, route } from '../../../../server/http/route';
import { field } from '../../../../server/http/fields';

function monthRange(month:string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year,monthNumber]=month.split('-').map(Number);
  if (monthNumber<1||monthNumber>12) return null;
  const lastDay=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  return {from:`${month}-01`,to:`${month}-${String(lastDay).padStart(2,'0')}`,lastDay};
}

const RevenueEntry=z.object({
  revenueDate:field(value=>String(value||'')),
  orderCount:field(value=>Math.trunc(Number(value||0))).pipe(z.number().min(0)),
  revenue:field(value=>Number(value||0)).pipe(z.number().min(0)),
  currency:field(value=>String(value||'ARS')),
});

const RevenueBody=z.object({month:z.string(),entries:z.array(z.unknown()).max(31)});

export const GET=route({},async({user,url})=>{
  const month=url.searchParams.get('month')||new Date().toISOString().slice(0,7);
  const range=monthRange(month);
  if (!range) throw new HttpError(400,'invalid_month');
  const result=await getExternalRevenue(user.id,range.from,range.to);
  return {month,days:range.lastDay,entries:result.results};
});

export const PUT=route({access:'manager',body:RevenueBody,invalidBody:'invalid_data'},async({user,body})=>{
  if (!monthRange(body.month)) throw new HttpError(400,'invalid_data');
  const parsed=z.array(RevenueEntry).safeParse(body.entries);
  if (!parsed.success||parsed.data.some(entry=>!entry.revenueDate.startsWith(`${body.month}-`))) throw new HttpError(400,'invalid_entries');
  await saveExternalRevenueMonth(user.id,body.month,parsed.data);
  return {ok:true};
});
