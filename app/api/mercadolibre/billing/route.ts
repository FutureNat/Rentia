import {after} from 'next/server';
import {HttpError,route} from '../../../../server/http/route';
import {getMeliCredentials} from '../../../../db/mercadolibre';
import {billingReport} from '../../../../db/meli-billing';
import {billingPeriod,type BillingGroup} from '../../../../lib/meli-billing-data';
import {reconcileMeliBilling} from '../../../../lib/meli-billing-sync';

export const dynamic='force-dynamic';
const headers={'cache-control':'no-store'};
function parameters(url:URL) {
  try {
    const params=url.searchParams;
    const group=params.get('group')||'ML';
    if(!['ML','MP'].includes(group))throw new Error('invalid_group');
    const page=Number(params.get('page')||1);
    if(!Number.isSafeInteger(page)||page<1)throw new Error('invalid_page');
    return {group:group as BillingGroup,period:billingPeriod(params.get('period')||new Date().toISOString().slice(0,7)+'-01'),page,query:(params.get('q')||'').trim().slice(0,120),force:params.get('force')==='1'};
  } catch { throw new HttpError(400,'invalid_parameters'); }
}
export const GET=route({headers},async({user,url})=>{
  const params=parameters(url);
  const connection=await getMeliCredentials(user.id);
  if(!connection)return Response.json({connected:false,entries:[],totals:[],progress:null,pagination:{page:1,total:0,pageSize:100}},{headers});
  return Response.json(await billingReport(user.id,connection.external_store_id,params.group,params.period,params.page,params.query),{headers});
});
export const POST=route({access:'manager',origin:'configured',headers},async({user,url})=>{
  const params=parameters(url);
  try {
    const work=reconcileMeliBilling(user.id,params.group,params.period,params.force);
    after(work.then(()=>undefined,()=>undefined));
    return Response.json(await work,{headers});
  }catch{throw new HttpError(502,'billing_unavailable');}
});
