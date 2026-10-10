import { z } from 'zod';
import { getMetaAdAccounts, selectMetaAdAccount } from '../../../../../db/database';
import { HttpError, route } from '../../../../../server/http/route';
import { syncMetaAds } from '../../../../../lib/meta';

export const GET=route({},async({user})=>{
  const accounts=await getMetaAdAccounts(user.id);
  return {accounts:accounts.results};
});

export const PUT=route({access:'manager',body:z.object({accountId:z.string().min(1)}),invalidBody:'invalid_account'},async({user,body})=>{
  if (!await selectMetaAdAccount(user.id,body.accountId)) throw new HttpError(400,'invalid_account');
  // The panel shows this message as-is, so the sync error text is kept.
  try { return {ok:true,...await syncMetaAds(user.id)}; }
  catch (error) { throw new HttpError(502,error instanceof Error?error.message:'sync_failed'); }
});
