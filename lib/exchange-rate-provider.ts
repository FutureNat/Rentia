import { adjustedRate, asRateType, defaultRateSettings, parseMarketQuotes, rateLabels, type LiveRates, type RateSettings } from './exchange-rates';

let quoteCache:{quotes:LiveRates['quotes'];fetchedAt:number}|null=null;
let pendingQuotes:Promise<LiveRates['quotes']>|null=null;
export async function fetchRateJson(url:string):Promise<unknown> {
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Quote provider returned ${response.status}`);
  return response.json();
}
async function marketQuotes() {
  if(quoteCache&&Date.now()-quoteCache.fetchedAt<300000)return {quotes:quoteCache.quotes,cached:false,fetchedAt:quoteCache.fetchedAt};
  try {
    pendingQuotes??=fetchRateJson('https://dolarapi.com/v1/dolares').then(parseMarketQuotes).then(quotes=>{quoteCache={quotes,fetchedAt:Date.now()};return quotes;}).finally(()=>{pendingQuotes=null;});
    const quotes=await pendingQuotes;
    return {quotes,cached:false,fetchedAt:quoteCache?.fetchedAt||Date.now()};
  }catch(error){
    console.warn('Exchange quote unavailable',error instanceof Error?error.message:'unknown');
    return {quotes:quoteCache?.quotes||{},cached:true,fetchedAt:quoteCache?.fetchedAt||Date.now()};
  }
}
export async function getLiveRates(settings:RateSettings|null):Promise<LiveRates> {
  const saved=settings||defaultRateSettings;
  const rateType=asRateType(saved.rate_type);
  const adjustmentPercent=Number(saved.adjustment_percent)||0;
  const [market,euro]=await Promise.all([
    marketQuotes(),fetchRateJson('https://dolarapi.com/v1/cotizaciones/eur').catch(()=>null),
  ]);
  const quote=market.quotes[rateType];
  const fallback=Number(saved.base_rate)>0?Number(saved.base_rate):null;
  const baseRate=rateType==='manual'?fallback:quote?.sell||fallback;
  const effectiveRate=adjustedRate(baseRate,adjustmentPercent);
  const status:LiveRates['status']=!effectiveRate?'unavailable':rateType==='manual'?'manual':quote?(market.cached?'cached':'live'):'fallback';
  const source=status==='manual'?'Cotización manual':status==='fallback'?'Precio de respaldo guardado':status==='unavailable'?'Cotización no disponible':`DolarApi · ${rateLabels[rateType]} · venta`;
  const eur=typeof euro==='object'&&euro!==null&&'venta' in euro?Number(euro.venta):0;
  return {
    rates:{ARS:1,...(effectiveRate?{USD:effectiveRate}:{}),...(Number.isFinite(eur)&&eur>0?{EUR:eur}:{})},
    quotes:market.quotes,baseRate,effectiveRate,rateType,adjustmentPercent,status,source,
    updatedAt:rateType==='manual'||status==='fallback'?saved.updated_at:quote?.updatedAt||null,
    fetchedAt:new Date(market.fetchedAt).toISOString(),
  };
}
