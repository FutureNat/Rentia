import { NextResponse } from 'next/server';
import { canManageRentia, getRentiaUser } from '../../../../../lib/session';
import { diagnoseTiendanubeCommission } from '../../../../../lib/tiendanube';

export async function POST(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  let orderId='';
  try { orderId=String((await request.json() as {orderId?:unknown}).orderId||''); }
  catch { return NextResponse.json({error:'invalid_request'},{status:400}); }
  if (!/^\d{1,20}$/.test(orderId)) return NextResponse.json({error:'invalid_order'},{status:400});
  try { return NextResponse.json(await diagnoseTiendanubeCommission(user.id,orderId)); }
  catch { return NextResponse.json({error:'diagnostic_failed'},{status:502}); }
}
