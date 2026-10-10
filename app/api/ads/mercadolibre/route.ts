import {z} from 'zod';
import {HttpError,route,validate} from '../../../../server/http/route';
import {analyticsRangeFromUrl} from '../../../../lib/analytics-range';
import {getMeliAds,selectMeliAds,syncMeliAds} from '../../../../lib/meli-ads';

const headers={'cache-control':'no-store'};
const SyncBody=z.object({advertiserId:z.unknown().optional(),force:z.unknown().optional()});

export const GET=route({},async({user,url})=>{
  const {days,range}=analyticsRangeFromUrl(url);
  return Response.json(await getMeliAds(user.id,days,0,range),{headers});
});

export const POST=route({access:'manager',origin:'configured',body:SyncBody},async({user,body})=>{
  if(body.advertiserId!==undefined) {
    const advertiserId=validate(z.string().regex(/^\d{1,20}$/),body.advertiserId,'invalid_account');
    try { await selectMeliAds(user.id,advertiserId); }
    catch { throw new HttpError(409,'account_not_available'); }
  }
  return Response.json(await syncMeliAds(user.id,body.force===true),{headers});
});
