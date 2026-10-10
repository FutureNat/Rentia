import { NextResponse } from 'next/server';
import { getProductCostRows, saveManualProductCosts } from '../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';

export async function GET() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const rows=await getProductCostRows(user.id);
  return NextResponse.json({products:rows.results});
}

export async function PUT(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json() as {updates?:Array<{variantId?:number;manualCost?:number|null}>};
  if (!Array.isArray(body.updates)||body.updates.length>1000) return NextResponse.json({error:'invalid_updates'},{status:400});
  const updates=body.updates.map(update=>({variantId:Number(update.variantId),manualCost:update.manualCost===null?null:Number(update.manualCost)}));
  if (updates.some(update=>!Number.isInteger(update.variantId)||update.variantId<=0||(update.manualCost!==null&&(!Number.isFinite(update.manualCost)||update.manualCost<0)))) return NextResponse.json({error:'invalid_cost'},{status:400});
  await saveManualProductCosts(user.id,updates);
  return NextResponse.json({ok:true,updated:updates.length});
}
