import type {MeliView} from './mercadolibre-status';

export type ConnectionSync={status:string;last_completed_at:string|null;last_error:string|null;webhook_status?:string;webhook_error?:string|null;last_webhook_at?:string|null;reliability?:{events:{failed:number;pending:number}}};
export type ConnectionHealthInput={loaded:boolean;integrations:Array<{provider:string;status:string}>;tiendanube:ConnectionSync|null;meta:ConnectionSync|null;metaSelected:boolean;mercadolibre:MeliView|null;tiendanubeRunning:boolean;metaRunning:boolean;meliRunning:boolean;meliError?:string};
export type ConnectionHealth={tone:'neutral'|'healthy'|'working'|'warning';label:string;detail:string;notice:null|{kind:'import'|'warning';title:string;message:string}};
const names:Record<string,string>={tiendanube:'Tiendanube',mercadolibre:'Mercado Libre',meta:'Meta Ads'};
const reviewErrors=['mercadolibre_invalid_progress','mercadolibre_dense_window','mercadolibre_resource_owner','mercadolibre_order_owner','mercadolibre_shipment_owner','mercadolibre_permission_missing'];
const fresh=(value:string|null|undefined,now:number)=>!!value&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now&&now-Date.parse(value)<30*60_000;

export function automaticSyncDue(sync:Pick<ConnectionSync,'last_completed_at'>|null|undefined,now=Date.now()) {
  const last=Date.parse(sync?.last_completed_at||'');
  return !Number.isFinite(last)||last>now||now-last>=15*60_000;
}

// A connected account alone does not prove that its data is up to date.
// Only observed provider activity/completed work can turn the global dot green.
export function connectionHealth(input:ConnectionHealthInput,now=Date.now()):ConnectionHealth {
  const neutral=(label:string,detail:string):ConnectionHealth=>({tone:'neutral',label,detail,notice:null});
  if(!input.loaded)return neutral('Comprobando conexiones…','Estamos consultando el estado de tus conexiones.');
  const integrations=input.integrations.map(row=>row.provider==='mercadolibre'&&input.mercadolibre?.connection?{...row,status:input.mercadolibre.connection.status}:row).filter(row=>names[row.provider]&&row.status!=='disconnected');
  if(!integrations.length)return neutral('Sin conexiones','Conectá un canal desde Integraciones.');
  const connected=integrations.map(row=>row.provider);
  const attention:string[]=[];
  for(const row of integrations)if(row.status!=='connected'&&!(row.provider==='mercadolibre'&&row.status==='authorized'))attention.push(names[row.provider]);
  const tn=connected.includes('tiendanube')?input.tiendanube:null;
  const meta=connected.includes('meta')?input.meta:null;
  const meli=connected.includes('mercadolibre')?input.mercadolibre:null;
  if(tn&&(tn.status==='error'||tn.last_error||tn.webhook_error||tn.reliability?.events.failed))attention.push('Tiendanube');
  if(meta&&(!input.metaSelected||meta.status==='error'||meta.last_error))attention.push('Meta Ads');
  if(meli&&(meli.connection?.status==='reauthorization_required'||reviewErrors.includes(meli.status?.last_error||'')||input.meliError))attention.push('Mercado Libre');
  if(attention.length){
    const detail=`Revisá ${[...new Set(attention)].join(', ')} en Integraciones.`;
    return {tone:'warning',label:'Revisar conexiones',detail,notice:{kind:'warning',title:'Una conexión necesita atención',message:detail}};
  }
  const initial:string[]=[];
  if(connected.includes('tiendanube')&&tn&&!tn.last_completed_at&&['running','pending'].includes(tn.status))initial.push('Tiendanube');
  if(meli?.pending&&meli.phase!=='done')initial.push('Mercado Libre');
  if(connected.includes('meta')&&meta&&!meta.last_completed_at&&(input.metaRunning||meta.status==='running'))initial.push('Meta Ads');
  const paused=!!meli&&(meli.retryAt>now||!!meli.status?.last_error);
  if(initial.length){
    const detail=paused?'El proveedor pidió una pausa. Conservamos el avance de la importación.':`Estamos incorporando el historial de ${initial.join(', ')}. Podés seguir usando Rentia.`;
    return {tone:paused?'warning':'working',label:paused?'Importación en pausa':'Importando historial…',detail,notice:{kind:'import',title:paused?'Importación inicial en pausa':'Importación inicial en curso',message:detail}};
  }
  if(paused)return {tone:'warning',label:'Actualización pendiente',detail:'Mercado Libre tiene una actualización pendiente. Consultá el avance en Integraciones.',notice:{kind:'warning',title:'Mercado Libre tiene una actualización pendiente',message:'Conservamos el historial importado. Consultá el avance y los reintentos en Integraciones.'}};
  const working=input.tiendanubeRunning||input.metaRunning||input.meliRunning||tn?.status==='running'||meta?.status==='running'||meli?.pending||(meli?.leaseExpiresAt||0)>now||!!tn?.reliability?.events.pending;
  if(working)return {tone:'working',label:'Sincronizando…',detail:`Actualizando ${connected.map(provider=>names[provider]).join(', ')}.`,notice:null};
  if(connected.includes('tiendanube')&&!tn||connected.includes('meta')&&!meta||connected.includes('mercadolibre')&&!meli)return neutral('Comprobando conexiones…','Estamos consultando el estado de tus conexiones.');
  const stale=connected.filter(provider=>provider==='tiendanube'?!fresh(tn?.last_completed_at,now)&&!fresh(tn?.last_webhook_at,now):provider==='meta'?!fresh(meta?.last_completed_at,now):!fresh(meli?.status?.last_completed_at,now));
  if(stale.length){
    const detail=`No hay una actualización reciente confirmada de ${stale.map(provider=>names[provider]).join(', ')}.`;
    // Aging alone is a normal automatic refresh, not a user-actionable fault.
    // Keep the dot neutral until completion; errors above still raise alerts.
    return neutral('Comprobando actualidad',`${detail} Se volverá a comprobar automáticamente mientras usás Rentia.`);
  }
  return {tone:'healthy',label:'Datos al día',detail:`Actualizaciones recientes confirmadas de ${connected.map(provider=>names[provider]).join(', ')}.`,notice:null};
}
