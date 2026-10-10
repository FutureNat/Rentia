import {after,NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {consumeMercadoLibreState,saveMercadoLibreConnection} from '../../../../../db/mercadolibre';
import {canManageRentia,getRentiaUser} from '../../../../../lib/session';
import {encryptToken} from '../../../../../lib/token-crypto';
import {MELI_OAUTH_COOKIE,MercadoLibreExchangeError,exchangeMercadoLibreCode,mercadoLibreConfigured,mercadoLibreOrigin,mercadoLibreRuntime,readMercadoLibreAttempt} from '../../../../../lib/mercadolibre';
import {runMeliBackground} from '../../../../../lib/mercadolibre-sync';

export const dynamic='force-dynamic';

function finish(origin:string,result:string) {
  const response=NextResponse.redirect(new URL(`/panel?section=integraciones&${result}`,origin));
  response.headers.set('cache-control','no-store');
  response.headers.set('referrer-policy','no-referrer');
  response.cookies.set(MELI_OAUTH_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
  return response;
}

type OAuthFailure='state_missing'|'cookie_missing'|'cookie_invalid'|'state_mismatch'|'session_missing'|'role_revoked'|'store_changed'|'actor_changed'|'state_expired_or_used'|'connection_failed';
type ConnectionStage='token_exchange'|'token_encryption'|'connection_save'|'import_schedule';
function reject(origin:string,reason:OAuthFailure,error='mercadolibre_state',diagnostic?:{stage:ConnectionStage;category?:MercadoLibreExchangeError['category'];status?:number|null}) {
  // Only fixed diagnostic categories: never log cookies, state, codes, IDs,
  // token responses, or exception objects containing upstream credentials.
  console.warn('[mercadolibre_oauth]',{reason,...diagnostic});
  return finish(origin,`error=${error}`);
}

export async function GET(request:NextRequest) {
  if(!mercadoLibreConfigured()) return NextResponse.json({error:'mercadolibre_not_configured',message:'El retorno de Mercado Libre está publicado. Falta configurar la aplicación.'},{status:503,headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
  const origin=mercadoLibreOrigin(),url=new URL(request.url);
  if(url.origin!==origin) return NextResponse.json({error:'invalid_origin'},{status:400});
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  // The route runtime already supplies a NextRequest with decoded cookies.
  // Do not copy its tracking Proxy into a native Request: Workerd rejects that
  // Proxy's native Request brand even though the copy works under Node.
  const cookie=request.cookies.get(MELI_OAUTH_COOKIE)?.value||'';
  const attempt=await readMercadoLibreAttempt(cookie);
  if(!state) return reject(origin,'state_missing');
  if(!cookie) return reject(origin,'cookie_missing','mercadolibre_browser');
  if(!attempt) return reject(origin,'cookie_invalid','mercadolibre_browser');
  if(attempt.state!==state) return reject(origin,'state_mismatch');
  const user=await getRentiaUser();
  if(!user) return reject(origin,'session_missing','mercadolibre_session');
  if(!canManageRentia(user)) return reject(origin,'role_revoked');
  if(attempt.storeUserId!==user.id) return reject(origin,'store_changed');
  if(attempt.actorId!==(user.clerkUserId||user.id)) return reject(origin,'actor_changed');
  if(!await consumeMercadoLibreState(state,user.id)) return reject(origin,'state_expired_or_used');
  if(url.searchParams.has('error')) return finish(origin,'error=mercadolibre_denied');
  if(!code||code.length>4096) return finish(origin,'error=mercadolibre_oauth');
  let stage:ConnectionStage='token_exchange';
  try {
    const tokens=await exchangeMercadoLibreCode(code,attempt.verifier);
    stage='token_encryption';
    const encrypted=await encryptToken(JSON.stringify({version:1,accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresAt:Date.now()+tokens.expires_in*1000,sellerId:tokens.user_id}),mercadoLibreRuntime().TOKEN_ENCRYPTION_KEY!);
    stage='connection_save';
    const saved=await saveMercadoLibreConnection({userId:user.id,sellerId:tokens.user_id,encryptedToken:encrypted.encryptedToken,iv:encrypted.iv,scopes:tokens.scope});
    stage='import_schedule';
    if(saved)after(()=>runMeliBackground(user.id));
    return finish(origin,saved?'setup=mercadolibre_import':'error=mercadolibre_account_conflict');
  } catch(error) {
    if(error instanceof MercadoLibreExchangeError) {
      const messages:Partial<Record<MercadoLibreExchangeError['category'],string>>={
        invalid_client:'mercadolibre_app_credentials',invalid_grant:'mercadolibre_grant',
        invalid_scope:'mercadolibre_permissions',unauthorized_client:'mercadolibre_permissions',
        unauthorized_application:'mercadolibre_app_blocked',invalid_operator_user_id:'mercadolibre_operator',
        forbidden:'mercadolibre_access',local_rate_limited:'mercadolibre_temporary',
        timeout:'mercadolibre_temporary',network:'mercadolibre_temporary',
      };
      return reject(origin,'connection_failed',messages[error.category]||'mercadolibre_connection',{stage,category:error.category,status:error.status});
    }
    return reject(origin,'connection_failed','mercadolibre_connection',{stage});
  }
}
