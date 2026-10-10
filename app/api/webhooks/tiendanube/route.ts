import { NextResponse } from 'next/server';
import { handleTiendanubeWebhook, TiendanubeWebhookPayload, verifyTiendanubeWebhook } from '../../../../lib/tiendanube';

export async function POST(request:Request) {
  const rawBody=await request.text();
  const signature=request.headers.get('x-linkedstore-hmac-sha256');
  if (!await verifyTiendanubeWebhook(rawBody,signature)) return NextResponse.json({error:'invalid_signature'},{status:401});
  let payload:TiendanubeWebhookPayload;
  try { payload=JSON.parse(rawBody) as TiendanubeWebhookPayload; }
  catch { return NextResponse.json({error:'invalid_json'},{status:400}); }
  try {
    const deliveryId=request.headers.get('x-linkedstore-event-id')||request.headers.get('x-tiendanube-event-id')||request.headers.get('x-request-id');
    const result=await handleTiendanubeWebhook(rawBody,payload,deliveryId);
    return NextResponse.json({ok:true,...result});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error?error.message:'webhook_failed'},{status:500});
  }
}
