'use client';
import {useState,type FormEvent} from 'react';
import type {MeliPostSale} from '../lib/meli-post-sale';
import type {RefundAdjustment} from '../lib/refund-adjustment';

export function RefundAdjustmentEditor({orderId,currency,value,loss,canManage,onRefresh}:{orderId:string;currency:string;value?:RefundAdjustment|null;loss?:number|null;canManage:boolean;onRefresh:()=>Promise<unknown>}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[message,setMessage]=useState('');
  const [amounts,setAmounts]=useState({shipping:String(value?.shipping??0),fees:String(value?.fees??0),taxes:String(value?.taxes??0),extra:String(value?.extra??0)});
  async function submit(event:FormEvent){event.preventDefault();const numbers=Object.fromEntries(Object.entries(amounts).map(([k,v])=>[k,Number(v.replace(',','.'))]));if(!confirmed||Object.values(amounts).some(v=>!v.trim())||Object.values(numbers).some(v=>!Number.isFinite(v)||v<0||v>1e9)){setMessage('Confirmá el reembolso total e ingresá importes válidos.');return;}await save({version:1,kind:'full_keep_product',...numbers});}
  async function save(adjustment:unknown){setBusy(true);setMessage('');try{const response=await fetch('/api/orders/refund-adjustment',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,adjustment,confirm:true})});if(!response.ok)throw new Error();await onRefresh();setOpen(false);setConfirmed(false);setMessage(adjustment?'Ajuste guardado. El costo del producto no recuperado se descuenta de la ganancia.':'Ajuste retirado; el reembolso vuelve a quedar por conciliar.');}catch{setMessage('No pudimos guardar el ajuste. La orden debe tener un reembolso total confirmado.');}finally{setBusy(false);}}
  return <section className="orderPostSale refundEditor"><h4>Reembolso total · cliente conserva el producto</h4><p>Registro contable en Rentia. No devuelve dinero ni modifica Mercado Libre. La venta ya está excluida de la facturación; descontamos el costo del producto perdido y solo los cargos que no te reintegraron.</p>{value&&<p><b>Ajuste manual confirmado</b> · {new Date(value.confirmedAt).toLocaleDateString('es-AR')}<br/>{loss==null?'Falta el costo del producto para calcular la pérdida.':`Pérdida registrada: ${new Intl.NumberFormat('es-AR',{style:'currency',currency}).format(loss)}`}</p>}{canManage&&<button className="outline" type="button" onClick={()=>setOpen(!open)} disabled={busy}>{value?'Revisar ajuste':'Registrar este caso'}</button>}{open&&<form onSubmit={submit}><div className="refundFields">{([['shipping','Envío no reintegrado'],['fees','Comisiones no reintegradas'],['taxes','Impuestos no reintegrados'],['extra','Otros cargos retenidos']] as const).map(([key,label])=><label key={key}>{label} ({currency})<input inputMode="decimal" value={amounts[key]} onChange={e=>setAmounts({...amounts,[key]:e.target.value})}/></label>)}</div><p>Si Mercado Libre te reintegró todos los cargos, dejá estos importes en 0. El producto no recuperado conserva su costo.</p><label className="refundConfirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirmo que devolví el total del dinero, el cliente conservó el producto y revisé los cargos retenidos.</label><div className="refundActions"><button className="button" disabled={busy||!confirmed}>{busy?'Guardando…':'Confirmar ajuste'}</button>{value&&<button className="outline" type="button" disabled={busy} onClick={()=>{if(window.confirm('¿Retirar este ajuste? El reembolso volverá a quedar pendiente de conciliación.'))void save(null);}}>Retirar ajuste</button>}</div></form>}{message&&<p role="status">{message}</p>}</section>;
}

export function OrderItemCost({provider,orderId,lineId,currency,cost,manual,onRefresh}:{provider:string;orderId:string;lineId:string;currency:string;cost:number;manual:boolean;onRefresh:()=>Promise<unknown>}) {
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(String(cost||'')),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function save(event:FormEvent) {
    event.preventDefault();const value=Number(draft.replace(',','.'));
    if(!draft.trim()||!Number.isFinite(value)||value<0||value>1e9){setMessage('Ingresá el costo por unidad.');return;}
    await submit(value);
  }
  async function submit(value:number|null) {
    setBusy(true);setMessage('');
    try {const response=await fetch('/api/orders/item-cost',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider,orderId,lineId,cost:value})});if(!response.ok)throw new Error();await onRefresh();setMessage(value===null?'Se restauró el costo del catálogo.':'Costo guardado para esta venta.');setOpen(false);}catch{setMessage('No pudimos guardar el costo. Tu importe se conserva.');}finally{setBusy(false);}
  }
  return <section className="orderCostEditor"><button className="outline" type="button" onClick={()=>setOpen(!open)} disabled={busy}>{cost>0?'Ajustar costo de esta venta':'Asignar costo de producto'}</button>{open&&<form onSubmit={save}><label>Costo por unidad ({currency})<input value={draft} onChange={event=>setDraft(event.target.value)} inputMode="decimal" placeholder="Costo real por unidad"/></label><p>Solo afecta esta venta histórica, no el catálogo ni la publicación en Mercado Libre. Se conserva al sincronizar.</p><div><button className="outline" disabled={busy}>{busy?'Guardando…':'Guardar costo'}</button>{manual&&<button className="outline" type="button" disabled={busy} onClick={()=>void submit(null)}>Usar costo del catálogo</button>}</div></form>}{message&&<p role="status">{message}</p>}</section>;
}

export function MeliOrderReview({orderId,currency,postSale,canManage,onRefresh}:{orderId:string;currency:string;postSale:MeliPostSale|null|undefined;canManage:boolean;onRefresh:()=>Promise<unknown>}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function review() {
    setBusy(true);setMessage('');
    try {const response=await fetch('/api/orders/mercadolibre-review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId})});const data=await response.json() as {error?:string;postSale?:MeliPostSale};if(!response.ok){setMessage(data.error==='mercadolibre_import_busy'?'Hay una sincronización en curso. Esperá unos segundos y volvé a consultar.':'No pudimos completar la consulta. Intentá nuevamente más tarde.');return;}await onRefresh();setMessage(data.postSale?.claimsError?'Se actualizaron los pagos, pero Mercado Libre no permitió consultar los reclamos. Revisá los permisos de la aplicación.':'Pagos y reclamos consultados. Rentia no realiza devoluciones de dinero.');}catch{setMessage('No pudimos completar la consulta.');}finally{setBusy(false);}
  }
  const refund=postSale&&postSale.refundStatus!=='none';
  return <section className="orderPostSale" id={`meli-review-${orderId}`} aria-labelledby={`meli-review-title-${orderId}`}>
    <h4 id={`meli-review-title-${orderId}`}>Reclamos y reembolsos</h4>
    <p>El reclamo y la devolución se gestionan en Mercado Libre. Acá consultamos sus estados y los pagos para actualizar Rentia; no se cargan como un costo de producto.</p>
    {refund&&<p><b>{postSale.refundStatus==='partial'?'Reembolso parcial':postSale.refundStatus==='charged_back'?'Contracargo':postSale.refundStatus==='reported'?'Reembolso informado por resolución':'Reembolso informado por el pago'}</b><br/>{postSale.refundAmount===null?'Mercado Libre no informó el importe exacto. Volvé a consultar para buscar una actualización.':`Importe informado: ${new Intl.NumberFormat('es-AR',{style:'currency',currency}).format(postSale.refundAmount)}`}</p>}
    {postSale?.claims.length?<ul>{postSale.claims.map(claim=><li key={claim.id}>Reclamo #{claim.id} · {claim.status==='opened'?'Abierto':claim.status==='closed'?'Cerrado':claim.status}{claim.resolution&&<small>Resolución: {claim.resolution}</small>}</li>)}</ul>:<p>{postSale?.claimsChecked?'Sin reclamos vinculados informados.':'Los reclamos aún no se consultaron para esta orden.'}</p>}
    {canManage?<button className="outline" type="button" onClick={()=>void review()} disabled={busy}>{busy?'Consultando Mercado Libre…':'Consultar Mercado Libre'}</button>:<p>Un propietario o administrador puede actualizar esta consulta.</p>}
    <p>La consulta no devuelve dinero ni modifica el reclamo. Un reclamo abierto no confirma un reembolso. Si faltan el importe, los cargos reintegrados o la devolución del producto, el resultado sigue por conciliar.</p>
    {postSale?.claimsError&&<p role="status">No se pudo confirmar el estado de los reclamos con los permisos actuales.</p>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
