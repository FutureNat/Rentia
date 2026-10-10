import { NextResponse } from 'next/server';
import { getExchangeRateSettings, saveExchangeRateSettings } from '../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';
import { defaultRateSettings } from '../../../../lib/exchange-rates';
import { getLiveRates } from '../../../../lib/exchange-rate-provider';

const allowedTypes=new Set(['official','blue','mep','manual']);

export async function GET() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  try {
    const settings=await getExchangeRateSettings(user.id);
    return NextResponse.json({settings:settings||defaultRateSettings,live:await getLiveRates(settings)},{headers:{'cache-control':'private, no-store'}});
  }catch(error){
    console.error('Exchange settings unavailable',error);
    return NextResponse.json({error:'rates_unavailable'},{status:503});
  }
}

export async function PUT(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json().catch(()=>null) as {rateType?:string;baseRate?:number;adjustmentPercent?:number}|null;
  if(!body)return NextResponse.json({error:'invalid_data'},{status:400});
  const rateType=String(body.rateType||'');
  const baseRate=Number(body.baseRate);
  const adjustmentPercent=Number(body.adjustmentPercent||0);
  if (!allowedTypes.has(rateType)||!Number.isFinite(baseRate)||baseRate<0||(rateType==='manual'&&baseRate<=0)||!Number.isFinite(adjustmentPercent)||adjustmentPercent<=-100||adjustmentPercent>500) return NextResponse.json({error:'invalid_data'},{status:400});
  await saveExchangeRateSettings(user.id,{rateType,baseRate,adjustmentPercent});
  return NextResponse.json({ok:true,effectiveRate:baseRate*(1+adjustmentPercent/100)});
}
