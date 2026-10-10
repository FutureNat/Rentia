import { NextResponse } from 'next/server';
import { getOrderUsageLast30Days, getOrCreateSubscription, saveRequestedPlan } from '../../../db/database';
import { getPlan, recommendedPlan, RENTIA_PLANS } from '../../../lib/plans';
import { canManageRentia, getRentiaUser } from '../../../lib/session';

function serialize(userId:string,subscription:NonNullable<Awaited<ReturnType<typeof getOrCreateSubscription>>>,orders:number,canManage:boolean) {
  const currentPlan=getPlan(subscription.plan_id);
  const recommendation=recommendedPlan(orders);
  const trialMs=new Date(subscription.trial_ends_at).getTime()-Date.now();
  const trialDaysRemaining=Math.max(0,Math.ceil(trialMs/(24*60*60*1000)));
  const limit=subscription.status==='trialing'?recommendation.orders:currentPlan.orders;
  return {
    userId,
    subscription:{
      planId:subscription.plan_id,
      requestedPlanId:subscription.requested_plan_id,
      status:subscription.status,
      billingCycle:subscription.billing_cycle,
      trialEndsAt:subscription.trial_ends_at,
      trialDaysRemaining,
    },
    usage:{orders,limit,percent:limit?Math.min(100,Math.round(orders/limit*100)):0},
    currentPlan,
    recommendation,
    plans:RENTIA_PLANS,
    billingEnabled:false,
    canManage,
  };
}

export async function GET() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const [subscription,orders]=await Promise.all([getOrCreateSubscription(user.id),getOrderUsageLast30Days(user.id)]);
  if (!subscription) return NextResponse.json({error:'account_not_found'},{status:404});
  return NextResponse.json(serialize(user.id,subscription,orders,canManageRentia(user)));
}

export async function POST(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json().catch(()=>({})) as {planId?:string;billingCycle?:string};
  const plan=RENTIA_PLANS.find(item=>item.id===body.planId);
  const billingCycle=body.billingCycle==='annual'?'annual':'monthly';
  if (!plan||plan.id==='free') return NextResponse.json({error:'invalid_plan'},{status:400});
  const subscription=await saveRequestedPlan(user.id,plan.id,billingCycle);
  if (!subscription) return NextResponse.json({error:'account_not_found'},{status:404});
  const orders=await getOrderUsageLast30Days(user.id);
  return NextResponse.json({...serialize(user.id,subscription,orders,true),message:'Plan guardado para el lanzamiento. Todavía no se realizó ningún cobro.'});
}
