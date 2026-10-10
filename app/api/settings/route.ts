import { z } from 'zod';
import { getAccount, getSettings, saveChannels, saveCostSettings } from '../../../db/database';
import { HttpError, route, validate } from '../../../server/http/route';

const emptyToNull=(value:unknown)=>value===''||value===null||value===undefined?null:value;
const percent=z.coerce.number().min(0).max(100);

const ChannelsBody=z.object({channels:z.array(z.enum(['tiendanube','mercadolibre']))});

const CostsBody=z.object({
  shipping:z.coerce.number().min(0).transform(Math.round),
  shippingMode:z.enum(['actual','average_only']).catch('actual'),
  fees:percent,
  taxes:percent,
  pagoNubePayoutDays:z.preprocess(value=>{const raw=emptyToNull(value);return raw===null?null:Number(raw);},z.union([z.literal(1),z.literal(7),z.literal(14)]).nullable()),
  pagoNubePlan:z.preprocess(emptyToNull,z.enum(['inicial','esencial','impulso','escala']).nullable()),
});

export const GET=route({},async({user})=>({settings:await getSettings(user.id)}));

export const POST=route({access:'manager',body:z.object({type:z.string()}).loose(),invalidBody:'invalid_type'},async({user,body})=>{
  if (!await getAccount(user.id)) throw new HttpError(409,'account_required');
  if (body.type==='channels') await saveChannels(user.id,validate(ChannelsBody,body,'invalid_channels').channels);
  else if (body.type==='costs') await saveCostSettings(user.id,validate(CostsBody,body,'invalid_costs'));
  else throw new HttpError(400,'invalid_type');
  return {ok:true};
});
