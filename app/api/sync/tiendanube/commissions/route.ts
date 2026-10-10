import { NextResponse } from 'next/server';
import { canManageRentia, getRentiaUser } from '../../../../../lib/session';
import { syncPendingTiendanubeCommissions } from '../../../../../lib/tiendanube';

export async function POST(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json().catch(()=>({})) as {checkedBefore?:string};
  const timestamp=body.checkedBefore?Date.parse(body.checkedBefore):NaN;
  if (body.checkedBefore&&(!Number.isFinite(timestamp)||timestamp>Date.now()+5000)) return NextResponse.json({error:'invalid_sync_window'},{status:400});
  const checkedBefore=Number.isFinite(timestamp)?new Date(timestamp).toISOString():undefined;
  try { return NextResponse.json({ok:true,commissions:await syncPendingTiendanubeCommissions(user.id,checkedBefore)}); }
  catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'commission_sync_failed'},{status:502}); }
}
