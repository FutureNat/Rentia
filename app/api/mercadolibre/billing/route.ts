import {after,NextResponse} from 'next/server';
import {canManageRentia,getRentiaUser} from '../../../../lib/session';
import {mercadoLibreOrigin} from '../../../../lib/mercadolibre';
import {getMeliCredentials} from '../../../../db/mercadolibre';
import {billingReport} from '../../../../db/meli-billing';
import {billingPeriod,type BillingGroup} from '../../../../lib/meli-billing-data';
import {reconcileMeliBilling} from '../../../../lib/meli-billing-sync';

export const dynamic='force-dynamic';
const headers={'cache-control':'no-store'};
function parameters(request:Request) {
  const params=new URL(request.url).searchParams;
  const group=params.get('group')||'ML';
  if(!['ML','MP'].includes(group))throw new Error('invalid_group');
  const page=Number(params.get('page')||1);
  if(!Number.isSafeInteger(page)||page<1)throw new Error('invalid_page');
  return {group:group as BillingGroup,period:billingPeriod(params.get('period')||new Date().toISOString().slice(0,7)+'-01'),page,query:(params.get('q')||'').trim().slice(0,120),force:params.get('force')==='1'};
}
export async function GET(request:Request) {
  const user=await getRentiaUser();
  if(!user)return NextResponse.json({error:'unauthorized'},{status:401,headers});
  let params;try{params=parameters(request);}catch{return NextResponse.json({error:'invalid_parameters'},{status:400,headers});}
  const connection=await getMeliCredentials(user.id);
  if(!connection)return NextResponse.json({connected:false,entries:[],totals:[],progress:null,pagination:{page:1,total:0,pageSize:100}},{headers});
  return NextResponse.json(await billingReport(user.id,connection.external_store_id,params.group,params.period,params.page,params.query),{headers});
}
export async function POST(request:Request) {
  const user=await getRentiaUser();
  if(!user)return NextResponse.json({error:'unauthorized'},{status:401,headers});
  if(!canManageRentia(user))return NextResponse.json({error:'forbidden'},{status:403,headers});
  if(request.headers.get('origin')!==mercadoLibreOrigin()||new URL(request.url).origin!==mercadoLibreOrigin())return NextResponse.json({error:'invalid_origin'},{status:403,headers});
  let params;try{params=parameters(request);}catch{return NextResponse.json({error:'invalid_parameters'},{status:400,headers});}
  try {
    const work=reconcileMeliBilling(user.id,params.group,params.period,params.force);
    after(work.then(()=>undefined,()=>undefined));
    return NextResponse.json(await work,{headers});
  }catch{return NextResponse.json({error:'billing_unavailable'},{status:502,headers});}
}
