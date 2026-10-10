// Pure UI-state regressions. No network, credentials, stores or persistent data.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const output=ts.transpileModule(fs.readFileSync('lib/connection-health.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleValue={exports:{}};
vm.runInNewContext(output,{module:moduleValue,exports:moduleValue.exports,Date,Set});
const {connectionHealth,automaticSyncDue}=moduleValue.exports;
const now=Date.parse('2026-10-06T19:00:00Z');
const sync={status:'complete',last_completed_at:new Date(now-60000).toISOString(),last_error:null,webhook_status:'active',webhook_error:null};
const meli={available:true,connection:{status:'connected',sellerId:'fixture'},phase:'done',pending:false,retryAt:0,leaseExpiresAt:0,orders:25,products:7,pendingEvents:0,status:sync};
const input={loaded:true,integrations:['tiendanube','mercadolibre','meta'].map(provider=>({provider,status:'connected'})),tiendanube:sync,meta:sync,metaSelected:true,mercadolibre:meli,tiendanubeRunning:false,metaRunning:false,meliRunning:false};
let checks=0;
const check=(value,tone,label,notice)=>{const state=connectionHealth(value,now);assert.equal(state.tone,tone);assert.equal(state.label,label);assert.equal(state.notice?.kind||null,notice);checks++;return state;};
check(input,'healthy','Datos al día',null);
check({...input,loaded:false},'neutral','Comprobando conexiones…',null);
check({...input,integrations:[]},'neutral','Sin conexiones',null);
for(const provider of ['tiendanube','meta','mercadolibre']) {
  const value=provider==='mercadolibre'?{...meli,status:{...sync,last_completed_at:new Date(now-31*60000).toISOString()}}:{...sync,last_completed_at:new Date(now-31*60000).toISOString()};
  check({...input,[provider]:value},'neutral','Comprobando actualidad',null);
}
check({...input,meta:null},'neutral','Comprobando conexiones…',null);
check({...input,mercadolibre:null},'neutral','Comprobando conexiones…',null);
check({...input,metaSelected:false},'warning','Revisar conexiones','warning');
check({...input,meta:{...sync,status:'error',last_error:'private provider detail'}},'warning','Revisar conexiones','warning');
check({...input,tiendanube:{...sync,reliability:{events:{failed:1,pending:0}}}},'warning','Revisar conexiones','warning');
check({...input,mercadolibre:{...meli,connection:{status:'reauthorization_required',sellerId:'fixture'}}},'warning','Revisar conexiones','warning');
for(const running of [false,true])check({...input,meliRunning:running,mercadolibre:{...meli,phase:'orders',pending:true,connection:{status:'authorized',sellerId:'fixture'}}},'working','Importando historial…','import');
check({...input,integrations:[{provider:'mercadolibre',status:'authorized'}],mercadolibre:{...meli,phase:'orders',pending:true,connection:{status:'authorized',sellerId:'fixture'}}},'working','Importando historial…','import');
check({...input,mercadolibre:{...meli,phase:'orders',pending:true,retryAt:now+60000}},'warning','Importación en pausa','import');
check({...input,meliRunning:true},'working','Sincronizando…',null);
check({...input,tiendanubeRunning:true},'working','Sincronizando…',null);
check({...input,metaRunning:true},'working','Sincronizando…',null);
check({...input,mercadolibre:{...meli,pending:true,pendingEvents:1}},'working','Sincronizando…',null);
check({...input,integrations:[{provider:'mercadolibre',status:'authorized'}]},'healthy','Datos al día',null);
const warning=connectionHealth({...input,tiendanube:{...sync,last_error:'private provider detail'}},now);
assert.ok(!JSON.stringify(warning).includes('private provider detail'));checks++;
const panel=fs.readFileSync('app/panel/page.tsx','utf8');assert.ok(!panel.includes('className="connectedNotice"'));checks++;
for(const [age,due] of [[14*60000,false],[15*60000,true],[60*60000,true]]){assert.equal(automaticSyncDue({last_completed_at:new Date(now-age).toISOString()},now),due);checks++;}
for(const value of [null,{last_completed_at:null},{last_completed_at:'invalid'},{last_completed_at:new Date(now+1000).toISOString()}]){assert.equal(automaticSyncDue(value,now),true);checks++;}
assert.ok(panel.includes('automaticSyncDue(current?.sync)')&&panel.includes('automaticSyncDue(latestDashboard.current?.sync)'));checks++;
assert.ok(panel.includes('automaticSyncDue(currentAds.sync)')&&panel.includes('automaticSyncDue(latestAds.current.sync)'));checks++;
console.log(JSON.stringify({passed:checks,areas:['Todas las conexiones, no solo Tiendanube','Sin verde para datos atrasados o desconocidos','Importación estable y pausa','Actualizaciones normales sin banner','Errores sin detalles privados','Sin franja de conexión en el dashboard']}));
