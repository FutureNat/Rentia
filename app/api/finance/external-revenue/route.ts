import { NextResponse } from 'next/server';
import { getExternalRevenue, saveExternalRevenueMonth } from '../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';

function monthRange(month:string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year,monthNumber]=month.split('-').map(Number);
  if (monthNumber<1||monthNumber>12) return null;
  const lastDay=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  return {from:`${month}-01`,to:`${month}-${String(lastDay).padStart(2,'0')}`,lastDay};
}

export async function GET(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const month=new URL(request.url).searchParams.get('month')||new Date().toISOString().slice(0,7);
  const range=monthRange(month);
  if (!range) return NextResponse.json({error:'invalid_month'},{status:400});
  const result=await getExternalRevenue(user.id,range.from,range.to);
  return NextResponse.json({month,days:range.lastDay,entries:result.results});
}

export async function PUT(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json() as {month?:string;entries?:Array<{revenueDate?:string;orderCount?:number;revenue?:number;currency?:string}>};
  const range=monthRange(body.month||'');
  if (!range||!Array.isArray(body.entries)||body.entries.length>31) return NextResponse.json({error:'invalid_data'},{status:400});
  const entries=body.entries.map(entry=>({
    revenueDate:String(entry.revenueDate||''),
    orderCount:Math.trunc(Number(entry.orderCount||0)),
    revenue:Number(entry.revenue||0),
    currency:String(entry.currency||'ARS'),
  }));
  const invalid=entries.some(entry=>!entry.revenueDate.startsWith(`${body.month}-`)||entry.orderCount<0||entry.revenue<0||!Number.isFinite(entry.orderCount)||!Number.isFinite(entry.revenue));
  if (invalid) return NextResponse.json({error:'invalid_entries'},{status:400});
  await saveExternalRevenueMonth(user.id,body.month!,entries);
  return NextResponse.json({ok:true});
}
