import { NextResponse } from 'next/server';
import { createOAuthState } from '../../../../../db/database';
import { metaRedirectUri, metaRuntime } from '../../../../../lib/meta';
import { canManageRentia, getRentiaUser } from '../../../../../lib/session';

export async function GET(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.redirect(new URL('/ingresar',request.url));
  if (!canManageRentia(user)) return NextResponse.redirect(new URL('/panel?section=integraciones&error=forbidden',request.url));
  const runtime=metaRuntime();
  if (!runtime.META_APP_ID||!runtime.META_APP_SECRET) return NextResponse.redirect(new URL('/panel?section=integraciones&setup=meta',request.url));
  const state=crypto.randomUUID().replaceAll('-','');
  await createOAuthState(user.id,'meta',state);
  const authorize=new URL(`https://www.facebook.com/${runtime.version}/dialog/oauth`);
  authorize.searchParams.set('client_id',runtime.META_APP_ID);
  authorize.searchParams.set('redirect_uri',metaRedirectUri(request.url));
  authorize.searchParams.set('state',state);
  authorize.searchParams.set('scope','ads_read,business_management');
  authorize.searchParams.set('response_type','code');
  if (runtime.META_LOGIN_CONFIG_ID) {
    authorize.searchParams.set('config_id',runtime.META_LOGIN_CONFIG_ID);
    authorize.searchParams.set('override_default_response_type','true');
  }
  return NextResponse.redirect(authorize);
}
