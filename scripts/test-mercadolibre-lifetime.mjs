// Real Workerd + Vinext after(promise), with synthetic identity and I/O only.
// A detached response must not abandon the one already-running batch.
import assert from 'node:assert/strict';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel} from 'miniflare';

const root=process.cwd(),origin='https://rentia.example.invalid';
const stubs=new Map([
  [path.resolve('lib/session.ts'),`export async function getRentiaUser(){return {id:'fixture-store',role:'owner'};} export function canManageRentia(user){return user.role==='owner';}`],
  [path.resolve('lib/mercadolibre.ts'),`export function mercadoLibreConfigured(){return true;} export function mercadoLibreOrigin(){return '${origin}';}`],
  [path.resolve('lib/mercadolibre-sync.ts'),`
    export async function getMeliSyncView(){return {};}
    export async function reconcileMercadoLibre(){
      globalThis.started=(globalThis.started||0)+1;
      try{await fetch('https://fixture.example.invalid/batch');globalThis.completed=(globalThis.completed||0)+1;return {pending:false};}
      finally{globalThis.released=(globalThis.released||0)+1;}
    }
  `],
]);
const output=await build({
  stdin:{resolveDir:root,sourcefile:'meli-lifetime-fixture.mjs',contents:`
    import {runWithExecutionContext} from './node_modules/vinext/dist/shims/request-context.js';
    import {POST} from './app/api/sync/mercadolibre/route.ts';
    export default {fetch(request,env,ctx){
      let registered=0;
      return runWithExecutionContext({waitUntil(promise){registered++;ctx.waitUntil(promise);}},async()=>{
        if(new URL(request.url).pathname==='/status')return Response.json({started:globalThis.started||0,completed:globalThis.completed||0,released:globalThis.released||0});
        // Deliberately do not await the route response, representing a caller
        // that detached after POST. Only after(promise) owns the batch lifetime.
        void POST(request).catch(()=>{});
        await new Promise(resolve=>setTimeout(resolve,10));
        return Response.json({registered,completed:globalThis.completed||0},{status:202});
      });
    }};
  `},
  bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',external:['node:*','cloudflare:*'],
  plugins:[{name:'synthetic-lifetime-dependencies',setup(builder){
    builder.onResolve({filter:/.*/},args=>{
      if(args.path==='next/server')return {path:path.resolve('node_modules/vinext/dist/shims/server.js')};
      if(args.path.startsWith('.')){const resolved=path.resolve(args.resolveDir,args.path)+'.ts';if(stubs.has(resolved))return {path:resolved,namespace:'fixture'};}
    });
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:stubs.get(args.path)}));
  }}],
});
const mf=new Miniflare({modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],log:new Log(LogLevel.NONE),outboundService:async request=>{
  assert.equal(request.url,'https://fixture.example.invalid/batch');
  await new Promise(resolve=>setTimeout(resolve,150));return Response.json({synthetic:true});
}});
try{
  const detached=await mf.dispatchFetch(`${origin}/detached`,{method:'POST',headers:{origin}});
  assert.equal(detached.status,202);
  assert.deepEqual(await detached.json(),{registered:1,completed:0},'exactly one pending batch must be protected before the response detaches');
  let result;
  for(let tries=0;tries<20;tries++){
    result=await (await mf.dispatchFetch(`${origin}/status`)).json();
    if(result.completed)break;
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.deepEqual(result,{started:1,completed:1,released:1},'the protected batch must finish and release exactly once');
  console.log('PASS: real Workerd/Vinext after(promise) registers exactly one lifetime promise before a detached response; synthetic batch completes and releases once. No live network or accounts.');
}finally{await mf.dispose();}
