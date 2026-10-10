import { NextResponse } from 'next/server';
import { clearRentiaSession } from '../../../../lib/session';

export async function POST(request:Request) {
  const response = NextResponse.redirect(new URL('/',request.url),303);
  return clearRentiaSession(response);
}
