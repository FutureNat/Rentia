export type RateType = 'official' | 'blue' | 'mep' | 'manual';
export type RateSettings = {rate_type:string;base_rate:number;adjustment_percent:number;updated_at:string|null};
export type MarketQuote = {buy:number|null;sell:number;updatedAt:string|null};
export type QuotePoint = {date:string;sell:number};
export type LiveRates = {
  rates:{ARS:number;USD?:number;EUR?:number};source:string;updatedAt:string|null;fetchedAt:string;
  quotes:Partial<Record<RateType,MarketQuote>>;baseRate:number|null;effectiveRate:number|null;
  rateType:RateType;adjustmentPercent:number;status:'live'|'cached'|'fallback'|'manual'|'unavailable';
};
export const rateLabels:Record<RateType,string>={official:'Oficial',blue:'Blue',mep:'MEP',manual:'Manual'};
export const rateHouses={official:'oficial',blue:'blue',mep:'bolsa'} as const;
export const defaultRateSettings:RateSettings={rate_type:'official',base_rate:0,adjustment_percent:0,updated_at:null};
export function asRateType(value:string):RateType {return Object.hasOwn(rateLabels,value)?value as RateType:'official';}
export function adjustedRate(base:number|null,adjustment:number):number|null {
  const value=base===null?0:base*(1+adjustment/100);
  return Number.isFinite(value)&&value>0?value:null;
}
export function parseMarketQuotes(data:unknown):LiveRates['quotes'] {
  if(!Array.isArray(data))throw new Error('Invalid quotes response');
  const quotes:LiveRates['quotes']={};
  for(const [type,house] of Object.entries(rateHouses)) {
    const raw=data.find(row=>row?.casa===house);
    if(raw&&Number.isFinite(Number(raw.venta))&&Number(raw.venta)>0) {
      quotes[type as RateType]={sell:Number(raw.venta),buy:Number.isFinite(Number(raw.compra))&&raw.compra!=null?Number(raw.compra):null,updatedAt:typeof raw.fechaActualizacion==='string'&&!Number.isNaN(Date.parse(raw.fechaActualizacion))?raw.fechaActualizacion:null};
    }
  }
  if(!Object.keys(quotes).length)throw new Error('No valid quotes');
  return quotes;
}
export function normalizeHistory(data:unknown,house:string,today:string):QuotePoint[] {
  if(!Array.isArray(data))throw new Error('Invalid historical response');
  const cutoff=new Date(`${today}T12:00:00Z`);cutoff.setUTCDate(cutoff.getUTCDate()-370);
  const start=cutoff.toISOString().slice(0,10);
  const points=new Map<string,number>();
  for(const row of data) {
    if(row?.casa!==house||typeof row.fecha!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.fecha)||!Number.isFinite(Number(row.venta))||Number(row.venta)<=0)continue;
    const timestamp=Date.parse(`${row.fecha}T12:00:00Z`);
    if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==row.fecha)continue;
    if(row.fecha>=start&&row.fecha<=today)points.set(row.fecha,Number(row.venta));
  }
  return [...points].sort(([a],[b])=>a.localeCompare(b)).map(([date,sell])=>({date,sell}));
}
