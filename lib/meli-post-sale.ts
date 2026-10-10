import {meliAmount,meliId,meliList,meliRecord} from './mercadolibre-data';

export type MeliClaim={id:string;status:string;type:string;stage:string;resolution:string|null};
export type MeliPostSale={version:1;refundAmount:number|null;refundStatus:'none'|'partial'|'refunded'|'charged_back'|'reported';claims:MeliClaim[];claimsChecked:boolean;claimsError:string|null};

// Only provider facts, not available_actions, an open claim or a requested refund.
// Amounts are deduplicated by payment ID and never inferred from the sale total.
export function meliPaymentFacts(value:unknown,sellerId:string):MeliPostSale {
  const order=meliRecord(value),amounts=new Map<string,number>();
  let amountIncomplete=false,refund=false,partial=false,chargeback=false;
  for(const raw of meliList(order.payments)) {
    const payment=meliRecord(raw),collector=meliRecord(payment.collector);
    if(collector.id!==undefined&&String(collector.id)!==sellerId)throw new Error('mercadolibre_resource_owner');
    if(payment.currency_id!==undefined&&payment.currency_id!==order.currency_id)throw new Error('mercadolibre_invalid_payment_currency');
    const status=String(payment.status||'');
    refund ||= status==='refunded';partial ||= status==='partially_refunded';chargeback ||= status==='charged_back';
    const paidRefund=meliAmount(payment.transaction_amount_refunded);
    // Older order representations omit this field. Unknown is not zero.
    const expectsAmount=['refunded','partially_refunded','charged_back'].includes(status);
    if(expectsAmount&&(paidRefund===null||paidRefund===0))amountIncomplete=true;
    if(paidRefund!==null) {
      partial ||= paidRefund>0&&status!=='refunded';
      if(payment.id===undefined||payment.id===null){if(expectsAmount||paidRefund>0)amountIncomplete=true;continue;}
      const id=meliId(payment.id),cents=Math.round(paidRefund*100);
      if(amounts.has(id)&&amounts.get(id)!==cents)amountIncomplete=true;
      amounts.set(id,cents);
    }
  }
  const status=String(order.status||'');
  const refundStatus=chargeback||status==='charged_back'?'charged_back':refund||status==='refunded'?'refunded':partial||status==='partially_refunded'?'partial':'none';
  const amount=[...amounts.values()].reduce((sum,cents)=>sum+cents,0);
  return {version:1,refundAmount:!amountIncomplete&&amounts.size&&(refundStatus==='none'||amount>0)?amount/100:null,refundStatus,claims:[],claimsChecked:false,claimsError:null};
}

export function normalizeMeliClaims(value:unknown,orderId:string,sellerId:string):MeliClaim[] {
  const page=meliRecord(value);
  if(!Array.isArray(page.data)||Number(meliRecord(page.paging).total)>page.data.length)throw new Error('mercadolibre_incomplete_claims');
  const claims=new Map<string,MeliClaim>();
  for(const raw of page.data) {
    const claim=meliRecord(raw);
    if(!meliList(claim.players).some(raw=>{const player=meliRecord(raw);return player.role==='respondent'&&String(player.user_id)===sellerId;}))throw new Error('mercadolibre_resource_owner');
    // Pack/payment/shipment claims cannot be assigned without a verified order link.
    if(!(claim.resource==='order'&&String(claim.resource_id)===orderId)&&String(claim.order_id)!==orderId)continue;
    const resolution=meliRecord(claim.resolution).reason;
    const id=meliId(claim.id);
    claims.set(id,{id,status:String(claim.status||'unknown'),type:String(claim.type||'unknown'),stage:String(claim.stage||'unknown'),resolution:typeof resolution==='string'?resolution:null});
  }
  return [...claims.values()];
}

export function readMeliPostSale(raw:unknown):MeliPostSale|null {
  try {
    const value=meliRecord(typeof raw==='string'?JSON.parse(raw):raw);
    if(value.version!==1||!Array.isArray(value.claims)||!['none','partial','refunded','charged_back','reported'].includes(String(value.refundStatus))||typeof value.claimsChecked!=='boolean'||!(value.claimsError===null||typeof value.claimsError==='string')||!(value.refundAmount===null||typeof value.refundAmount==='number'&&Number.isFinite(value.refundAmount)&&value.refundAmount>=0))return null;
    if(!value.claims.every(raw=>{const claim=meliRecord(raw);return /^\d+$/.test(String(claim.id))&&['status','type','stage'].every(key=>typeof claim[key]==='string')&&(claim.resolution===null||typeof claim.resolution==='string');}))return null;
    return value as MeliPostSale;
  }catch{return null;}
}
