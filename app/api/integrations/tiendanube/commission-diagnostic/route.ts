import { z } from 'zod';
import { HttpError, route, validate } from '../../../../../server/http/route';
import { field } from '../../../../../server/http/fields';
import { diagnoseTiendanubeCommission } from '../../../../../lib/tiendanube';

export const POST=route({access:'manager',body:z.object({orderId:field(value=>String(value||''))}),invalidBody:'invalid_request'},async({user,body})=>{
  const orderId=validate(z.string().regex(/^\d{1,20}$/),body.orderId,'invalid_order');
  try { return await diagnoseTiendanubeCommission(user.id,orderId); }
  catch { throw new HttpError(502,'diagnostic_failed'); }
});
