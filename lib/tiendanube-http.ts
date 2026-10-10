// Tiendanube's default bucket refills at two requests per second. Reserve a
// slot synchronously so concurrent order/product requests do not create bursts.
const nextSlot=new Map<string,number>();
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

export function tiendanubeRetryDelay(response:Response) {
  const retryAfter=response.headers.get('retry-after');
  const seconds=retryAfter?Number(retryAfter):NaN;
  const date=retryAfter?Date.parse(retryAfter):NaN;
  const reset=Number(response.headers.get('x-rate-limit-reset'));
  const delay=Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-Date.now():reset||2000;
  return Math.min(20000,Math.max(1000,delay));
}

export async function tiendanubeFetch(storeId:string,url:string,init:RequestInit={},retries=1) {
  for (let attempt=0;;attempt++) {
    const now=Date.now();
    for (const [id,slot] of nextSlot) if (slot<now-60000) nextSlot.delete(id);
    const slot=Math.max(now,nextSlot.get(storeId)||0);
    nextSlot.set(storeId,slot+550);
    if (slot>now) await pause(slot-now);
    const response=await fetch(url,{...init,signal:AbortSignal.timeout(15000)});
    if ((response.status===429||response.status>=500)&&attempt<retries) {
      const delay=tiendanubeRetryDelay(response);
      await response.body?.cancel();
      nextSlot.set(storeId,Math.max(nextSlot.get(storeId)||0,Date.now()+delay));
      await pause(delay);
      continue;
    }
    return response;
  }
}
