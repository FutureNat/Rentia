'use client';

import { useState } from 'react';
import { Check, ChevronDown, PlugZap, PackageCheck, SlidersHorizontal, Megaphone } from 'lucide-react';

type Props={connected:boolean;productCount:number;missingProductCosts:number;costsConfigured:boolean;adsConnected:boolean;canManage:boolean;onNavigate:(section:string)=>void};

export default function SetupChecklist(props:Props) {
  const steps=[
    {id:'integraciones',title:'Conectá tu tienda',description:'Importá tus ventas y productos de Tiendanube.',done:props.connected,icon:PlugZap,action:'Ver conexión'},
    {id:'costos',title:'Revisá tus productos',description:props.productCount?`${props.missingProductCosts} de ${props.productCount} variantes sin costo identificado.`:'Primero sincronizá para traer tus productos.',done:props.productCount>0&&props.missingProductCosts===0,icon:PackageCheck,action:'Ver costos'},
    {id:'configuracion',title:'Definí tus costos',description:'Revisá envío, comisiones e impuestos y guardá la configuración.',done:props.costsConfigured,icon:SlidersHorizontal,action:'Revisar configuración'},
    {id:'publicidad',title:'Sumá tu publicidad',description:'Conectá Meta y elegí la cuenta que corresponde a esta tienda.',done:props.adsConnected,icon:Megaphone,action:'Ver publicidad',optional:true},
  ];
  const complete=steps.filter(step=>step.done).length;
  const [expanded,setExpanded]=useState<boolean|null>(null);
  const open=expanded??true;
  if(complete===steps.length)return null;
  return <section className="setupChecklist" aria-label="Configuración guiada">
    <button type="button" className="setupChecklistHeading" onClick={()=>setExpanded(!open)} aria-expanded={open} aria-controls="setup-checklist-steps">
      <span className="setupProgress" style={{background:`conic-gradient(#29cfb7 ${complete/steps.length*360}deg,#213b47 0deg)`}}><span>{complete}<small>/4</small></span></span>
      <span><small>CONFIGURACIÓN GUIADA</small><strong>Completá la base de tu rentabilidad</strong><em>{`${steps.length-complete} paso${complete===3?'':'s'} pendiente${complete===3?'':'s'} · Meta es opcional`}</em></span>
      <span className="setupToggle">{open?'Ocultar':'Ver pasos'}<ChevronDown size={17} style={{transform:open?'rotate(180deg)':undefined}}/></span>
    </button>
    {open&&<div className="setupChecklistSteps" id="setup-checklist-steps">{steps.map((step,index)=><article className={step.done?'done':''} key={`${step.id}-${index}`}>
      <div><span className="setupStepIcon">{step.done?<Check size={17}/>:<step.icon size={19}/>}</span><small>{step.optional?'OPCIONAL':`PASO ${index+1}`}</small><span className="setupStepStatus">{step.done?'Listo':'Pendiente'}</span></div>
      <h3>{step.title}</h3><p>{step.description}</p>
      <button type="button" onClick={()=>props.onNavigate(step.id)}>{step.action}</button>
    </article>)}{!props.canManage&&<p className="setupReadOnly">Podés revisar los pasos; para completar cambios, pedile ayuda al propietario o a un administrador.</p>}</div>}
  </section>;
}
