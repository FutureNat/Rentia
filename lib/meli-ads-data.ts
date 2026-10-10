export type AdsAccount={advertiser_id:string;site_id:string;name:string;currency:string};
export type AdsDay={date:string;cost_cents:number;attributed_cents:number;clicks:number;impressions:number;units:number};
const currencies:Record<string,string>={MLA:'ARS',MLB:'BRL',MLM:'MXN',MLC:'CLP',MCO:'COP',MLU:'UYU',MPE:'PEN',MEC:'USD'};
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function id(v:unknown){const s=String(v);if(!/^\d{1,20}$/.test(s)||(typeof v==='number'&&!Number.isSafeInteger(v)))throw new Error('mercadolibre_invalid_api_response');return s;}
function metric(v:unknown,integer=false){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12||(integer&&!Number.isSafeInteger(v)))throw new Error('mercadolibre_invalid_api_response');return v;}
export function adsAccounts(value:unknown):AdsAccount[] {
  const rows=record(value).advertisers;if(!Array.isArray(rows))throw new Error('mercadolibre_invalid_api_response');
  const ids=new Set<string>();return rows.map(value=>{const r=record(value),advertiser_id=id(r.advertiser_id),site_id=String(r.site_id);if(!currencies[site_id]||ids.has(advertiser_id))throw new Error('mercadolibre_invalid_api_response');ids.add(advertiser_id);return {advertiser_id,site_id,currency:currencies[site_id],name:String(r.advertiser_name||r.account_name||`Cuenta ${advertiser_id}`).slice(0,180)};});
}
export function adsCampaignPage(value:unknown,offset:number){
  const body=record(value),paging=record(body.paging);if(!Array.isArray(body.results)||paging.offset!==offset||!Number.isSafeInteger(paging.total)||Number(paging.total)<offset||body.results.length>50||(body.results.length===0&&Number(paging.total)>offset))throw new Error('mercadolibre_invalid_api_response');
  const seen=new Set<string>();const campaigns=body.results.map(value=>{const r=record(value),campaignId=id(r.id);if(seen.has(campaignId))throw new Error('mercadolibre_invalid_api_response');seen.add(campaignId);return {id:campaignId,name:String(r.name||`Campaña ${campaignId}`).slice(0,180),status:String(r.status||'No informado').slice(0,40)};});return {campaigns,total:Number(paging.total)};
}
export function adsDays(value:unknown,from:string,to:string):AdsDay[]{
  if(!Array.isArray(value))throw new Error('mercadolibre_invalid_api_response');const seen=new Set<string>();
  return value.map(value=>{const r=record(value),date=String(r.date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date<from||date>to||seen.has(date))throw new Error('mercadolibre_invalid_api_response');seen.add(date);return {date,cost_cents:Math.round(metric(r.cost)*100),attributed_cents:Math.round(metric(r.total_amount)*100),clicks:metric(r.clicks,true),impressions:metric(r.prints,true),units:metric(r.units_quantity)};});
}
export function adsCoverage(intervals:Array<{date_from:string;date_to:string}>,from:string,to:string){
  let cursor=from;for(const r of [...intervals].sort((a,b)=>a.date_from.localeCompare(b.date_from))){if(r.date_to<cursor)continue;if(r.date_from>cursor)break;const next=new Date(r.date_to+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);cursor=next.toISOString().slice(0,10);if(cursor>to)return true;}return false;
}
