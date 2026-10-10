import { NextResponse } from 'next/server';
import { getIntegrations } from '../../../db/database';
import { getRentiaUser } from '../../../lib/session';

export async function GET() {
  const user = await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const integrations = await getIntegrations(user.id);
  return NextResponse.json({integrations:integrations.results});
}
