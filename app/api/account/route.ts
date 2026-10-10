import { z } from 'zod';
import { getAccount, saveAccount } from '../../../db/database';
import { route } from '../../../server/http/route';

const AccountBody=z.object({
  name:z.string().trim().min(1),
  store:z.string().trim().min(1),
  email:z.string().trim().toLowerCase().includes('@'),
});

export const GET=route({},async({user})=>({user,account:await getAccount(user.id)}));

export const POST=route({access:'manager',body:AccountBody,invalidBody:'invalid_data'},async({user,body})=>{
  await saveAccount({userId:user.id,email:body.email,name:body.name,store:body.store});
  return {ok:true};
});
