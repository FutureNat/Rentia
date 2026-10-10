import {NextResponse} from 'next/server';
import {saveOrderItemCost} from '../../../../db/database';
import {canManageRentia,getRentiaUser} from '../../../../lib/session';
import {mercadoLibreOrigin} from '../../../../lib/mercadolibre';

export async function POST(request:Request) {
  const user=await getRentiaUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403});
  if(request.headers.get('origin')!==mercadoLibreOrigin()||new URL(request.url).origin!==mercadoLibreOrigin())return NextResponse.json({error:'invalid_origin'},{status:403});
  let body:Record<string,unknown>;try{const value=await request.json();if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();body=value as Record<string,unknown>;}catch{return NextResponse.json({error:'invalid_body'},{status:400});}
  const {provider,orderId,lineId,cost}=body;
  if(typeof provider!=='string'||!['mercadolibre','tiendanube'].includes(provider)||typeof orderId!=='string'||!/^\d{1,20}$/.test(orderId)||typeof lineId!=='string'||lineId.length>200||!lineId||cost!==null&&(typeof cost!=='number'||!Number.isFinite(cost)||cost<0||cost>1e9))return NextResponse.json({error:'invalid_cost'},{status:400});
  const saved=await saveOrderItemCost(user.id,provider,orderId,lineId,cost);
  return NextResponse.json(saved?{ok:true}:{error:'order_not_found'},{status:saved?200:404});
}
