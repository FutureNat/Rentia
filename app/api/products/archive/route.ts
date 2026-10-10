import {z} from 'zod';
import {setProductArchived} from '../../../../db/database';
import {HttpError,route} from '../../../../server/http/route';

const ArchiveBody=z.object({
  productId:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  archived:z.boolean(),
  confirmation:z.string(),
}).refine(body=>body.confirmation===(body.archived?'ARCHIVAR':'RESTAURAR'),{path:['confirmation']});

export const PATCH=route({access:'manager',origin:'same',body:ArchiveBody,invalidBody:'invalid_confirmation'},async({user,body})=>{
  let found:boolean;
  try { found=Boolean(await setProductArchived(user.id,body.productId,body.archived)); }
  catch { throw new HttpError(503,'unavailable'); }
  if(!found) throw new HttpError(404,'not_found');
  return {ok:true,productId:body.productId,archived:body.archived};
});
