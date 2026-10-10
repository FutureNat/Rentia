import { NextResponse } from 'next/server';
import { getExchangeRateSettings } from '../../../../db/database';
import { route } from '../../../../server/http/route';
import { getLiveRates } from '../../../../lib/exchange-rate-provider';

export const GET=route({},async({user})=>{
  try {
    return NextResponse.json(await getLiveRates(await getExchangeRateSettings(user.id)),{headers:{'cache-control':'private, no-store'}});
  }catch(error){
    console.error('Live rates failed',error);
    return NextResponse.json({error:'rates_unavailable'},{status:503});
  }
});
