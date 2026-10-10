import { NextResponse } from 'next/server';
import { saveManualCommission } from '../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';

export async function POST(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  let body:{orderId?:unknown;cost?:unknown};
  try {body=await request.json() as typeof body;} catch {return NextResponse.json({error:'invalid_body'},{status:400});}
  const orderId=String(body.orderId||'');
  const cost=body.cost===null?null:Number(body.cost);
  if (!/^\d{1,20}$/.test(orderId)||cost!==null&&(!Number.isFinite(cost)||cost<0||cost>1000000000)) {
    return NextResponse.json({error:'invalid_commission'},{status:400});
  }
  const saved=await saveManualCommission(user.id,'tiendanube',orderId,cost);
  return saved?NextResponse.json({ok:true}):NextResponse.json({error:'order_not_found'},{status:404});
}
