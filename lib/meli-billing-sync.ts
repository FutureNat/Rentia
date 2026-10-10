import {claimImportJob,checkpointImportJob,releaseImportJob} from '../db/database';
import {billingState,saveBillingPage,finishBillingGeneration} from '../db/meli-billing';
import {getMeliCredentials} from '../db/mercadolibre';
import {MeliClient,MeliError} from './mercadolibre-sync';
import {meliId,meliRecord} from './mercadolibre-data';
import {billingJob,newBillingProgress,normalizeBillingEntry,readBillingProgress,type BillingGroup} from './meli-billing-data';

export async function reconcileMeliBilling(userId:string,group:BillingGroup,period:string,force=false) {
  const credentials=await getMeliCredentials(userId);
  if(!credentials)return {connected:false};
  const seller=credentials.external_store_id,job=billingJob(group,period);
  const existing=(await billingState(userId,seller,group,period)).progress;
  if(existing?.retryAt&&existing.retryAt>Date.now())return {pending:true,retryAt:existing.retryAt};
  // Reports are fiscal data, not a realtime order feed. Even a manual refresh
  // cannot hammer the same completed period; normal reads reuse a 12h cache.
  if(existing?.completedAt&&Date.now()-Date.parse(existing.completedAt)<(force?5*60_000:12*3600_000))return {pending:false,cached:true};
  const lease=await claimImportJob(userId,job,JSON.stringify(newBillingProgress(seller)),60_000);
  if(!lease)return {pending:true,busy:true};
  let state=readBillingProgress(lease.stateJson,seller)||newBillingProgress(seller);
  if(state.document===2)state=newBillingProgress(seller);
  const client=new MeliClient(userId,seller,Date.now()+18_000);
  try {
    await checkpointImportJob(userId,job,lease.token,JSON.stringify(state),false,60_000);
    for(let batch=0;batch<2&&state.document<2&&Date.now()<client.deadline-1500;batch++) {
      const documentType=state.document===0?'BILL':'CREDIT_NOTE';
      const params=new URLSearchParams({group,document_type:documentType,limit:'50',from_id:state.cursor,sort_by:'ID',order_by:'ASC'});
      const response=meliRecord(await client.get(`/billing/integration/periods/key/${period}/group/${group}/details?${params}`));
      if(!Array.isArray(response.results)||(response.errors!==undefined&&response.errors!==null&&(!Array.isArray(response.errors)||response.errors.length>0))||response.results.length>50)throw new MeliError('mercadolibre_invalid_billing_response',300);
      const entries=response.results.map(value=>normalizeBillingEntry(value,documentType));
      if(entries.length) {
        const cursor=meliId(response.last_id);
        if(BigInt(cursor)<=BigInt(state.cursor)||entries.some(entry=>BigInt(entry.id)>BigInt(cursor)))throw new MeliError('mercadolibre_invalid_billing_response',300);
        await saveBillingPage(userId,seller,group,period,lease.token,state.generation,entries);
        state.cursor=cursor;
      }else{state.document++;state.cursor='0';}
      state.error=null;state.retryAt=0;
      if(state.document===2) {
        await finishBillingGeneration(userId,seller,group,period,lease.token,state.generation);
        state.completedAt=new Date().toISOString();
      }
      await checkpointImportJob(userId,job,lease.token,JSON.stringify(state),false,60_000);
    }
  }catch(error) {
    const code=error instanceof MeliError?error.code:error instanceof Error&&error.message==='mercadolibre_invalid_billing_response'?error.message:'mercadolibre_billing_unavailable';
    const seconds=code==='mercadolibre_permission_missing'||code==='mercadolibre_resource_unavailable'?12*3600:error instanceof MeliError?Math.max(30,error.retrySeconds):60;
    state.error=code;state.retryAt=Date.now()+seconds*1000;
    await checkpointImportJob(userId,job,lease.token,JSON.stringify(state),false,60_000);
  }finally{await releaseImportJob(userId,job,lease.token);}
  return {pending:state.document<2,error:state.error,retryAt:state.retryAt};
}
