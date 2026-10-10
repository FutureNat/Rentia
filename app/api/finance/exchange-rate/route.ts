import { z } from 'zod';
import { getExchangeRateSettings, saveExchangeRateSettings } from '../../../../db/database';
import { route } from '../../../../server/http/route';
import { field } from '../../../../server/http/fields';
import { defaultRateSettings } from '../../../../lib/exchange-rates';
import { getLiveRates } from '../../../../lib/exchange-rate-provider';

const RateBody=z.object({
  rateType:z.enum(['official','blue','mep','manual']),
  baseRate:z.coerce.number().min(0),
  adjustmentPercent:field(value=>Number(value||0)).pipe(z.number().gt(-100).max(500)),
}).refine(body=>body.rateType!=='manual'||body.baseRate>0,{path:['baseRate']});

export const GET=route({},async({user})=>{
  try {
    const settings=await getExchangeRateSettings(user.id);
    return Response.json({settings:settings||defaultRateSettings,live:await getLiveRates(settings)},{headers:{'cache-control':'private, no-store'}});
  }catch(error){
    console.error('Exchange settings unavailable',error);
    return Response.json({error:'rates_unavailable'},{status:503});
  }
});

export const PUT=route({access:'manager',body:RateBody,invalidBody:'invalid_data'},async({user,body})=>{
  const {rateType,baseRate,adjustmentPercent}=body;
  await saveExchangeRateSettings(user.id,{rateType,baseRate,adjustmentPercent});
  return {ok:true,effectiveRate:baseRate*(1+adjustmentPercent/100)};
});
