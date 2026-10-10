import {after,NextResponse} from 'next/server';
import {canManageRentia,getRentiaUser} from '../../../../lib/session';
import {mercadoLibreOrigin} from '../../../../lib/mercadolibre';
import {inspectMeliOrder,MeliError} from '../../../../lib/mercadolibre-sync';

export async function POST(request:Request) {
  const user=await getRentiaUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403});
  if(request.headers.get('origin')!==mercadoLibreOrigin()||new URL(request.url).origin!==mercadoLibreOrigin())return NextResponse.json({error:'invalid_origin'},{status:403});
  let body:Record<string,unknown>;try{const value=await request.json();if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();body=value as Record<string,unknown>;}catch{return NextResponse.json({error:'invalid_body'},{status:400});}
  if(typeof body.orderId!=='string'||!/^\d{1,20}$/.test(body.orderId))return NextResponse.json({error:'invalid_order'},{status:400});
  try {const work=inspectMeliOrder(user.id,body.orderId);after(work.then(()=>undefined,()=>undefined));return NextResponse.json(await work,{headers:{'cache-control':'no-store'}});}
  catch(error){const code=error instanceof MeliError?error.code:'mercadolibre_review_failed';return NextResponse.json({error:code},{status:code==='mercadolibre_order_not_found'?404:code==='mercadolibre_import_busy'?409:502});}
}
