import {analyticsRangeFromUrl} from './analytics-range';

export function orderDetailsHref(order:{provider?:string;externalOrderId:string;date:string},review=false) {
  const params=new URLSearchParams({section:'ordenes',provider:order.provider||'',order:order.externalOrderId});
  const day=order.date.slice(0,10);
  const dated=new URL('https://rentia.example.invalid');
  dated.searchParams.set('start',day);dated.searchParams.set('end',day);
  if(analyticsRangeFromUrl(dated).range){params.set('start',day);params.set('end',day);}
  return `/panel?${params}${review?`#meli-review-${encodeURIComponent(order.externalOrderId)}`:''}`;
}
