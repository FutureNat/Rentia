'use client';

import { useId, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowRight, BarChart3, Check, ChevronDown, Clock3, HelpCircle, ShieldCheck, ShoppingBag, Sparkles, UsersRound } from 'lucide-react';
import { planQuote, type RentiaPlan } from '../lib/plans';

type Props={
  plans:RentiaPlan[];
  initialPlanId?:string;
  recommendedPlanId?:string;
  usageOrders?:number;
  annual:boolean;
  onAnnualChange:(annual:boolean)=>void;
  onChoose?:(planId:string)=>void;
  currentPlanId?:string;
  requestedPlanId?:string|null;
  requestedBillingCycle?:string;
  savingPlanId?:string|null;
  canManage?:boolean;
  publicPricing?:boolean;
};

const formatNumber=(value:number)=>new Intl.NumberFormat('es-AR',{minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
const capacity=(plan:RentiaPlan)=>plan.orders===null?'Más de 10.000':`Hasta ${formatNumber(plan.orders)}`;

export default function PlanConfigurator({plans,initialPlanId='growth',recommendedPlanId,usageOrders,annual,onAnnualChange,onChoose,currentPlanId,requestedPlanId,requestedBillingCycle,savingPlanId,canManage=true,publicPricing=false}:Props) {
  const initialIndex=Math.max(0,plans.findIndex(plan=>plan.id===initialPlanId));
  const [sliderPosition,setSliderPosition]=useState(initialIndex);
  const [dragging,setDragging]=useState(false);
  const selectedIndex=Math.min(Math.round(sliderPosition),plans.length-1);
  const selectPlan=(index:number)=>setSliderPosition(Math.max(0,Math.min(index,plans.length-1)));
  const finishDrag=(event:PointerEvent<HTMLInputElement>)=>{
    setDragging(false);
    selectPlan(Math.round(Number(event.currentTarget.value)));
  };
  const handleSliderKey=(event:KeyboardEvent<HTMLInputElement>)=>{
    const next=event.key==='Home'?0:event.key==='End'?plans.length-1:
      ['ArrowRight','ArrowUp','PageUp'].includes(event.key)?selectedIndex+1:
      ['ArrowLeft','ArrowDown','PageDown'].includes(event.key)?selectedIndex-1:null;
    if(next===null)return;
    event.preventDefault();
    selectPlan(next);
  };
  const sliderId=useId(),detailsId=useId();
  const plan=plans[Math.min(selectedIndex,plans.length-1)];
  if (!plan) return null;
  const progress=plans.length>1?sliderPosition/(plans.length-1)*100:0;
  const quote=planQuote(plan,annual);
  const saved=requestedPlanId===plan.id&&requestedBillingCycle===(annual?'annual':'monthly');
  const current=currentPlanId===plan.id;
  const recommended=recommendedPlanId===plan.id;
  const locked=!canManage||Boolean(savingPlanId)||saved||current||plan.id==='free';
  const actionLabel=savingPlanId===plan.id?'Guardando…':saved?'Preferencia guardada':current?'Tu plan actual':plan.id==='free'?'Disponible sin cargo':plan.id==='enterprise'?'Registrar interés':`Reservar ${plan.name}`;

  return <div className="rentiaPlanBuilder">
    <div className="rentiaPlanBuilderIntro"><div><span className="rentiaPlanEyebrow"><Sparkles size={15} aria-hidden="true"/> UN PLAN A TU MEDIDA</span><h3>Tu tienda crece. Tu plan la acompaña.</h3><p>Mové la barra para explorar el precio y todo lo que incluye cada nivel.</p></div><div className="rentiaPlanCycle" role="group" aria-label="Frecuencia de facturación"><button type="button" aria-pressed={!annual} onClick={()=>onAnnualChange(false)}>Mensual</button><button type="button" aria-pressed={annual} onClick={()=>onAnnualChange(true)}>Anual <span>2 meses gratis</span></button></div></div>

    <div className="rentiaPlanVolume">
      <div className="rentiaPlanVolumeHeading"><div><label htmlFor={sliderId}>¿Cuántas órdenes tiene tu tienda por mes?</label><p>Elegí el nivel que cubre tu volumen de ventas.</p></div><output htmlFor={sliderId} className="rentiaPlanVolumeValue"><strong key={plan.id} className="rentiaPlanChangingValue">{capacity(plan)}</strong><span>órdenes / mes</span></output></div>
      <div className="rentiaPlanRange" data-dragging={dragging} style={{'--plan-progress':`${progress}%`} as CSSProperties}>
        <div className="rentiaPlanTrack" aria-hidden="true"><i/>{plans.map((item,index)=><span key={item.id} className={index<=selectedIndex?'passed':''} style={{left:`${plans.length>1?index/(plans.length-1)*100:0}%`}}/>)}<b className="rentiaPlanThumb"/></div>
        <input id={sliderId} aria-label="Volumen mensual de órdenes" aria-valuetext={`${capacity(plan)} órdenes por mes. Plan ${plan.name}. ${quote.monthlyEquivalent===null?'Precio a medida':`USD ${formatNumber(quote.monthlyEquivalent)} por mes`}.`} aria-describedby={detailsId} type="range" min={0} max={Math.max(0,plans.length-1)} step={0.01} value={sliderPosition} onChange={event=>setSliderPosition(Number(event.target.value))} onKeyDown={handleSliderKey} onPointerDown={event=>{setDragging(true);event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}/>
      </div>
      <div className="rentiaPlanStops">{plans.map((item,index)=><button type="button" key={item.id} aria-label={`${item.name}: ${capacity(item)} órdenes por mes`} aria-pressed={index===selectedIndex} onClick={()=>selectPlan(index)}><b>{item.orders===null?'+10.000':formatNumber(item.orders)}</b><span>{item.name}</span></button>)}</div>
      {usageOrders!==undefined&&<div className="rentiaPlanUsageHint"><BarChart3 size={16} aria-hidden="true"/><span>Tu tienda tuvo <b>{formatNumber(usageOrders)} órdenes</b> en los últimos 30 días.</span><button type="button" onClick={()=>selectPlan(Math.max(0,plans.findIndex(item=>item.id===recommendedPlanId)))}>Ver mi recomendado <ArrowRight size={13} aria-hidden="true"/></button></div>}
    </div>

    <div className="rentiaPlanResult" id={detailsId}>
      <div className="rentiaPlanOffer">
        <div className="rentiaPlanOfferTop"><span className="rentiaPlanEyebrow">{plan.id==='enterprise'?'PARA GRANDES OPERACIONES':plan.id==='free'?'TU PRIMER PASO':'PLAN RENTIA'}</span>{recommended?<span className="rentiaPlanBadge">Ideal para tu volumen</span>:current?<span className="rentiaPlanBadge">Plan actual</span>:null}</div>
        <h4 key={plan.id} className="rentiaPlanChangingValue">{plan.name}</h4><p>{plan.description}</p>
        <div className="rentiaPlanAmount" aria-live="polite" aria-atomic="true">{quote.monthlyEquivalent===null?<strong key={plan.id} className="rentiaPlanChangingValue">A medida</strong>:<><span>USD</span><strong key={`${plan.id}-${annual}`} className="rentiaPlanChangingValue">{formatNumber(quote.monthlyEquivalent)}</strong><small>/ mes</small></>}</div>
        <div className="rentiaPlanBillingDetail">{quote.monthlyEquivalent===null?'Una propuesta pensada para tu operación.':quote.total===0?'Sin costo. Sin tarjeta.':annual?<>USD {formatNumber(quote.total!)} facturados al año <span>Ahorrás USD {formatNumber(quote.savings)}</span></>:'Facturación mensual. Precio expresado en USD.'}</div>
        {publicPricing?<a className="rentiaPlanPrimaryAction" href={`/registro?plan=${plan.id}&billing=${annual?'annual':'monthly'}`}>{plan.id==='free'?'Empezar gratis':plan.id==='enterprise'?'Consultar por Enterprise':'Probar 14 días'}<ArrowRight size={17} aria-hidden="true"/></a>:<button type="button" className="rentiaPlanPrimaryAction" disabled={locked} onClick={()=>onChoose?.(plan.id)}>{actionLabel}{!locked&&<ArrowRight size={17} aria-hidden="true"/>}</button>}
        <p className="rentiaPlanActionNote"><ShieldCheck size={14} aria-hidden="true"/>{publicPricing?'14 días de prueba. No pedimos tarjeta.':!canManage?'Solo un administrador puede guardar el plan.':saved?'Esta preferencia no generó ningún cobro.':current?'La simulación no modifica tu suscripción.':'Solo guardamos tu preferencia. No se cobra todavía.'}</p>
      </div>

      <div className="rentiaPlanBenefits">
        <div className="rentiaPlanBenefitsTitle"><span className="rentiaPlanEyebrow">INCLUIDO EN {plan.name.toUpperCase()}</span><h4>Todo claro, desde el primer día.</h4></div>
        <div className="rentiaPlanBenefitStats"><div><ShoppingBag aria-hidden="true"/><strong key={plan.id} className="rentiaPlanChangingValue">{plan.orders===null?'+10.000':formatNumber(plan.orders)}</strong><span>órdenes por mes</span></div><div><UsersRound aria-hidden="true"/><strong key={plan.id} className="rentiaPlanChangingValue">{plan.users===null?'A medida':plan.users}</strong><span>{plan.users===1?'usuario incluido':'usuarios incluidos'}</span></div><div><Clock3 aria-hidden="true"/><strong key={plan.id} className="rentiaPlanChangingValue">{plan.history}</strong><span>de historial inicial</span></div></div>
        <p className="rentiaTeamSeatNote">El cupo incluye al propietario. Cada invitación pendiente reserva un lugar hasta que se acepta, vence o se cancela.</p>
        <ul className="rentiaPlanFeatureList"><li><Check aria-hidden="true"/><span>Dashboard de ventas y rentabilidad</span></li><li><Check aria-hidden="true"/><span>Costos de productos, envíos y comisiones</span></li><li><Check aria-hidden="true"/><span>Órdenes, productos e inventario</span></li><li><Check aria-hidden="true"/><span>Conexiones disponibles: Tiendanube, Mercado Libre y Meta Ads</span></li><li><Check aria-hidden="true"/><span>Informes y comparación entre períodos</span></li><li><Check aria-hidden="true"/><span>Soporte <b>{plan.support.toLowerCase()}</b></span></li></ul>
        <p className="rentiaPlanFeatureNote"><HelpCircle size={15} aria-hidden="true"/>Todos los planes importan hasta 12 meses por canal, según los datos disponibles. El historial guardado se conserva y sigue creciendo. Cambian las órdenes, el equipo y el soporte.</p>
      </div>
    </div>

    <details className="rentiaPlanComparison"><summary>Comparar todos los planes <ChevronDown size={17} aria-hidden="true"/></summary><div className="rentiaPlanTableScroll" tabIndex={0} role="region" aria-label="Comparación de planes, desplazable horizontalmente"><table><caption>Capacidad y precio de cada plan</caption><thead><tr><th scope="col">Tu plan incluye</th>{plans.map(item=><th key={item.id} scope="col" data-selected={item.id===plan.id}>{item.name}</th>)}</tr></thead><tbody><tr><th scope="row">Precio mensual {annual&&<small>equivalente anual</small>}</th>{plans.map(item=>{const price=planQuote(item,annual).monthlyEquivalent;return <td key={item.id} data-selected={item.id===plan.id}>{price===null?'A medida':`USD ${formatNumber(price)}`}</td>;})}</tr><tr><th scope="row">Órdenes / mes</th>{plans.map(item=><td key={item.id} data-selected={item.id===plan.id}>{item.orders===null?'+10.000':formatNumber(item.orders)}</td>)}</tr><tr><th scope="row">Usuarios</th>{plans.map(item=><td key={item.id} data-selected={item.id===plan.id}>{item.users??'A medida'}</td>)}</tr><tr><th scope="row">Historial inicial</th>{plans.map(item=><td key={item.id} data-selected={item.id===plan.id}>{item.history}</td>)}</tr><tr><th scope="row">Soporte</th>{plans.map(item=><td key={item.id} data-selected={item.id===plan.id}>{item.support}</td>)}</tr></tbody></table></div><p>El importe anual se muestra completo en la tarjeta del plan. La barra es una simulación: no cambia tu cuenta ni genera cargos.</p></details>
  </div>;
}
