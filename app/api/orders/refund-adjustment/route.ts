import {NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {canManageRentia,getRentiaUser} from '../../../../lib/session';
import {mercadoLibreOrigin} from '../../../../lib/mercadolibre';
import {readRefundAdjustment} from '../../../../lib/refund-adjustment';

export async function POST(request:Request) {
  const user=await getRentiaUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403});
  if(request.headers.get('origin')!==mercadoLibreOrigin()||new URL(request.url).origin!==mercadoLibreOrigin())return NextResponse.json({error:'invalid_origin'},{status:403});
  let body:Record<string,unknown>;try{body=await request.json();}catch{return NextResponse.json({error:'invalid_body'},{status:400});}
  if(!body||typeof body.orderId!=='string'||!/^\d{1,20}$/.test(body.orderId)||body.confirm!==true)return NextResponse.json({error:'confirmation_required'},{status:400});
  const adjustment=body.adjustment===null?null:readRefundAdjustment({...body.adjustment as object,confirmedAt:new Date().toISOString(),confirmedBy:user.clerkUserId||user.id});
  if(body.adjustment!==null&&!adjustment)return NextResponse.json({error:'invalid_adjustment'},{status:400});
  const db=(env as unknown as {DB:D1Database}).DB;
  const result=await db.prepare("UPDATE orders SET meli_refund_adjustment_json=? WHERE user_id=? AND provider='mercadolibre' AND external_order_id=? AND payment_status IN ('refunded','charged_back')")
    .bind(adjustment?JSON.stringify(adjustment):null,user.id,body.orderId).run();
  if(!Number(result.meta.changes))return NextResponse.json({error:'full_refund_required'},{status:409});
  return NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}});
}
