export class OnboardingRequestError extends Error {
  constructor(public status:number,public code:string) { super(code); }
}

// All first-step requests are bounded and recoverable; never leave a button
// waiting forever after a dropped connection or an invalid server response.
export async function onboardingRequest<T>(path:string,body:Record<string,unknown>):Promise<T> {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json().catch(()=>null) as (T&{error?:string})|null;
    if (!response.ok) throw new OnboardingRequestError(response.status,data?.error||'request_failed');
    if (!data||typeof data!=='object') throw new Error('invalid_response');
    return data;
  } finally { clearTimeout(timeout); }
}
