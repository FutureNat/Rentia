// Public Argentine Pago Nube rates observed on 2026-09-19.
// These are starting rates, not a settlement feed. Never label their result as an actual charge.
// https://www.tiendanube.com/soluciones/pago-nube
const cardRates:Record<string,Partial<Record<1|7|14,number>>>={
  inicial:{1:6.40,7:4.45,14:3.50},
  esencial:{1:6.09,7:4.39,14:3.49},
  impulso:{1:5.89,7:4.19,14:3.29},
  escala:{1:5.59,7:3.89,14:2.99},
};
const transferRates:Record<string,number>={inicial:1.50,esencial:1.50,impulso:0.99,escala:0.85};

function key(value:string|null|undefined) {
  return (value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ');
}

export function pagoNubePlan(name:string|null|undefined) {
  const normalized=key(name);
  return Object.keys(cardRates).find(plan=>new RegExp(`(?:^| )${plan}(?: |$)`).test(normalized))||null;
}

export function estimatePagoNubeFee(input:{total:number;currency:string;gateway:string|null|undefined;paymentType:string|null|undefined;installments:number|null|undefined;planName:string|null|undefined;payoutDays:number|null|undefined}) {
  if (input.currency!=='ARS'||!Number.isFinite(input.total)||input.total<=0) return null;
  const gateway=key(input.gateway);
  if (!/(?:pago nube|pagonube|nuvem pago|nuvempago)/.test(gateway)) return null;
  const plan=pagoNubePlan(input.planName);
  if (!plan) return null;
  const method=key(input.paymentType);
  let rate:number|undefined;
  if (/(?:transfer|wire)/.test(method)) rate=transferRates[plan];
  else if (/(?:credit|credito|debit|debito|card|tarjeta|modo)/.test(method)) {
    // Installment financing is not part of the published base-rate table.
    const debit=/(?:debit|debito)/.test(method);
    if (debit ? input.installments!==null&&input.installments!==undefined&&input.installments!==1 : input.installments!==1) return null;
    if (![1,7,14].includes(Number(input.payoutDays))) return null;
    rate=cardRates[plan][input.payoutDays as 1|7|14];
  }
  if (rate===undefined) return null;
  return Math.round((input.total*rate/100*1.21+Number.EPSILON)*100)/100;
}
