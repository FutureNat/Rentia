import { NextResponse } from 'next/server';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';
import { syncMetaAds } from '../../../../lib/meta';

export async function POST() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  try { return NextResponse.json({ok:true,...await syncMetaAds(user.id)}); }
  catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'sync_failed'},{status:502}); }
}
