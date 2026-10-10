// A local accounting confirmation, never a request to refund money upstream.
export type RefundAdjustment={version:1;kind:'full_keep_product';shipping:number;fees:number;taxes:number;extra:number;confirmedAt:string;confirmedBy?:string};
export function readRefundAdjustment(value:unknown):RefundAdjustment|null {
  try {
    const row=typeof value==='string'?JSON.parse(value):value;
    if(!row||row.version!==1||row.kind!=='full_keep_product'||typeof row.confirmedAt!=='string'||!Number.isFinite(Date.parse(row.confirmedAt)))return null;
    if(['shipping','fees','taxes','extra'].some(key=>typeof row[key]!=='number'||!Number.isFinite(row[key])||row[key]<0||row[key]>1e9))return null;
    return row;
  }catch{return null;}
}
export function refundLoss(order:{payment_status:unknown;product_cost:unknown;item_count?:unknown;missing_product_costs?:unknown},adjustment:RefundAdjustment|null):number|null {
  // Partial refunds need a separate remaining-revenue calculation. Never treat
  // one as a full refund or subtract the sale price after excluding its revenue.
  if(!adjustment||!['refunded','charged_back'].includes(String(order.payment_status))||!(Number(order.item_count)>0)||Number(order.missing_product_costs)!==0)return null;
  return Number(order.product_cost||0)+adjustment.shipping+adjustment.fees+adjustment.taxes+adjustment.extra;
}
