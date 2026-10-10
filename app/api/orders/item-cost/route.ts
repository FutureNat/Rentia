import {z} from 'zod';
import {saveOrderItemCost} from '../../../../db/database';
import {HttpError,route,validate} from '../../../../server/http/route';

const ItemCost=z.object({
  provider:z.enum(['mercadolibre','tiendanube']),
  orderId:z.string().regex(/^\d{1,20}$/),
  lineId:z.string().min(1).max(200),
  cost:z.number().min(0).max(1e9).nullable(),
});

export const POST=route({access:'manager',origin:'configured',body:z.record(z.string(),z.unknown())},async({user,body})=>{
  const {provider,orderId,lineId,cost}=validate(ItemCost,body,'invalid_cost');
  if(!await saveOrderItemCost(user.id,provider,orderId,lineId,cost)) throw new HttpError(404,'order_not_found');
  return {ok:true};
});
