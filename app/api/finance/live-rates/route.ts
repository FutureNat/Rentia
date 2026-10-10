import { NextResponse } from 'next/server';
import { getExchangeRateSettings } from '../../../../db/database';
import { getRentiaUser } from '../../../../lib/session';
import { getLiveRates } from '../../../../lib/exchange-rate-provider';

export async function GET() {
  const user=await getRentiaUser();
  if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  try {
    return NextResponse.json(await getLiveRates(await getExchangeRateSettings(user.id)),{headers:{'cache-control':'private, no-store'}});
  }catch(error){
    console.error('Live rates failed',error);
    return NextResponse.json({error:'rates_unavailable'},{status:503});
  }
}
