type UnknownRecord=Record<string,unknown>;

function record(value:unknown):UnknownRecord {
  return value&&typeof value==='object'&&!Array.isArray(value)?value as UnknownRecord:{};
}

// The payment-provider tax is part of the amount withheld from the merchant.
// For Pago Nube this can be the VAT added to the processing fee.
const commissionTypes=new Set(['payment_processing_fee','cost_per_transaction','financing_cost','tax','other']);

// Only merchant charges on completed transactions are costs to the store.
// Consumer charges and transaction amounts are not merchant commissions.
export function merchantCommissionCost(transactions:unknown,currency:string):number|null {
  if (!Array.isArray(transactions)) return null;
  let total=0;
  let found=false;
  for (const value of transactions) {
    const transaction=record(value);
    if (String(transaction.status||'').toLowerCase()!=='paid') continue;
    const charges=record(transaction.info).merchant_charges;
    if (!Array.isArray(charges)) continue;
    // An explicitly returned (even empty) merchant_charges collection is
    // authoritative. This matters for payment methods whose real fee is $0.
    found=true;
    for (const entry of charges) {
      const charge=record(entry);
      if (!commissionTypes.has(String(charge.type||''))) continue;
      const amount=record(charge.amount);
      if (amount.currency&&String(amount.currency).toUpperCase()!==currency.toUpperCase()) continue;
      if (amount.value===null||amount.value===undefined||amount.value==='') continue;
      const numeric=Number(amount.value);
      if (!Number.isFinite(numeric)||numeric<0) continue;
      total+=numeric;
    }
  }
  return found?Math.round(total*100)/100:null;
}
