import { NextResponse } from 'next/server';
import { getIntegrations } from '../../../db/database';
import { route } from '../../../server/http/route';

export const GET=route({},async({user})=>{
  const integrations = await getIntegrations(user.id);
  return NextResponse.json({integrations:integrations.results});
});
