import {after,NextResponse} from 'next/server';
import {enqueueMercadoLibreNotice} from '../../../../db/mercadolibre';
import {mercadoLibreConfigured,mercadoLibreRuntime,parseMercadoLibreNotice,readMercadoLibreWebhookBody} from '../../../../lib/mercadolibre';
import {runMeliBackground} from '../../../../lib/mercadolibre-sync';

export const dynamic='force-dynamic';

export async function GET() {
  return NextResponse.json({service:'Rentia Mercado Libre notifications',status:mercadoLibreConfigured()?'ready_for_authorization':'pending_configuration',importer:'resumable_batches',liveVerification:'pending'},{headers:{'cache-control':'no-store'}});
}

export async function POST(request:Request) {
  if(!mercadoLibreConfigured()) return NextResponse.json({error:'mercadolibre_not_configured'},{status:503});
  let body:unknown;
  try { body=await readMercadoLibreWebhookBody(request); }
  catch(error) { return NextResponse.json({error:'invalid_notification'},{status:error instanceof Error&&error.message==='body_too_large'?413:400}); }
  const notice=parseMercadoLibreNotice(body);
  if(!notice) return NextResponse.json({error:'invalid_notification'},{status:400});
  if(notice.applicationId!==mercadoLibreRuntime().MELI_APP_ID) return NextResponse.json({error:'invalid_application'},{status:401});
  try {
    const userId=await enqueueMercadoLibreNotice(notice);
    // Acknowledge durable receipt before doing upstream work. after() uses the
    // existing Worker's waitUntil; a scheduler/panel can recover interrupted work.
    if(userId)after(()=>runMeliBackground(userId));
    return NextResponse.json({ok:true});
  } catch {
    // Do not acknowledge a delivery that has not been durably recorded.
    return NextResponse.json({error:'notification_storage_unavailable'},{status:503});
  }
}
