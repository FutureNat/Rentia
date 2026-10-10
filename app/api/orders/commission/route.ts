import { z } from 'zod';
import { saveManualCommission } from '../../../../db/database';
import { HttpError, route } from '../../../../server/http/route';
import { field } from '../../../../server/http/fields';

const CommissionBody=z.object({
  orderId:field(value=>String(value||'')).pipe(z.string().regex(/^\d{1,20}$/)),
  cost:z.union([z.null(),z.coerce.number().min(0).max(1000000000)]),
});

export const POST=route({access:'manager',body:CommissionBody,invalidBody:'invalid_commission'},async({user,body})=>{
  const saved=await saveManualCommission(user.id,'tiendanube',body.orderId,body.cost);
  if (!saved) throw new HttpError(404,'order_not_found');
  return {ok:true};
});
