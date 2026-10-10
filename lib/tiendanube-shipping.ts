type RecordValue = Record<string,unknown>;

function record(value:unknown):RecordValue {
  return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
}

function money(value:unknown):number|null {
  if (value===null||value===undefined||value==='') return null;
  const amount=record(value);
  const parsed=Number(typeof value==='object'?amount.value??amount.amount:value);
  return Number.isFinite(parsed)&&parsed>=0?parsed:null;
}

/** Merchant expense, not the shipping amount charged to the customer. */
export function merchantShippingCost(order:RecordValue):number|null {
  const fulfillments=Array.isArray(order.fulfillments)?order.fulfillments:[];
  if (fulfillments.length) {
    const costs=fulfillments.map(value=>{
      const shipping=record(record(value).shipping);
      return money(shipping.merchant_cost??shipping.owner_cost);
    });
    if (costs.every((cost):cost is number=>cost!==null)) {
      return costs.reduce((sum,cost)=>sum+cost,0);
    }
  }
  return money(order.shipping_cost_owner);
}
