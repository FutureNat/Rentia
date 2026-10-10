import { NextResponse } from 'next/server';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';
import { reconcileTiendanube } from '../../../../lib/tiendanube';

export async function POST(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json().catch(()=>({})) as {automatic?:boolean};
  try {
    return NextResponse.json({ok:true,...await reconcileTiendanube(user.id,request.url,body.automatic?'panel':'manual')});
  }
  catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'sync_failed'},{status:502}); }
}
