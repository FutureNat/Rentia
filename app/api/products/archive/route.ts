import {NextResponse} from 'next/server';
import {setProductArchived} from '../../../../db/database';
import {canManageRentia,getRentiaUser} from '../../../../lib/session';

export async function PATCH(request:Request) {
  const user=await getRentiaUser();
  if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403});
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'invalid_origin'},{status:403});
  const body=await request.json().catch(()=>null) as {productId?:unknown;archived?:unknown;confirmation?:unknown}|null;
  if(!body||typeof body.productId!=='number'||!Number.isSafeInteger(body.productId)||body.productId<=0||typeof body.archived!=='boolean'||body.confirmation!==(body.archived?'ARCHIVAR':'RESTAURAR'))return NextResponse.json({error:'invalid_confirmation'},{status:400});
  try {
    const found=await setProductArchived(user.id,body.productId,body.archived);
    if(!found)return NextResponse.json({error:'not_found'},{status:404});
    return NextResponse.json({ok:true,productId:body.productId,archived:body.archived});
  }catch{return NextResponse.json({error:'unavailable'},{status:503});}
}
