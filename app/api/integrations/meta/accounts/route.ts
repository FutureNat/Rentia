import { NextResponse } from 'next/server';
import { getMetaAdAccounts, selectMetaAdAccount } from '../../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../../lib/session';
import { syncMetaAds } from '../../../../../lib/meta';

export async function GET() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const accounts=await getMetaAdAccounts(user.id);
  return NextResponse.json({accounts:accounts.results});
}

export async function PUT(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json().catch(()=>({})) as {accountId?:string};
  if (!body.accountId||!await selectMetaAdAccount(user.id,body.accountId)) return NextResponse.json({error:'invalid_account'},{status:400});
  try { return NextResponse.json({ok:true,...await syncMetaAds(user.id)}); }
  catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'sync_failed'},{status:502}); }
}
