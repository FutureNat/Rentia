'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,CheckCircle2,ChevronDown,FileText,Info,RefreshCw,Search,TriangleAlert} from 'lucide-react';
import ThemedSelect from './themed-select';
import {billingCategories,billingCategory,billingErrorMessage,type BillingEntry,type BillingGroup} from '../lib/meli-billing-data';

type Report={connected:boolean;group:BillingGroup;period:string;progress:{pending:boolean;error:string|null;retryAt:number;completedAt:string|null;startedAt:string}|null;leaseExpiresAt:number;totals:{currency:string;direction:string;count:number;amountCents:number}[];entries:BillingEntry[];pagination:{page:number;total:number;pageSize:number}};
function amount(cents:number,currency:string){return new Intl.NumberFormat('es-AR',{style:'currency',currency,minimumFractionDigits:2}).format(cents/100);}
function displayDate(value:string|null){return value?new Date(value).toLocaleString('es-AR'):'No informado';}
function BillingPagination({page,total,onChange}:{page:number;total:number;onChange:(page:number)=>void}) {
  const pages=Math.max(1,Math.ceil(total/100));
  if(!total)return null;
  return <nav className="meliBillingPagination" aria-label="Páginas de cargos"><span>{(page-1)*100+1}–{Math.min(page*100,total)} de {total.toLocaleString('es-AR')} conceptos</span><div><button type="button" className="outline" disabled={page===1} onClick={()=>onChange(page-1)}>Anterior</button><span>{page} / {pages}</span><button type="button" className="outline" disabled={page===pages} onClick={()=>onChange(page+1)}>Siguiente</button></div></nav>;
}
function Entry({entry}:{entry:BillingEntry}) {
  const [open,setOpen]=useState(false);
  const category=billingCategories[billingCategory(entry.name)];
  return <article className={`meliBillingEntry ${open?'isOpen':''}`}>
    <button className="meliBillingRow" type="button" onClick={()=>setOpen(!open)} aria-expanded={open}>
      <span className="meliBillingConcept"><b>{entry.name}</b><small>{entry.code} · {category}</small></span>
      <span className={`meliBillingType ${entry.direction}`}>{entry.direction==='charge'?'Cargo':entry.direction==='credit'?'Bonificación':'Por clasificar'}</span>
      <span className="meliBillingReference">{entry.orderIds.length?`#${entry.orderIds[0]}${entry.orderIds.length>1?` + ${entry.orderIds.length-1}`:''}`:'Cargo del período'}<small>{entry.createdAt?new Date(entry.createdAt).toLocaleDateString('es-AR'):'Fecha no informada'}</small></span>
      <b className={entry.direction==='credit'?'meliBillingCredit':''}>{entry.direction==='credit'?'− ':''}{amount(entry.amountCents,entry.currency)}<small>{entry.currency}</small></b>
      <ChevronDown size={17} aria-hidden="true" style={{transform:open?'rotate(180deg)':undefined}}/>
    </button>
    {open&&<div className="meliBillingDetail"><dl>
      <div><dt>Identificador del concepto</dt><dd>{entry.id} · {entry.type}</dd></div>
      <div><dt>Documento</dt><dd>{entry.documentNumber||entry.documentId||'Aún no informado'} · {entry.documentType==='CREDIT_NOTE'?'Nota de crédito':'Factura'}</dd></div>
      <div><dt>Estado del documento</dt><dd>{entry.documentStatus||'No informado'}</dd></div>
      <div><dt>Descontado de la operación</dt><dd>{entry.debited||'No informado'}</dd></div>
      <div><dt>Órdenes relacionadas</dt><dd>{entry.orderIds.length?entry.orderIds.map(id=>`#${id}`).join(' · '):'Sin orden vinculada por Mercado Libre'}</dd></div>
      <div><dt>Operaciones relacionadas</dt><dd>{entry.operationIds.join(' · ')||'No informadas'}</dd></div>
      {entry.status&&<div><dt>Estado del cargo</dt><dd>{entry.status}</dd></div>}
      {entry.originalChargeId&&<div><dt>Cargo que bonifica</dt><dd>{entry.originalChargeId}</dd></div>}
      {entry.discountCents!==null&&<div><dt>Descuento informado · ya incluido</dt><dd>{amount(entry.discountCents,entry.currency)}{entry.discountReason?` · ${entry.discountReason}`:''}</dd></div>}
    </dl><p>Descripción e importe informados por Mercado Libre. La categoría es orientativa; el código original se conserva.</p></div>}
  </article>;
}
export default function MeliBilling({canManage,onBack}:{canManage:boolean;onBack:()=>void}) {
  const [group,setGroup]=useState<BillingGroup>('ML'),[period,setPeriod]=useState(()=>new Date().toISOString().slice(0,7)+'-01');
  const [query,setQuery]=useState(''),[page,setPage]=useState(1),[snapshot,setSnapshot]=useState<{key:string;value:Report}|null>(null),[running,setRunning]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[clock,setClock]=useState(Date.now);
  const [months]=useState(()=>Array.from({length:13},(_,index)=>{const now=new Date(),date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-index,1));return {value:date.toISOString().slice(0,10),label:date.toLocaleDateString('es-AR',{month:'long',year:'numeric',timeZone:'UTC'})};}));
  const requestKey=JSON.stringify([group,period,page,query]);
  const report=snapshot?.key===requestKey?snapshot.value:null,loading=!report;
  const lastRefresh=useRef(0);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search),initial=params.get('billing-period'),order=params.get('billing-order');
    const timer=window.setTimeout(()=>{
      if(initial&&months.some(month=>month.value===initial))setPeriod(initial);
      if(order&&/^\d+$/.test(order))setQuery(order);
    },0);
    // Deep links are consumed once; changing a filter never restores the URL.
    return()=>window.clearTimeout(timer);
  },[months]);
  useEffect(()=>{
    const controller=new AbortController();let busy=false,lastRead=0,current:Report|null=null;
    const params=new URLSearchParams({group,period,page:String(page),q:query});
    const read=async()=>{
      const response=await fetch(`/api/mercadolibre/billing?${params}`,{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error();
      current=await response.json() as Report;
      if(!controller.signal.aborted){setSnapshot({key:requestKey,value:current});setClock(Date.now());if(current.pagination.page!==page)setPage(current.pagination.page);}
      return current;
    };
    const poll=async(force=false)=>{
      if(busy||controller.signal.aborted||document.visibilityState!=='visible')return;
      if(!force&&!current?.progress?.pending&&Date.now()-lastRead<30_000)return;
      busy=true;lastRead=Date.now();
      try {
        const value=await read();
        const due=!value.progress||value.progress.pending||!value.progress.completedAt||Date.now()-Date.parse(value.progress.completedAt)>12*3600_000;
        if(canManage&&value.connected&&(force||due)&&(value.progress?.retryAt||0)<=Date.now()&&(value.leaseExpiresAt||0)<=Date.now()) {
          setRunning(true);
          const response=await fetch(`/api/mercadolibre/billing?${params}${force?'&force=1':''}`,{method:'POST',signal:controller.signal});
          if(!response.ok)throw new Error();
          await read();
        }
        if(!controller.signal.aborted)setError('');
      }catch{if(!controller.signal.aborted)setError('No pudimos consultar el desglose. Los importes guardados se conservan.');}
      finally{busy=false;if(!controller.signal.aborted)setRunning(false);}
    };
    const delay=window.setTimeout(()=>{const force=refresh>lastRefresh.current;lastRefresh.current=refresh;void poll(force);},250);
    const timer=window.setInterval(()=>void poll(),8000);
    return()=>{controller.abort();window.clearTimeout(delay);window.clearInterval(timer);};
  },[group,period,page,query,canManage,refresh,requestKey]);
  const pending=!report?.progress||report.progress.pending;
  const message=billingErrorMessage(report?.progress?.error||null);
  const currencies=[...new Set(report?.totals.map(total=>total.currency)||[])];
  const sum=(currency:string,direction:string)=>report?.totals.find(total=>total.currency===currency&&total.direction===direction)?.amountCents||0;
  const changePage=(value:number)=>setPage(value);
  const pagination=report&&<BillingPagination page={report.pagination.page} total={report.pagination.total} onChange={changePage}/>;
  return <section className="meliBillingPage">
    <button type="button" className="meliBillingBack" onClick={onBack}><ArrowLeft size={16}/> Integraciones</button>
    <header className="meliBillingHeading"><div><span className="muted">DETALLE OFICIAL · SIN CARGOS ESTIMADOS</span><h2>Cargos de Mercado Libre</h2><p>Cada concepto, su importe y sus referencias. También los que no pertenecen a una venta puntual.</p></div><span className="meliBillingMark"><img src="/brands/mercado-libre-icon.png" alt="Mercado Libre"/></span></header>
    <div className="meliBillingToolbar"><ThemedSelect label="Período de facturación" value={period} options={months} onChange={value=>{setPeriod(value);setPage(1);setError('');}}/><ThemedSelect label="Cuenta de facturación" value={group} options={[{value:'ML',label:'Mercado Libre'},{value:'MP',label:'Mercado Pago'}]} onChange={value=>{setGroup(value as BillingGroup);setPage(1);setError('');}}/><button type="button" className="outline" disabled={!canManage||Boolean(error)||loading||running||!report?.connected||(report.progress?.retryAt||0)>clock} aria-busy={running} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={17}/>{running?'Importando detalle…':'Actualizar detalle'}</button></div>
    <div className={`meliBillingStatus ${message||error?'warning':''}`} role="status">{message||error?<TriangleAlert size={19}/>:pending?<RefreshCw size={19}/>:<CheckCircle2 size={19}/>}<div><b>{error||message||(loading?'Consultando reporte…':!report?.connected?'Conectá Mercado Libre para consultar los cargos':!canManage&&!report.progress?'Un administrador debe importar el reporte':pending?'Importación por lotes · importes parciales':'Detalle importado')}</b><small>{loading?'Consultando el período seleccionado…':report?.progress?.completedAt?`Última consulta completa: ${displayDate(report.progress.completedAt)}`:report?.connected?'El avance se guarda automáticamente. No hace falta dejar esta sección abierta para terminar el lote en curso.':'La conexión se realiza desde Integraciones.'}</small></div></div>
    <div className="meliBillingExplanation"><Info size={19}/><p>Este es el detalle de facturación, no la ganancia ni el dinero depositado. No lo descontamos nuevamente de las órdenes. Las retenciones y percepciones necesitan conciliación fiscal; la ausencia de un concepto no confirma un impuesto de $0.</p></div>
    {currencies.map(currency=><div className="meliBillingTotals" key={currency}><article><span>Cargos{pending?' · parcial':''} · {currency}</span><strong>{amount(sum(currency,'charge'),currency)}</strong></article><article><span>Bonificaciones{pending?' · parcial':''} · {currency}</span><strong className="meliBillingCredit">{amount(sum(currency,'credit'),currency)}</strong></article><article><span>Neto de conceptos conocidos{pending?' · parcial':''}</span><strong>{amount(sum(currency,'charge')-sum(currency,'credit'),currency)}</strong><small>No es el saldo a pagar ni la ganancia</small></article>{report?.totals.some(total=>total.currency===currency&&total.direction==='unknown')&&<article><span>Por clasificar · no incluido en el neto</span><strong>{amount(sum(currency,'unknown'),currency)}</strong></article>}</div>)}
    <div className="meliBillingSearch"><Search size={18}/><input aria-label="Buscar concepto, código u orden" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} placeholder="Buscar concepto, código u orden"/><small>Los totales corresponden al período completo importado</small></div>
    {pagination}
    <div className="meliBillingTable"><div className="meliBillingRow meliBillingHead"><span>Concepto original</span><span>Movimiento</span><span>Referencia / fecha</span><span>Importe</span><span/></div>{report?.entries.map(entry=><Entry key={`${group}:${period}:${entry.id}`} entry={entry}/>)}{!report?.entries.length&&<div className="meliBillingEmpty"><FileText size={25}/><b>{loading?'Cargando conceptos…':query?'No hay coincidencias en el detalle importado':pending?'Todavía no hay conceptos importados':'Mercado Libre no informó conceptos para este período'}</b><p>{pending?'Los importes no se consideran cero mientras falten páginas o permisos.':'Podés elegir otro mes o consultar la cuenta de Mercado Pago.'}</p></div>}</div>
    {pagination}
    <p className="meliBillingFootnote">Se incluyen facturas y notas de crédito, sin un catálogo cerrado de códigos. Una bonificación de cargo no equivale necesariamente al reembolso de una venta.</p>
  </section>;
}
