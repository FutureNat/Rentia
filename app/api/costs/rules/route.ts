import { NextResponse } from 'next/server';
import { createCostRule, deleteCostRule, getCostRules } from '../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';

export async function GET() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const rules=await getCostRules(user.id);
  return NextResponse.json({rules:rules.results});
}

export async function POST(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json() as {category?:string;name?:string;matchValue?:string|null;calculation?:string;amount?:number|string;percentage?:number|string;startsAt?:string|null;endsAt?:string|null};
  const category=body.category;
  const name=String(body.name||'').trim().slice(0,80);
  const amount=Number(body.amount||0);
  const percentage=Number(body.percentage||0);
  const startsAt=body.startsAt?String(body.startsAt):null;
  const endsAt=body.endsAt?String(body.endsAt):null;
  if (!name||!Number.isFinite(amount)||amount<0||!Number.isFinite(percentage)||percentage<0||percentage>100) return NextResponse.json({error:'invalid_rule'},{status:400});
  if (startsAt&&endsAt&&startsAt>endsAt) return NextResponse.json({error:'invalid_dates'},{status:400});
  if (category==='commission') {
    const matchValue=String(body.matchValue||'').trim().slice(0,80);
    if (!matchValue||(amount===0&&percentage===0)) return NextResponse.json({error:'invalid_commission'},{status:400});
    await createCostRule(user.id,{category:'commission',name,matchValue,calculation:'hybrid',amount,percentage,startsAt:null,endsAt:null});
  } else if (category==='additional') {
    const calculation=body.calculation==='percentage_revenue'?'percentage_revenue':'fixed_monthly';
    if ((calculation==='fixed_monthly'&&amount===0)||(calculation==='percentage_revenue'&&percentage===0)) return NextResponse.json({error:'invalid_additional'},{status:400});
    await createCostRule(user.id,{category:'additional',name,matchValue:null,calculation,amount:calculation==='fixed_monthly'?amount:0,percentage:calculation==='percentage_revenue'?percentage:0,startsAt,endsAt});
  } else return NextResponse.json({error:'invalid_category'},{status:400});
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json() as {id?:number};
  const id=Number(body.id);
  if (!Number.isInteger(id)||id<=0) return NextResponse.json({error:'invalid_id'},{status:400});
  await deleteCostRule(user.id,id);
  return NextResponse.json({ok:true});
}
