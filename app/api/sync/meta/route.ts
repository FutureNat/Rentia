import { HttpError, route } from '../../../../server/http/route';
import { syncMetaAds } from '../../../../lib/meta';

export const POST=route({access:'manager'},async({user})=>{
  // The panel shows this message as-is, so the sync error text is kept.
  try { return {ok:true,...await syncMetaAds(user.id)}; }
  catch (error) { throw new HttpError(502,error instanceof Error?error.message:'sync_failed'); }
});
