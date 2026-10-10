import { NextResponse } from 'next/server';
import { getRentiaUser } from '../../../../lib/session';
import { fetchRateJson } from '../../../../lib/exchange-rate-provider';
import { normalizeHistory, rateHouses, type QuotePoint } from '../../../../lib/exchange-rates';

const historyCache=new Map<string,{points:QuotePoint[];fetchedAt:number}>();
const pending=new Map<string,Promise<QuotePoint[]>>();
export async function GET(request:Request) {
  const user=await getRentiaUser();if(!user)return NextResponse.json({error:'unauthorized'},{status:401});
  const type=new URL(request.url).searchParams.get('type')||'official';
  if(!Object.hasOwn(rateHouses,type))return NextResponse.json({error:'invalid_reference'},{status:400});
  const house=rateHouses[type as keyof typeof rateHouses];
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
  try {
    let cached=historyCache.get(type);
    if(!cached||Date.now()-cached.fetchedAt>1800000) {
      if(!pending.has(type))pending.set(type,fetchRateJson(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${house}`).then(raw=>{
        const points=normalizeHistory(raw,house,today);if(!points.length)throw new Error('Empty quote history');
        historyCache.set(type,{points,fetchedAt:Date.now()});return points;
      }).finally(()=>pending.delete(type)));
      await pending.get(type);cached=historyCache.get(type);
    }
    return NextResponse.json({history:cached?.points||[],source:'ArgentinaDatos · DolarApi',reference:type,updatedAt:cached?.points.at(-1)?.date||null,fetchedAt:new Date(cached?.fetchedAt||Date.now()).toISOString(),status:'available'},{headers:{'cache-control':'private, max-age=300'}});
  }catch(error){
    console.warn('Exchange history unavailable',error instanceof Error?error.message:'unknown');
    const cached=historyCache.get(type);
    if(cached)return NextResponse.json({history:cached.points,source:'ArgentinaDatos · DolarApi',reference:type,updatedAt:cached.points.at(-1)?.date||null,fetchedAt:new Date(cached.fetchedAt).toISOString(),status:'cached'},{headers:{'cache-control':'private, no-store'}});
    return NextResponse.json({error:'history_unavailable',history:[]},{status:503});
  }
}
