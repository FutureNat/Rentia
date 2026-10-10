// Workerd-only OAuth regression. All identities, credentials, token responses,
// and state storage below are synthetic; outbound network access is disabled.
import assert from 'node:assert/strict';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';

const root=process.cwd();
const origin='https://rentia.example.invalid';
const stubs=new Map([
  [path.resolve('lib/session.ts'),`export async function getRentiaUser(){return {id:'fixture-store',clerkUserId:'fixture-actor',role:'owner'};} export function canManageRentia(user){return user.role==='owner'||user.role==='admin';}`],
  [path.resolve('db/database.ts'),`export async function createOAuthState(userId,provider,state){(globalThis.fixtureStates??=new Set()).add(state);}`],
  [path.resolve('db/mercadolibre.ts'),`export async function consumeMercadoLibreState(state,userId){return globalThis.fixtureStates?.delete(state)||false;} export async function saveMercadoLibreConnection(){return true;}`],
  [path.resolve('lib/mercadolibre-sync.ts'),`export async function runMeliBackground(){}`],
]);
const output=await build({
  stdin:{resolveDir:root,sourcefile:'meli-worker-fixture.mjs',contents:`
    import {NextRequest} from './node_modules/vinext/dist/shims/server.js';
    import {createTrackedAppRouteRequest} from './node_modules/vinext/dist/server/app-route-handler-runtime.js';
    import {GET as start} from './app/api/integrations/mercadolibre/start/route.ts';
    import {GET as callback} from './app/api/integrations/mercadolibre/callback/route.ts';
    export default {async fetch(request){
      const tracked=createTrackedAppRouteRequest(request).request;
      if(new URL(request.url).pathname==='/legacy-copy'){
        try{new NextRequest(tracked);return Response.json({failed:false});}
        catch(error){return Response.json({failed:true,errorName:error.name});}
      }
      if(new URL(request.url).pathname==='/legacy-fetch'){
        try {await fetch('https://api.mercadolibre.com/oauth/token',{method:'POST',body:'synthetic-only',redirect:'error'});return Response.json({failed:false});}
        catch(error){return Response.json({failed:true,errorName:error.name,message:error.message});}
      }
      return new URL(request.url).pathname.endsWith('/start')?start(tracked):callback(tracked);
    }};
  `},
  bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',external:['node:*','cloudflare:*'],
  plugins:[{name:'synthetic-oauth-dependencies',setup(builder){
    builder.onResolve({filter:/.*/},args=>{
      if(args.path==='next/server')return {path:'fixture-next-server',namespace:'fixture'};
      if(!args.path.startsWith('.'))return;
      const resolved=path.resolve(args.resolveDir,args.path)+'.ts';
      if(stubs.has(resolved))return {path:resolved,namespace:'fixture'};
    });
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',resolveDir:root,contents:args.path==='fixture-next-server'?`export {NextRequest,NextResponse} from './node_modules/vinext/dist/shims/server.js'; export function after(){}`:stubs.get(args.path)}));
  }}],
});
const mf=new Miniflare({
  modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
  log:new Log(LogLevel.NONE),outboundService:async request=>{
    // Exercise Workerd's actual fetch/body serialization, but route every
    // outbound request to this synthetic service instead of the real API.
    assert.equal(request.url,'https://api.mercadolibre.com/oauth/token');
    assert.equal(request.method,'POST');
    assert.equal(request.headers.get('content-type'),'application/x-www-form-urlencoded');
    const body=new URLSearchParams(await request.text());
    assert.equal(body.get('code_verifier')?.length,43);
    assert.equal(body.get('client_secret'),'synthetic-only');
    assert.equal(body.get('redirect_uri'),`${origin}/api/integrations/mercadolibre/callback`);
    if(body.get('code')==='fixture-rejected')return Response.json({error:'invalid_client',error_description:'unsafe-fixture-secret-body'},{status:400});
    if(body.get('code')==='fixture-redirect')return new Response(null,{status:307,headers:{location:'https://never-follow.example.invalid/token'}});
    return Response.json({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:21600,user_id:999,scope:'read offline_access'});
  },
  bindings:{MELI_APP_ID:'12345',MELI_APP_SECRET:'synthetic-only',TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),RENTIA_PUBLIC_ORIGIN:origin},
});
try {
  const legacyFetch=await (await mf.dispatchFetch(`${origin}/legacy-fetch`)).json();
  assert.equal(legacyFetch.failed,true);
  assert.equal(legacyFetch.errorName,'TypeError');
  assert.match(legacyFetch.message,/Invalid redirect value/);
  const legacy=await mf.dispatchFetch(`${origin}/legacy-copy`);
  const legacyResult=await legacy.json();
  assert.equal(legacyResult.failed,true,'Workerd must reproduce the previous tracked-Request copy failure');
  const started=await mf.dispatchFetch(`${origin}/api/integrations/mercadolibre/start`,{redirect:'manual'});
  assert.equal(started.status,307);
  const state=new URL(started.headers.get('location')).searchParams.get('state');
  const cookie=started.headers.get('set-cookie').split(';')[0];
  const callbackUrl=`${origin}/api/integrations/mercadolibre/callback?code=fixture-code&state=${state}`;
  const complete=await mf.dispatchFetch(callbackUrl,{redirect:'manual',headers:{cookie}});
  assert.equal(complete.status,307);
  assert.match(complete.headers.get('location'),/setup=mercadolibre_import/);
  const replay=await mf.dispatchFetch(callbackUrl,{redirect:'manual',headers:{cookie}});
  assert.equal(replay.status,307);assert.match(replay.headers.get('location'),/error=mercadolibre_state/);
  const malformed=await mf.dispatchFetch(callbackUrl,{redirect:'manual',headers:{cookie:'__Host-rentia_meli_oauth=%E0%A4%A'}});
  assert.equal(malformed.status,307);assert.match(malformed.headers.get('location'),/error=mercadolibre_browser/);
  const rejectionStart=await mf.dispatchFetch(`${origin}/api/integrations/mercadolibre/start`,{redirect:'manual'});
  const rejectionState=new URL(rejectionStart.headers.get('location')).searchParams.get('state');
  const rejectionCookie=rejectionStart.headers.get('set-cookie').split(';')[0];
  const rejected=await mf.dispatchFetch(`${origin}/api/integrations/mercadolibre/callback?code=fixture-rejected&state=${rejectionState}`,{redirect:'manual',headers:{cookie:rejectionCookie}});
  assert.equal(rejected.status,307);assert.match(rejected.headers.get('location'),/error=mercadolibre_app_credentials/);
  assert.ok(!rejected.headers.get('location').includes('unsafe-fixture-secret-body'));
  const redirectStart=await mf.dispatchFetch(`${origin}/api/integrations/mercadolibre/start`,{redirect:'manual'});
  const redirectState=new URL(redirectStart.headers.get('location')).searchParams.get('state');
  const redirectCookie=redirectStart.headers.get('set-cookie').split(';')[0];
  const redirected=await mf.dispatchFetch(`${origin}/api/integrations/mercadolibre/callback?code=fixture-redirect&state=${redirectState}`,{redirect:'manual',headers:{cookie:redirectCookie}});
  assert.equal(redirected.status,307);assert.match(redirected.headers.get('location'),/error=mercadolibre_connection/);
  console.log('PASS: real Workerd reproduces both legacy Request and fetch redirect failures; native OAuth fetch/body serialization, successful callback, provider/3xx rejection without following redirects, replay and malformed cookies; no live account or outbound network.');
} finally {await mf.dispose();}
