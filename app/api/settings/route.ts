import { NextResponse } from 'next/server';
import { getAccount, getSettings, saveChannels, saveCosts, savePagoNubePayoutDays, savePagoNubePlanOverride } from '../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../lib/session';

export async function GET() {
  const user = await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  return NextResponse.json({settings:await getSettings(user.id)});
}

export async function POST(request: Request) {
  const user = await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  if (!await getAccount(user.id)) return NextResponse.json({error:'account_required'},{status:409});
  const body = await request.json() as {type?:string;channels?:string[];shipping?:string|number;shippingMode?:string;fees?:string|number;taxes?:string|number;pagoNubePayoutDays?:string|number|null;pagoNubePlan?:string|null};
  if (body.type==='channels') {
    const allowed = ['tiendanube','mercadolibre'];
    if (!Array.isArray(body.channels) || body.channels.some(channel=>!allowed.includes(channel))) return NextResponse.json({error:'invalid_channels'},{status:400});
    await saveChannels(user.id,body.channels);
  } else if (body.type==='costs') {
    const shipping = Number(body.shipping);
    const fees = Number(body.fees);
    const taxes = Number(body.taxes);
    const shippingMode=body.shippingMode==='average_only'?'average_only':'actual';
    const payout=body.pagoNubePayoutDays===null||body.pagoNubePayoutDays===''||body.pagoNubePayoutDays===undefined?null:Number(body.pagoNubePayoutDays);
    const plan=body.pagoNubePlan||null;
    if (![shipping,fees,taxes].every(Number.isFinite) || shipping<0 || fees<0 || fees>100 || taxes<0 || taxes>100 || (payout!==null&&![1,7,14].includes(payout)) || (plan!==null&&!['inicial','esencial','impulso','escala'].includes(plan))) return NextResponse.json({error:'invalid_costs'},{status:400});
    await saveCosts({userId:user.id,shipping:Math.round(shipping),shippingMode,fees,taxes});
    await savePagoNubePayoutDays(user.id,payout);
    await savePagoNubePlanOverride(user.id,plan);
  } else return NextResponse.json({error:'invalid_type'},{status:400});
  return NextResponse.json({ok:true});
}
