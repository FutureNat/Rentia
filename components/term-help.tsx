'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function TermHelp({term,meaning,example}:{term:string;meaning:string;example:string}) {
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState<{left:number;top:number;maxHeight:number}|null>(null);
  const trigger=useRef<HTMLSpanElement>(null);
  const popover=useRef<HTMLDivElement>(null);
  const pinned=useRef(false);
  const id=useId();
  function close() { pinned.current=false;setOpen(false);setPosition(null); }
  function toggle() { pinned.current=!pinned.current;setOpen(pinned.current); }

  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      if(!trigger.current||!popover.current)return;
      const anchor=trigger.current.getBoundingClientRect();
      const bubble=popover.current.getBoundingClientRect();
      const headers=Array.from(document.querySelectorAll('.panelToolbar, .rentiaLanding .nav'));
      const header=Math.max(0,...headers.map(element=>{
        const mode=getComputedStyle(element).position;
        const bounds=element.getBoundingClientRect();
        return (mode==='sticky'||mode==='fixed')&&bounds.top<window.innerHeight&&bounds.bottom>0?bounds.bottom:0;
      }));
      const minTop=Math.max(12,header+10);
      const maxHeight=Math.max(1,window.innerHeight-minTop-12);
      const height=Math.min(bubble.height,maxHeight);
      const left=Math.max(12,Math.min(anchor.left+anchor.width/2-bubble.width/2,window.innerWidth-bubble.width-12));
      const above=anchor.top-height-10;
      const top=above>=minTop?above:Math.max(minTop,Math.min(anchor.bottom+10,window.innerHeight-height-12));
      setPosition({left,top,maxHeight});
    };
    const outside=(event:PointerEvent)=>{if(!trigger.current?.contains(event.target as Node)&&!popover.current?.contains(event.target as Node))close();};
    const scroll=(event:Event)=>{if(!popover.current?.contains(event.target as Node))close();};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    place();
    const observer=new ResizeObserver(place);
    if(popover.current)observer.observe(popover.current);
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    window.addEventListener('resize',place);
    window.addEventListener('scroll',scroll,true);
    return ()=>{
      observer.disconnect();
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',escape);
      window.removeEventListener('resize',place);
      window.removeEventListener('scroll',scroll,true);
    };
  },[open]);

  return <>
    <span ref={trigger} className={`termHelpTrigger ${open?'open':''}`} role="button" tabIndex={0} aria-label={`¿Qué significa ${term}?`} aria-expanded={open} aria-describedby={open?id:undefined}
      onPointerEnter={event=>{if(event.pointerType==='mouse')setOpen(true);}}
      onPointerLeave={()=>{if(!pinned.current)setOpen(false);}}
      onFocus={()=>setOpen(true)} onBlur={()=>{if(!pinned.current)setOpen(false);}}
      onClick={event=>{event.preventDefault();event.stopPropagation();toggle();}}
      onKeyDown={event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();toggle();}
        else if(event.key==='Escape'){event.stopPropagation();close();}
      }}>?</span>
    {open&&createPortal(<div ref={popover} id={id} className="rentiaHelpPopover" role="tooltip" onClick={event=>event.stopPropagation()} style={{left:position?.left??12,top:position?.top??12,maxHeight:position?.maxHeight,visibility:position?'visible':'hidden'}}>
      <small>GUÍA RÁPIDA</small><strong>{term}</strong><p>{meaning}</p><div>{example}</div>
    </div>,document.body)}
  </>;
}
