import { z } from 'zod';
import { HttpError, route } from '../../../../server/http/route';
import { reconcileTiendanube } from '../../../../lib/tiendanube';

const SyncBody=z.object({automatic:z.unknown().optional()}).default({});

export const POST=route({access:'manager',body:SyncBody},async({user,body,request})=>{
  // The panel shows this message as-is, so the sync error text is kept.
  try { return {ok:true,...await reconcileTiendanube(user.id,request.url,body.automatic?'panel':'manual')}; }
  catch (error) { throw new HttpError(502,error instanceof Error?error.message:'sync_failed'); }
});
