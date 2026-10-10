import {NextResponse} from 'next/server';
import {createOAuthState} from '../../../../../db/database';
import {canManageRentia,getRentiaUser} from '../../../../../lib/session';
import {MELI_CALLBACK_PATH,MELI_OAUTH_COOKIE,MELI_OAUTH_SECONDS,mercadoLibreChallenge,mercadoLibreConfigured,mercadoLibreNonce,mercadoLibreOrigin,mercadoLibreRuntime,sealMercadoLibreAttempt} from '../../../../../lib/mercadolibre';

export const dynamic='force-dynamic';

export async function GET(request:Request) {
  const user=await getRentiaUser();
  if(!user) return NextResponse.redirect(new URL('/ingresar',request.url));
  if(!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  if(!mercadoLibreConfigured()) return NextResponse.json({error:'mercadolibre_not_configured',message:'La conexión de Mercado Libre todavía está en preparación.'},{status:503,headers:{'cache-control':'no-store'}});
  const origin=mercadoLibreOrigin();
  // Never redirect codes or set an OAuth cookie on a spoofed request origin.
  if(new URL(request.url).origin!==origin) return NextResponse.json({error:'invalid_origin'},{status:400});
  const state=mercadoLibreNonce(),verifier=mercadoLibreNonce();
  const cookie=await sealMercadoLibreAttempt({state,verifier,storeUserId:user.id,actorId:user.clerkUserId||user.id,expiresAt:Date.now()+MELI_OAUTH_SECONDS*1000});
  await createOAuthState(user.id,'mercadolibre',state);
  const authorize=new URL('https://auth.mercadolibre.com.ar/authorization');
  authorize.searchParams.set('response_type','code');
  authorize.searchParams.set('client_id',mercadoLibreRuntime().MELI_APP_ID!);
  authorize.searchParams.set('redirect_uri',`${origin}${MELI_CALLBACK_PATH}`);
  authorize.searchParams.set('state',state);
  authorize.searchParams.set('code_challenge',await mercadoLibreChallenge(verifier));
  authorize.searchParams.set('code_challenge_method','S256');
  const response=NextResponse.redirect(authorize);
  response.headers.set('cache-control','no-store');
  response.headers.set('referrer-policy','no-referrer');
  response.cookies.set(MELI_OAUTH_COOKIE,cookie,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:MELI_OAUTH_SECONDS});
  return response;
}
