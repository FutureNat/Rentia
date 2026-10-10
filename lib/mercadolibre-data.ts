import type {SyncedOrder,SyncedProduct} from '../db/database';
import {importHistoryStart} from './import-history';

export const MELI_IMPORT_VERSION=1;
export const MELI_PAGE_SIZE=50;
// This is a window/page threshold, not a limit on a store's history.
export const MELI_WINDOW_SIZE=900;
export type MeliRecord=Record<string,unknown>;
export function meliRecord(value:unknown):MeliRecord { return value&&typeof value==='object'&&!Array.isArray(value)?value as MeliRecord:{}; }
export function meliList(value:unknown):unknown[] { return Array.isArray(value)?value:[]; }
export function meliId(value:unknown) {
  if(typeof value==='number'&&!Number.isSafeInteger(value))throw new Error('mercadolibre_invalid_identifier');
  const id=String(value??'');
  if(!/^\d+$/.test(id))throw new Error('mercadolibre_invalid_identifier');
  return id;
}
export function meliItemId(value:unknown) {
  const id=String(value??'');if(!/^[A-Z]{3}\d+$/.test(id))throw new Error('mercadolibre_invalid_item');return id;
}
export function meliAmount(value:unknown):number|null {
  if(value===null||value===undefined||value==='')return null;
  const number=Number(value);return Number.isFinite(number)&&number>=0?number:null;
}
function date(value:unknown):string|null { const time=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(time)?new Date(time).toISOString():null; }
function optionalText(value:unknown):string|null { return typeof value==='string'&&value.trim()?value.slice(0,500):null; }
export function meliVariantId(itemId:string,variation:unknown) { return variation===null||variation===undefined?itemId:`${itemId}:${meliId(variation)}`; }

export function normalizeMeliProduct(value:unknown,sellerId:string):SyncedProduct {
  const item=meliRecord(value),id=meliItemId(item.id);
  if(meliId(item.seller_id)!==sellerId)throw new Error('mercadolibre_resource_owner');
  if(typeof item.title!=='string'||!item.title.trim())throw new Error('mercadolibre_invalid_product');
  const variations=meliList(item.variations);
  const variant=(value:unknown,variation:boolean)=>{
    const row=meliRecord(value),attributes=meliList(row.attributes);
    const sku=optionalText(row.seller_sku)||optionalText(row.seller_custom_field)||optionalText(meliRecord(attributes.find(entry=>meliRecord(entry).id==='SELLER_SKU')).value_name);
    const quantity=meliAmount(row.available_quantity);
    return {externalId:meliVariantId(id,variation?row.id:null),sku,price:meliAmount(row.price)??meliAmount(item.price)??0,cost:0,stock:quantity,stockManagement:quantity!==null};
  };
  const image=optionalText(meliRecord(meliList(item.pictures)[0]).secure_url)||optionalText(item.secure_thumbnail);
  return {externalId:id,name:item.title.slice(0,500),imageUrl:image&&image.startsWith('https://')?image:null,published:item.status==='active',createdAt:date(item.date_created),updatedAt:date(item.last_updated),variants:variations.length?variations.map(row=>variant(row,true)):[variant(item,false)]};
}

export type MeliOrder=SyncedOrder&{commissionCost:number|null;postSale?:import('./meli-post-sale').MeliPostSale};
export function normalizeMeliOrder(value:unknown,sellerId:string,shippingCost:number|null,shippingStatus:string|null):MeliOrder {
  const order=meliRecord(value),id=meliId(order.id);
  if(meliId(meliRecord(order.seller).id)!==sellerId)throw new Error('mercadolibre_resource_owner');
  const createdAt=date(order.date_created),total=meliAmount(order.total_amount);
  if(!createdAt||total===null||typeof order.currency_id!=='string'||!/^[A-Z]{3}$/.test(order.currency_id))throw new Error('mercadolibre_invalid_order');
  const lines=meliList(order.order_items);
  if(!lines.length)throw new Error('mercadolibre_invalid_order');
  let fees=0,feesKnown=true;
  const items=lines.map((value,index)=>{
    const line=meliRecord(value),item=meliRecord(line.item),productId=meliItemId(item.id);
    const quantity=meliAmount(line.quantity),price=meliAmount(line.unit_price),fee=meliAmount(line.sale_fee);
    if(quantity===null||!Number.isInteger(quantity)||quantity<=0||price===null)throw new Error('mercadolibre_invalid_order_line');
    if(fee===null)feesKnown=false;else fees+=fee*quantity;
    return {externalLineId:`${productId}:${item.variation_id??'base'}:${index}`,productId,variantId:meliVariantId(productId,item.variation_id),name:optionalText(item.title)||productId,sku:optionalText(item.seller_sku)||optionalText(item.seller_custom_field),quantity,unitPrice:price,unitCost:0};
  });
  const payments=meliList(order.payments).map(meliRecord);
  // Partial refunds and chargebacks require their own financial treatment;
  // never present their original gross amount as a settled paid sale.
  const hasRefund=payments.some(payment=>Number(payment.transaction_amount_refunded||0)>0||['refunded','partially_refunded','charged_back'].includes(String(payment.status)));
  const paid=order.status==='paid'&&!hasRefund;
  const payment=payments.find(payment=>payment.status==='approved')||payments[0]||{};
  const subtotal=items.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0);
  return {externalId:id,number:id,currency:order.currency_id,status:order.status==='cancelled'?'cancelled':String(order.status||'unknown'),paymentStatus:paid?'paid':hasRefund?'refunded':String(order.status||'pending'),paymentMethod:'mercadolibre',paymentType:optionalText(payment.payment_type),paymentInstallments:meliAmount(payment.installments),shippingStatus,shippingCost,total,subtotal,discount:Math.max(0,subtotal-total),createdAt,updatedAt:date(order.date_last_updated)||date(order.last_updated)||date(order.date_created),items,commissionCost:feesKnown?Math.round(fees*100)/100:null};
}

// Ownership and cost allocation are independent: missing quantities or charges
// must not turn a seller-owned shipment into a foreign resource.
export function meliShipmentOrderIds(ordersValue:unknown,sellerId:string):Set<string>|null {
  if(!Array.isArray(ordersValue)||!ordersValue.length)return null;
  const ids=new Set<string>();
  for(const value of ordersValue) {
    const row=meliRecord(value);
    if(!/^\d+$/.test(String(row.seller_id??'')))return null;
    if(meliId(row.seller_id)===sellerId)ids.add(meliId(row.order_id));
  }
  return ids;
}

// Allocate the seller's charge across the shipment's seller-owned quantities.
// Use integer cents and a stable remainder so the allocations sum exactly.
export function allocateMeliShipment(costsValue:unknown,ordersValue:unknown,sellerId:string):Map<string,number>|null {
  const sender=meliList(meliRecord(costsValue).senders).map(meliRecord).find(row=>String(row.user_id)===sellerId);
  const cost=meliAmount(sender?.cost);
  if(cost===null||!meliShipmentOrderIds(ordersValue,sellerId)?.size)return null;
  const weights=new Map<string,number>();
  for(const value of meliList(ordersValue)) {
    const row=meliRecord(value);
    // Malformed or missing ownership information makes the allocation unknown.
    if(!/^\d+$/.test(String(row.seller_id??'')))return null;
    if(String(row.seller_id)!==sellerId)continue;
    // X-New-Domain returns requested_quantity. Retain the legacy fixture/API
    // shape only when that field is absent; null/invalid new values stay unknown.
    const quantity=meliAmount(row.requested_quantity===undefined?row.quantity:row.requested_quantity);
    if(row.requested_quantity!==undefined&&row.quantity!==undefined&&meliAmount(row.quantity)!==quantity)return null;
    if(quantity===null||!Number.isInteger(quantity)||quantity<=0)return null;
    const id=meliId(row.order_id);weights.set(id,(weights.get(id)||0)+quantity);
  }
  const entries=[...weights].sort(([a],[b])=>a.localeCompare(b)),quantity=entries.reduce((sum,[,units])=>sum+units,0);
  if(!quantity)return null;
  const cents=Math.round(cost*100),allocations=entries.map(([id,units])=>({id,cents:Math.floor(cents*units/quantity)}));
  let remainder=cents-allocations.reduce((sum,row)=>sum+row.cents,0);
  for(const row of allocations)if(remainder>0){row.cents++;remainder--;}
  return new Map(allocations.map(row=>[row.id,row.cents/100]));
}

export type MeliWindow={from:string;to:string;offset:number;cancelled:boolean};
export type MeliProgress={version:1;sellerId:string;phase:'orders'|'products'|'done';mode:'history'|'updates';windows:MeliWindow[];pendingOrders:string[];pageCount:number;pageTotal:number;pendingItems:string[];scrollId:string|null;scrollExpires:number;scanInFlight:boolean;through:string;retryAt:number};
export function newMeliProgress(sellerId:string,from?:string,to=new Date().toISOString()):MeliProgress {
  const first=from||importHistoryStart(new Date(to));
  return {version:1,sellerId,phase:'orders',mode:from?'updates':'history',windows:[{from:first,to,offset:0,cancelled:false},{from:first,to,offset:0,cancelled:true}],pendingOrders:[],pageCount:0,pageTotal:0,pendingItems:[],scrollId:null,scrollExpires:0,scanInFlight:false,through:to,retryAt:0};
}
export function readMeliProgress(raw:string,sellerId:string):MeliProgress {
  const state=JSON.parse(raw) as MeliProgress;
  if(state.version!==1||state.sellerId!==sellerId||!['orders','products','done'].includes(state.phase)||!['history','updates'].includes(state.mode)||!Array.isArray(state.windows)||!Array.isArray(state.pendingOrders)||!Array.isArray(state.pendingItems)||!date(state.through))throw new Error('mercadolibre_invalid_progress');
  for(const window of state.windows)if(!date(window.from)||!date(window.to)||Date.parse(window.from)>Date.parse(window.to)||!Number.isInteger(window.offset)||window.offset<0||window.offset>=MELI_WINDOW_SIZE||typeof window.cancelled!=='boolean')throw new Error('mercadolibre_invalid_progress');
  state.pendingOrders.forEach(meliId);state.pendingItems.forEach(meliItemId);
  state.scanInFlight=state.scanInFlight===true;
  return state;
}
export function splitMeliWindow(state:MeliProgress) {
  const window=state.windows[0],from=Date.parse(window.from),to=Date.parse(window.to);
  if(to<=from)throw new Error('mercadolibre_dense_window');
  const midpoint=Math.floor((from+to)/2);
  state.windows.splice(0,1,{from:window.from,to:new Date(midpoint).toISOString(),offset:0,cancelled:window.cancelled},{from:new Date(midpoint+1).toISOString(),to:window.to,offset:0,cancelled:window.cancelled});
}
