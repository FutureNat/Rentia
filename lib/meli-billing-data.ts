import {meliId,meliList,meliRecord} from './mercadolibre-data';

export type BillingGroup='ML'|'MP';
export type BillingEntry={
  id:string;name:string;code:string;type:string;direction:'charge'|'credit'|'unknown';amountCents:number;
  currency:string;createdAt:string|null;orderIds:string[];operationIds:string[];documentId:string|null;
  documentNumber:string|null;documentType:string;documentStatus:string|null;status:string|null;
  debited:string|null;originalChargeId:string|null;discountCents:number|null;discountReason:string|null;
};
export const billingCategories={sales:'Venta y comisiones',financing:'Financiación',shipping:'Envíos',logistics:'Logística y almacenamiento',taxes:'Impuestos y percepciones',advertising:'Publicidad',other:'Otros conceptos'};
export type BillingCategory=keyof typeof billingCategories;
// Presentation only: never use this heuristic to debit profit or classify a
// withholding as an expense. Unknown/new provider codes remain visible.
export function billingCategory(name:string):BillingCategory {
  const text=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/impuesto|percepcion|retencion|tribut|tax/.test(text))return 'taxes';
  if(/financia|cuotas/.test(text))return 'financing';
  if(/fulfillment|almacen|storage|logistica/.test(text))return 'logistics';
  if(/envio|shipping|flex|flete/.test(text))return 'shipping';
  if(/publicidad|advertising|product ads/.test(text))return 'advertising';
  if(/venta|vender|comision|procesamiento/.test(text))return 'sales';
  return 'other';
}
function text(value:unknown,max=500):string|null {return typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;}
function optionalId(value:unknown):string|null {return value===null||value===undefined?null:meliId(value);}
function cents(value:unknown):number {
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error('mercadolibre_invalid_billing_response');
  const amount=Math.round((value+Number.EPSILON)*100);
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('mercadolibre_invalid_billing_response');
  return amount;
}
export function billingPeriod(value:string) {
  if(!/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(value))throw new Error('invalid_billing_period');
  const date=Date.parse(`${value}T00:00:00Z`),now=new Date();
  const first=Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-12,1),last=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1);
  if(!Number.isFinite(date)||date<first||date>last)throw new Error('invalid_billing_period');
  return value;
}
export function billingJob(group:BillingGroup,period:string){return `mercadolibre_billing:${group}:${period}`;}
export function normalizeBillingEntry(value:unknown,documentType:string):BillingEntry {
  const row=meliRecord(value),charge=meliRecord(row.charge_info),discount=meliRecord(row.discount_info);
  const type=text(charge.detail_type,80)||'UNKNOWN';
  const normalized=type.toUpperCase();
  const sales=meliList(row.sales_info),operation=meliRecord(row.operation_info);
  const ids=(values:unknown[])=>Array.from(new Set(values.filter(v=>v!==null&&v!==undefined).map(v=>meliId(v))));
  const createdAt=text(charge.creation_date_time,80);
  const currency=text(meliRecord(row.currency_info).currency_id,12);
  if(!currency||!/^([A-Z]{3})$/.test(currency))throw new Error('mercadolibre_invalid_billing_response');
  return {
    id:meliId(charge.detail_id),name:text(charge.transaction_detail)||text(charge.detail_sub_type,80)||'Concepto sin descripción',
    code:text(charge.detail_sub_type,80)||'SIN_CODIGO',type,
    direction:normalized==='CHARGE'?'charge':normalized==='BONUS'?'credit':'unknown',
    amountCents:cents(charge.detail_amount),currency,
    createdAt:createdAt&&Number.isFinite(Date.parse(createdAt))?createdAt:null,
    orderIds:ids(sales.map(s=>meliRecord(s).order_id)),
    operationIds:ids([...sales.map(s=>meliRecord(s).operation_id),operation.reference_id]),
    documentId:optionalId(meliRecord(row.document_info).document_id),documentNumber:text(charge.legal_document_number,150),
    documentType,documentStatus:text(charge.legal_document_status_description)||text(charge.legal_document_status,80),
    status:text(charge.status_description)||text(charge.status,80),debited:text(charge.debited_from_operation_description)||text(charge.debited_from_operation,80),
    originalChargeId:optionalId(charge.charge_bonified_id),
    discountCents:discount.discount_amount===null||discount.discount_amount===undefined?null:cents(discount.discount_amount),discountReason:text(discount.discount_reason),
  };
}
export type BillingProgress={version:1;sellerId:string;generation:string;document:number;cursor:string;retryAt:number;error:string|null;startedAt:string;completedAt:string|null};
export function newBillingProgress(sellerId:string):BillingProgress {
  return {version:1,sellerId,generation:crypto.randomUUID(),document:0,cursor:'0',retryAt:0,error:null,startedAt:new Date().toISOString(),completedAt:null};
}
export function readBillingProgress(value:string|null,sellerId:string):BillingProgress|null {
  try {
    const data=JSON.parse(value||'null');
    if(data?.version!==1||data.sellerId!==sellerId||typeof data.generation!=='string'||!Number.isInteger(data.document)||data.document<0||data.document>2||!/^\d+$/.test(data.cursor)||!Number.isFinite(data.retryAt)||typeof data.startedAt!=='string')return null;
    return data;
  }catch{return null;}
}
export function billingErrorMessage(error:string|null) {
  if(error==='mercadolibre_permission_missing')return 'Mercado Libre no habilitó el acceso a estos reportes para la aplicación. Los cargos no se consideran cero.';
  if(error==='mercadolibre_reauthorize')return 'Hace falta volver a autorizar Mercado Libre en Integraciones.';
  if(error==='mercadolibre_partial_report')return 'Mercado Libre entregó un reporte parcial. Conservamos el avance y volveremos a consultar la misma página.';
  if(error==='mercadolibre_rate_limit')return 'Mercado Libre pidió una pausa. El desglose continuará desde el último avance guardado.';
  if(error)return 'No pudimos completar el reporte. Conservamos el avance; los importes siguen siendo parciales.';
  return null;
}
