import { NextResponse } from 'next/server';
import { getAccount, saveAccount } from '../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../lib/session';

export async function GET() {
  const user = await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  return NextResponse.json({user,account:await getAccount(user.id)});
}

export async function POST(request: Request) {
  const user = await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body = await request.json() as {name?:string;store?:string;email?:string};
  const email = body.email?.trim().toLowerCase();
  if (!body.name?.trim() || !body.store?.trim() || !email || !email.includes('@')) return NextResponse.json({error:'invalid_data'},{status:400});
  await saveAccount({userId:user.id,email,name:body.name.trim(),store:body.store.trim()});
  return NextResponse.json({ok:true});
}
