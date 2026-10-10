import {after} from 'next/server';
import {z} from 'zod';
import {HttpError,route,validate} from '../../../../server/http/route';
import {inspectMeliOrder,MeliError} from '../../../../lib/mercadolibre-sync';

export const POST=route({access:'manager',origin:'configured',body:z.record(z.string(),z.unknown())},async({user,body})=>{
  const orderId=validate(z.string().regex(/^\d{1,20}$/),body.orderId,'invalid_order');
  try {
    const work=inspectMeliOrder(user.id,orderId);
    after(work.then(()=>undefined,()=>undefined));
    return Response.json(await work,{headers:{'cache-control':'no-store'}});
  } catch(error) {
    const code=error instanceof MeliError?error.code:'mercadolibre_review_failed';
    throw new HttpError(code==='mercadolibre_order_not_found'?404:code==='mercadolibre_import_busy'?409:502,code);
  }
});
