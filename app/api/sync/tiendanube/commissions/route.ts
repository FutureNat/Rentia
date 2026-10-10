import { z } from 'zod';
import { HttpError, route } from '../../../../../server/http/route';
import { syncPendingTiendanubeCommissions } from '../../../../../lib/tiendanube';

const CommissionSyncBody=z.object({checkedBefore:z.unknown().optional()}).default({});

export const POST=route({access:'manager',body:CommissionSyncBody,invalidBody:'invalid_sync_window'},async({user,body})=>{
  const timestamp=body.checkedBefore?Date.parse(String(body.checkedBefore)):NaN;
  if (body.checkedBefore&&(!Number.isFinite(timestamp)||timestamp>Date.now()+5000)) throw new HttpError(400,'invalid_sync_window');
  const checkedBefore=Number.isFinite(timestamp)?new Date(timestamp).toISOString():undefined;
  try { return {ok:true,commissions:await syncPendingTiendanubeCommissions(user.id,checkedBefore)}; }
  catch (error) { throw new HttpError(502,error instanceof Error?error.message:'commission_sync_failed'); }
});
