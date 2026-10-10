export type DisplayDateRange={start:string;end:string};

// Mirror the existing rolling analytics window; this only changes its label.
export function rollingDisplayRange(days:number,now=new Date()):DisplayDateRange {
  const start=new Date(now.getTime()-days*24*60*60*1000);
  return {start:start.toISOString().slice(0,10),end:now.toISOString().slice(0,10)};
}

export function formatDisplayDate(value:string,locale='es-AR') {
  return new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
}

export function formatDisplayRange(range:DisplayDateRange,locale='es-AR') {
  return `${formatDisplayDate(range.start,locale)} – ${formatDisplayDate(range.end,locale)}`;
}
