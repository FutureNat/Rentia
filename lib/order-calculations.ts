import {calculateOrderCosts, type CostRule, type CostSettings} from './cost-engine';
import {readMeliPostSale} from './meli-post-sale';
import {readRefundAdjustment,refundLoss} from './refund-adjustment';

export type AnalyticsOrder=Record<string,unknown> & {provider:string;external_order_id:string;source_created_at:string};
export type CalculatedOrder=AnalyticsOrder&{refund_adjustment:import('./refund-adjustment').RefundAdjustment|null;refund_loss:number|null;post_sale:import('./meli-post-sale').MeliPostSale|null;product_cost:number;shipping_cost:number;shipping_source:string;commission_cost:number;commission_source:string;commission_missing_reason:string|null;tax_cost:number};

export function orderCosts(order:AnalyticsOrder,settings:CostSettings,rules:CostRule[]):CalculatedOrder {
  const paid=order.payment_status==='paid'&&order.status!=='cancelled';
  const costs=paid?calculateOrderCosts({provider:order.provider,total:Number(order.total||0),currency:String(order.currency||'ARS'),payment_method:String(order.payment_method||''),payment_type:String(order.payment_type||''),payment_installments:order.payment_installments===null||order.payment_installments===undefined?null:Number(order.payment_installments),source_shipping_cost:order.source_shipping_cost===null||order.source_shipping_cost===undefined?null:Number(order.source_shipping_cost),source_commission_cost:order.source_commission_cost===null||order.source_commission_cost===undefined?null:Number(order.source_commission_cost),manual_commission_cost:order.manual_commission_cost===null||order.manual_commission_cost===undefined?null:Number(order.manual_commission_cost),source_created_at:order.source_created_at},settings,rules):{shipping:0,commissions:0,taxes:0,shippingSource:'—',commissionSource:'—'};
  const pending=paid&&/(?:pago[-_ ]?nube|nuvem[-_ ]?pago)/i.test(String(order.payment_method||''))&&costs.commissionSource==='Sin costo de pago informado';
  const adjustment=order.provider==='mercadolibre'?readRefundAdjustment(order.meli_refund_adjustment_json):null;
  return {...order,refund_adjustment:adjustment,refund_loss:refundLoss({...order,payment_status:order.payment_status,product_cost:order.product_cost},adjustment),post_sale:readMeliPostSale(order.meli_post_sale_json),product_cost:Number(order.product_cost||0),shipping_cost:costs.shipping,shipping_source:costs.shippingSource,commission_cost:costs.commissions,commission_source:costs.commissionSource,commission_missing_reason:costs.commissionSource==='Mercado Libre · cargo pendiente'?'Mercado Libre todavía no informó la tarifa de esta venta. La rentabilidad queda incompleta.':pending?'Falta que Tiendanube informe el cargo real de esta transacción; Rentia volverá a consultarlo automáticamente.':null,tax_cost:costs.taxes};
}

export function allocateOrderCosts(order:CalculatedOrder,revenue:number,paidCount:number,additionalTotal:number):CalculatedOrder&{additional_cost:number;profit:number;margin:number} {
  const paid=order.payment_status==='paid'&&order.status!=='cancelled';
  const additional=paid?(revenue?additionalTotal*Number(order.total||0)/revenue:additionalTotal/Math.max(1,paidCount)):0;
  const profit=paid?Number(order.total||0)-order.product_cost-order.shipping_cost-order.commission_cost-order.tax_cost-additional:-(order.refund_loss??0);
  return {...order,additional_cost:additional,profit,margin:Number(order.total||0)?profit/Number(order.total||0)*100:0};
}

export function costSettings(value:Record<string,unknown>|null|undefined):CostSettings {
  return {shipping_cost_ars:Number(value?.shipping_cost_ars||0),shipping_mode:String(value?.shipping_mode||'average'),commission_percent:Number(value?.commission_percent||0),tax_percent:Number(value?.tax_percent||0),tiendanube_plan_name:value?.tiendanube_plan_name?String(value.tiendanube_plan_name):null,pago_nube_plan_override:value?.pago_nube_plan_override?String(value.pago_nube_plan_override):null,pago_nube_payout_days:value?.pago_nube_payout_days?Number(value.pago_nube_payout_days):null};
}
