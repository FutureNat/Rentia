import { NextResponse } from 'next/server';
import { getDashboardPreferences, saveDashboardPreferences } from '../../../../db/database';
import { canManageRentia, getRentiaUser } from '../../../../lib/session';

const allowedMetrics=new Set(['orders','totalRevenue','netRevenue','profit','margin','aov','adSpend','roas','cpa','productCost','shipping','commissions','externalRevenue','tnOrders','tnRevenue','tnNetRevenue','tnProfit','tnAov','metaSpend','metaRevenue','metaRoas','metaCpa','mlOrders','mlRevenue','mlNetRevenue','mlProfit','mlAov']);
const allowedChannels=new Set(['combined','tiendanube','meta','mercadolibre','custom']);
const allowedChartTypes=new Set(['area','line','bar']);
const allowedChartMetrics=new Set(['revenue','profit','orders','adSpend']);
type LayoutSection={id:string;title:string;metrics:string[];channel:string};

const channelSections:LayoutSection[]=[
  {id:'tiendanube',title:'Tiendanube',channel:'tiendanube',metrics:['tnOrders','tnRevenue','tnNetRevenue','tnProfit','tnAov']},
  {id:'meta',title:'Meta Ads',channel:'meta',metrics:['metaSpend','metaRevenue','metaRoas','metaCpa']},
  {id:'mercadolibre',title:'Mercado Libre',channel:'mercadolibre',metrics:['mlOrders','mlRevenue','mlNetRevenue','mlProfit','mlAov']},
];

function normalizedLayout(value:unknown) {
  if (!value||typeof value!=='object') return null;
  const raw=(value as {sections?:unknown}).sections;
  if (!Array.isArray(raw)||raw.length<1||raw.length>8) return null;
  const used=new Set<string>();
  const ids=new Set<string>();
  const sections:LayoutSection[]=[];
  for (const entry of raw) {
    if (!entry||typeof entry!=='object') return null;
    const source=entry as {id?:unknown;title?:unknown;metrics?:unknown;channel?:unknown};
    const id=String(source.id||'').trim();
    const title=String(source.title||'').trim();
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)||ids.has(id)||!title||title.length>45||!Array.isArray(source.metrics)) return null;
    const metrics:string[]=[];
    for (const metricValue of source.metrics) {
      const metric=String(metricValue);
      if (!allowedMetrics.has(metric)||used.has(metric)) continue;
      used.add(metric);metrics.push(metric);
    }
    const channel=allowedChannels.has(String(source.channel))?String(source.channel):'custom';
    ids.add(id);sections.push({id,title,metrics,channel});
  }
  if (!used.size) return null;
  const input=value as {version?:unknown;chart?:{type?:unknown;metric?:unknown}};
  if(Number(input.version)!==2) {
    sections[0].channel='combined';
    for(const section of channelSections) if(sections.length<8&&!ids.has(section.id)&&!section.metrics.some(metric=>used.has(metric))) {sections.push({...section,metrics:[...section.metrics]});ids.add(section.id);section.metrics.forEach(metric=>used.add(metric));}
  }
  const chartType=allowedChartTypes.has(String(input.chart?.type))?String(input.chart?.type):'area';
  const chartMetric=allowedChartMetrics.has(String(input.chart?.metric))?String(input.chart?.metric):'revenue';
  return {version:2,sections,chart:{type:chartType,metric:chartMetric}};
}

export async function GET() {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  const stored=await getDashboardPreferences(user.id);
  if (!stored) return NextResponse.json({layout:null});
  try { return NextResponse.json({layout:normalizedLayout(JSON.parse(stored.layout_json)),updatedAt:stored.updated_at}); }
  catch { return NextResponse.json({layout:null}); }
}

export async function PUT(request:Request) {
  const user=await getRentiaUser();
  if (!user) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!canManageRentia(user)) return NextResponse.json({error:'forbidden'},{status:403});
  const body=await request.json() as {layout?:unknown};
  const layout=normalizedLayout(body.layout);
  if (!layout) return NextResponse.json({error:'invalid_layout'},{status:400});
  const updatedAt=await saveDashboardPreferences(user.id,JSON.stringify(layout));
  return NextResponse.json({ok:true,layout,updatedAt});
}
