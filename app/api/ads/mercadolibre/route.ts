import {NextResponse} from 'next/server';
import {getRentiaUser,canManageRentia} from '../../../../lib/session';
import {mercadoLibreOrigin} from '../../../../lib/mercadolibre';
import {analyticsRangeFromUrl} from '../../../../lib/analytics-range';
import {getMeliAds,selectMeliAds,syncMeliAds} from '../../../../lib/meli-ads';
export async function GET(request:Request){const user=await getRentiaUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});const {days,range}=analyticsRangeFromUrl(new URL(request.url));return NextResponse.json(await getMeliAds(user.id,days,0,range),{headers:{'cache-control':'no-store'}});}
export async function POST(request:Request){
  const user=await getRentiaUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403});if(request.headers.get('origin')!==mercadoLibreOrigin()||new URL(request.url).origin!==mercadoLibreOrigin())return NextResponse.json({error:'invalid_origin'},{status:403});
  let body:Record<string,unknown>;try{body=await request.json();if(!body||Array.isArray(body)||typeof body!=='object')throw new Error();}catch{return NextResponse.json({error:'invalid_body'},{status:400});}
  if(body.advertiserId!==undefined){if(typeof body.advertiserId!=='string'||!/^\d{1,20}$/.test(body.advertiserId))return NextResponse.json({error:'invalid_account'},{status:400});try{await selectMeliAds(user.id,body.advertiserId);}catch{return NextResponse.json({error:'account_not_available'},{status:409});}}
  return NextResponse.json(await syncMeliAds(user.id,body.force===true),{headers:{'cache-control':'no-store'}});
}
