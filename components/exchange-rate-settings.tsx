'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import ThemedSelect from './themed-select';
import ExchangeRateHistory from './exchange-rate-history';
import { adjustedRate, asRateType, rateLabels, type LiveRates, type RateSettings, type RateType } from '../lib/exchange-rates';

export const pesoQuote=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const quoteTime=(value:string|null|undefined)=>value?new Date(value).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Fecha no informada';
type QuoteResponse={settings:RateSettings;live:LiveRates};

export default function ExchangeRateSettings({onChanged,onRatesChanged}:{onChanged:()=>Promise<unknown>;onRatesChanged:()=>Promise<void>}) {
  const [saved,setSaved]=useState<RateSettings|null>(null);
  const [live,setLive]=useState<LiveRates|null>(null);
  const [rateType,setRateType]=useState<RateType>('official');
  const [manualBase,setManualBase]=useState('');
  const [adjustment,setAdjustment]=useState('0');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/finance/exchange-rate',{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('load');return response.json() as Promise<QuoteResponse>;}).then(data=>{
      if(cancelled)return;setSaved(data.settings);setLive(data.live);setRateType(asRateType(data.settings.rate_type));setManualBase(data.settings.base_rate>0?String(data.settings.base_rate):'');setAdjustment(String(data.settings.adjustment_percent||0));
    }).catch(()=>{if(!cancelled)setMessage('No pudimos cargar la cotización. Volvé a intentar.');}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[]);
  const base=rateType==='manual'?(Number(manualBase)>0?Number(manualBase):null):live?.quotes[rateType]?.sell??null;
  const draft=adjustedRate(base,Number(adjustment));
  const changed=Boolean(saved&&(rateType!==saved.rate_type||Number(adjustment)!==saved.adjustment_percent||(rateType==='manual'&&Number(manualBase)!==saved.base_rate)));
  const valid=base!==null&&Number.isFinite(Number(adjustment))&&Number(adjustment)>-100&&Number(adjustment)<=500&&draft!==null;

  async function refresh() {
    setRefreshing(true);setMessage('');
    try {
      const response=await fetch('/api/finance/exchange-rate',{cache:'no-store'});if(!response.ok)throw new Error('refresh');
      const data=await response.json() as QuoteResponse;setLive(data.live);
      if(!saved){setSaved(data.settings);setRateType(asRateType(data.settings.rate_type));setManualBase(data.settings.base_rate>0?String(data.settings.base_rate):'');setAdjustment(String(data.settings.adjustment_percent||0));}
      await onRatesChanged();
    }catch{setMessage('No pudimos actualizar la cotización. Tu configuración no cambió.');}
    finally{setRefreshing(false);}
  }
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!valid||!saved)return;
    setSaving(true);setMessage('');
    try {
      const response=await fetch('/api/finance/exchange-rate',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({rateType,baseRate:base,adjustmentPercent:Number(adjustment)})});
      if(!response.ok)throw new Error('save');
      const current=await fetch('/api/finance/exchange-rate',{cache:'no-store'});if(!current.ok)throw new Error('reload');
      const data=await current.json() as QuoteResponse;setSaved(data.settings);setLive(data.live);await Promise.all([onChanged(),onRatesChanged()]);setMessage('Cotización guardada. Los importes en USD ya usan este valor.');
    }catch{setMessage('No pudimos confirmar el guardado. Conservamos tus valores para que puedas reintentar.');}
    finally{setSaving(false);}
  }
  const stale=live?.updatedAt?Date.now()-Date.parse(live.updatedAt)>48*60*60*1000:false;
  return <section className="financePage exchangePage quotePage">
    <div className="quoteHeading"><div><span className="muted">CONVERSIÓN DE MONEDA</span><h2>Cotización del dólar</h2><p>La referencia que usa Rentia para mostrar tus importes en USD.</p></div><button type="button" className="quoteRefresh" onClick={refresh} disabled={refreshing||loading||saving}><RefreshCw size={16} className={refreshing?'spinning':''}/>{refreshing?'Actualizando…':'Actualizar cotización'}</button></div>
    <div className="quoteTopGrid">
      <form className="quoteConfiguration" onSubmit={save}><h3>Tu configuración</h3><fieldset disabled={loading||saving||!saved}>
        <ThemedSelect label="Tipo de cotización" value={rateType} disabled={loading||saving||!saved} onChange={value=>setRateType(asRateType(value))} options={[{value:'official',label:'Oficial',description:'Precio de venta · actualización automática'},{value:'blue',label:'Blue',description:'Precio de venta · actualización automática'},{value:'mep',label:'MEP',description:'Dólar bolsa · actualización automática'},{value:'manual',label:'Manual',description:'Usar un precio definido por vos'}]}/>
        <div className="quoteInputPair"><label htmlFor="quote-base">{rateType==='manual'?'Precio manual':'Precio base de la API'}<div className="quoteInput"><span>ARS</span><input id="quote-base" type="number" min="0.01" step="0.01" inputMode="decimal" readOnly={rateType!=='manual'} required={rateType==='manual'} value={rateType==='manual'?manualBase:base??''} placeholder={loading?'Cargando…':'No disponible'} onChange={event=>setManualBase(event.target.value)}/></div></label><label htmlFor="quote-adjustment">Ajuste personalizado<div className="quoteInput"><input id="quote-adjustment" type="number" min="-99.99" max="500" step="0.01" inputMode="decimal" value={adjustment} onChange={event=>setAdjustment(event.target.value)}/><span>%</span></div></label></div>
        <div className="quoteDraft"><span>{changed?'Al guardar se aplicará':'Cotización con tu ajuste'}</span><b>{pesoQuote(draft)} <small>por USD</small></b></div>
        <div className="quoteSave"><small>{changed?'Tenés cambios sin guardar.':'La referencia automática se actualiza sin cambiar tu ajuste.'}</small><button type="submit" className="button" disabled={!valid||saving}>{saving?'Guardando…':'Guardar cotización'}</button></div>
      </fieldset></form>
      <article className="quoteCurrent"><span className="quoteEyebrow">RENTIA ESTÁ USANDO</span><span className={`quoteStatus ${live?.status==='fallback'||live?.status==='cached'||stale?'warning':''}`}>{loading?'Consultando…':!live||live.status==='unavailable'?'No disponible':live.status==='manual'?'Manual':live.status==='fallback'?'Respaldo guardado':live.status==='cached'?'Última consulta disponible':stale?'Cotización sin actualizar':'Automática'}</span><h3>{pesoQuote(live?.effectiveRate)}</h3><p>Pesos argentinos por 1 USD</p>
        <dl><div><dt>Referencia</dt><dd>{live?rateLabels[live.rateType]:'—'}</dd></div><div><dt>Base sin ajuste</dt><dd>{pesoQuote(live?.baseRate)}</dd></div><div><dt>Ajuste guardado</dt><dd>{live?`${new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(live.adjustmentPercent)}%`:'—'}</dd></div><div><dt>Fuente</dt><dd>{live?.source||'—'}</dd></div><div><dt>Actualización de la fuente</dt><dd>{quoteTime(live?.updatedAt)}</dd></div></dl>
        {(live?.status==='fallback'||live?.status==='cached'||stale)&&<small className="quoteWarning">La fuente no tiene un valor más reciente. Revisá la fecha antes de usar esta referencia.</small>}
      </article>
    </div>
    {message&&<p className="quoteFeedback" role="status">{message}</p>}
    {!loading&&saved&&<ExchangeRateHistory rateType={rateType} quote={live?.quotes[rateType]} refreshKey={live?.fetchedAt||''}/>}
  </section>;
}
