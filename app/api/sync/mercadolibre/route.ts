import {after,NextResponse} from 'next/server';
import {canManageRentia,getRentiaUser} from '../../../../lib/session';
import {mercadoLibreConfigured,mercadoLibreOrigin} from '../../../../lib/mercadolibre';
import {getMeliSyncView,reconcileMercadoLibre} from '../../../../lib/mercadolibre-sync';

export const dynamic='force-dynamic';
export async function GET() {
  const user=await getRentiaUser();
  if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  return NextResponse.json(await getMeliSyncView(user.id),{headers:{'cache-control':'no-store'}});
}
export async function POST(request:Request) {
  const user=await getRentiaUser();
  if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403});
  if(!mercadoLibreConfigured())return NextResponse.json({error:'mercadolibre_not_configured'},{status:503});
  if(request.headers.get('origin')!==mercadoLibreOrigin()||new URL(request.url).origin!==mercadoLibreOrigin())return NextResponse.json({error:'invalid_origin'},{status:403});
  try {
    const work=reconcileMercadoLibre(user.id,new URL(request.url).searchParams.get('force')==='1');
    // Register this same bounded promise with Workerd's waitUntil immediately,
    // before awaiting it. Reloading/closing the tab must not cancel a claimed
    // batch and leave its lease behind. This does not start a second import.
    after(work.then(()=>undefined,()=>undefined));
    const result=await work;
    return NextResponse.json(result,{headers:{'cache-control':'no-store'}});
  }catch{return NextResponse.json({error:'mercadolibre_sync_unavailable'},{status:502,headers:{'cache-control':'no-store'}});}
}
