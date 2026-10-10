import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';

// Exercise the production database functions against an in-memory SQLite D1
// adapter, without connecting to or modifying any customer's store.
globalThis.__scalingEnv={DB:null};
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__scalingEnv;',shortCircuit:true};
  if(/\/lib\/session$/.test(specifier))return {url:'data:text/javascript,export async function getRentiaUser(){return globalThis.__scalingUser;}export function canManageRentia(user){return user.role!=="member";}',shortCircuit:true};
  if(specifier==='next/server')return next('next/server.js',context);
  try{return next(specifier,context);}catch(error){
    if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(`${specifier}.ts`,context);
    throw error;
  }
}});
const {schemaStatements}=await import('../db/schema.ts');
const commerce=await import('../db/database.ts');
const {summarizeOrders}=await import('../lib/order-summary.ts');
const {allocateOrderCosts,orderCosts}=await import('../lib/order-calculations.ts');
const {calculateAdditionalCosts}=await import('../lib/cost-engine.ts');
const {newImportProgress,parseImportProgress,advanceImportWindow,splitImportWindow,importOrdersPath,IMPORT_PAGE_SIZE,IMPORT_VERSION}=await import('../lib/ingestion-progress.ts');
const {atomicBatches}=await import('../lib/atomic-batches.ts');
const {analyticsRangeFromUrl}=await import('../lib/analytics-range.ts');
const {ORDER_ANALYTICS_BATCH_SQL}=await import('../lib/commerce-queries.ts');
const ordersEndpoint=await import('../app/api/orders/route.ts');
const exportEndpoint=await import('../app/api/orders/export/route.ts');
const productsEndpoint=await import('../app/api/products/analytics/route.ts');

class Statement {
  constructor(adapter,sql,args=[]){this.adapter=adapter;this.sql=sql;this.args=args;}
  bind(...args){assert.ok(args.length<=100,'D1 parameter limit');return new Statement(this.adapter,this.sql,args);}
  async all(){return {results:this.adapter.sqlite.prepare(this.sql).all(...this.args),success:true,meta:{}};}
  async first(){return this.adapter.sqlite.prepare(this.sql).get(...this.args)||null;}
  async run(){const result=this.adapter.sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
}
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  for(const sql of schemaStatements)sqlite.exec(sql);
  sqlite.exec('PRAGMA foreign_keys=ON');
  const adapter={sqlite,failLine:null,prepare(sql){return new Statement(this,sql);},async batch(statements){
    sqlite.exec('BEGIN');
    try{
      const results=[];
      for(const statement of statements){
        if(this.failLine&&statement.sql.startsWith('INSERT INTO order_items')&&statement.args.includes(this.failLine))throw new Error('simulated interrupted line write');
        results.push(await statement.run());
      }
      sqlite.exec('COMMIT');return results;
    }catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
  globalThis.__scalingEnv.DB=adapter;
  const account=sqlite.prepare('INSERT INTO accounts (user_id,email,owner_name,store_name,trial_started_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?)');
  for(const id of ['store-a','store-b'])account.run(id,`${id}@example.invalid`,'Synthetic owner',id,'2026-09-01','2026-09-01','2026-09-01');
  return adapter;
}
const range={start:'2026-09-01',end:'2026-09-30'},settings={shipping_cost_ars:5000,shipping_mode:'actual',commission_percent:0,tax_percent:5};
const rules=[{id:1,category:'additional',name:'Synthetic rent',match_value:null,calculation:'fixed_monthly',amount:90000,percentage:0,starts_at:null,ends_at:null,enabled:1}];

function seedLarge(adapter,count=12050){
  const db=adapter.sqlite;
  db.exec("INSERT INTO products (user_id,provider,external_product_id,name,synced_at) VALUES ('store-a','tiendanube','p','Synthetic product','2026-09-01')");
  const variant=db.prepare('INSERT INTO product_variants (user_id,provider,external_product_id,external_variant_id,price,cost,synced_at) VALUES (?,?,?,?,?,?,?)');
  variant.run('store-a','tiendanube','p','v1',60000,20000,'2026-09-01');variant.run('store-a','tiendanube','p','v2',20000,10000,'2026-09-01');
  // A matching provider/id in another tenant must not affect cost joins.
  variant.run('store-b','tiendanube','p','v1',999999,999999,'2026-09-01');
  const order=db.prepare('INSERT INTO orders (user_id,provider,external_order_id,order_number,status,payment_status,payment_method,source_shipping_cost,source_commission_cost,total,source_created_at,synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  const item=db.prepare('INSERT INTO order_items (user_id,provider,external_order_id,external_line_id,external_variant_id,name,quantity,unit_price,unit_cost) VALUES (?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  for(let id=0;id<count;id++){
    const date=`2026-09-${String(20+Math.floor(id/1600)).padStart(2,'0')}T12:00:00.000Z`;
    order.run('store-a','tiendanube',String(id),String(id),'open','paid',id===0?'historic-transfer':'card',5000,7000,100000,date,date);
    item.run('store-a','tiendanube',String(id),'line-1','v1','Synthetic item',1,60000,20000);
    item.run('store-a','tiendanube',String(id),'line-2','v2','Synthetic item',2,20000,10000);
  }
  for(const [id,status,payment,tenant,date] of [['pending','open','pending','store-a','2026-09-25T12:00:00.000Z'],['cancelled','cancelled','paid','store-a','2026-09-25T12:00:00.000Z'],['foreign','open','paid','store-b','2026-09-25T12:00:00.000Z'],['before','open','paid','store-a','2026-08-31T23:59:59.000Z'],['after','open','paid','store-a','2026-10-01T00:00:00.000Z']]){
    order.run(tenant,'tiendanube',id,id,status,payment,'card',5000,7000,100000,date,date);
  }
  db.exec('COMMIT');
}

test('12,050 paid orders, >1,000/day: totals, all 121 pages, exports and 24,100 product lines are complete and tenant-scoped',async()=>{
  const adapter=fixture();seedLarge(adapter);
  const paid=await commerce.getPaidOrderTotals('store-a',30,range);
  assert.deepEqual(paid,{orders:12050,revenue:1205000000});
  const summary=await summarizeOrders(commerce.iterateAnalyticsOrders('store-a',30,0,range),settings,rules,30,paid,true,new Date('2026-10-01T00:00:00.000Z'));
  assert.equal(summary.totals.orders,12050);assert.equal(summary.totals.revenue,paid.revenue);
  assert.equal(summary.totals.productCost,12050*40000);assert.equal(summary.totals.shipping,12050*5000);
  assert.equal(summary.totals.commissions,12050*7000);assert.equal(summary.totals.taxes,12050*5000);
  assert.ok(Math.abs(summary.totals.additional-90000)<0.001);
  assert.equal(summary.latest.length,6);assert.equal(summary.quality.completeOrders,12050);
  assert.equal([...summary.timeline.values()].reduce((sum,row)=>sum+row.orders,0),12050);
  assert.ok([...summary.timeline.values()].some(row=>row.orders>1000));
  const ids=new Set();
  for(let page=1;page<=121;page++){
    const result=await commerce.getOrdersPage('store-a',30,range,page);
    assert.equal(result.pagination.total,12052);assert.ok(result.orders.length<=100);
    for(const order of result.orders){assert.ok(!ids.has(order.external_order_id));ids.add(order.external_order_id);if(/^\d+$/.test(order.external_order_id))assert.equal(order.items.length,2);}
  }
  assert.equal(ids.size,12052);assert.ok(!ids.has('foreign')&&!ids.has('before')&&!ids.has('after'));
  const searched=await commerce.getOrdersPage('store-a',30,range,1,'historic-transfer');
  assert.equal(searched.pagination.total,1);assert.equal(searched.orders[0].external_order_id,'0');
  assert.equal((await commerce.getOrdersPage('store-a',30,range,999999)).pagination.page,121);
  const additional=calculateAdditionalCosts(paid.revenue,30,rules,new Date('2026-10-01T00:00:00.000Z'));
  let exported=0,exportedProfit=0;
  for await(const raw of commerce.iterateAnalyticsOrders('store-a',30,0,range)){
    const order=allocateOrderCosts(orderCosts(raw,settings,rules),paid.revenue,paid.orders,additional);
    exported++;exportedProfit+=order.profit;
  }
  assert.equal(exported,12052);assert.ok(Math.abs(exportedProfit-(12050*43000-90000))<0.01);
  const products=await commerce.getProductAnalyticsData('store-a',30,range);
  let lines=0,units=0;const distinct=new Map(),lastOrder=new Map();
  for await(const sale of products.sales){lines++;units+=sale.quantity;assert.equal(sale.order_gross,100000);if(lastOrder.get(sale.variant_id)!==sale.order_cursor){distinct.set(sale.variant_id,(distinct.get(sale.variant_id)||0)+1);lastOrder.set(sale.variant_id,sale.order_cursor);}}
  assert.equal(lines,24100);assert.equal(units,36150);assert.deepEqual([...distinct.values()],[12050,12050]);
  assert.equal(products.totalRevenue,paid.revenue);assert.equal(products.catalog.length,2);
  const plan=adapter.sqlite.prepare(`EXPLAIN QUERY PLAN ${ORDER_ANALYTICS_BATCH_SQL}`).all('store-a','2026-09-01','2026-10-01','','','',0,5000);
  assert.ok(plan.some(row=>/SEARCH o USING INDEX idx_orders_user_/.test(row.detail)),JSON.stringify(plan));
  adapter.sqlite.prepare('INSERT INTO store_settings (user_id,shipping_mode,tax_percent,onboarding_complete,updated_at) VALUES (?,?,?,?,?)').run('store-a','actual',5,1,'2026-09-01');
  adapter.sqlite.prepare('INSERT INTO cost_rules (user_id,category,name,calculation,amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run('store-a','additional','Synthetic rent','fixed_monthly',90000,'2026-09-01','2026-09-01');
  globalThis.__scalingUser={id:'store-a',role:'member'};
  const base='https://example.invalid/api/orders?start=2026-09-01&end=2026-09-30';
  const httpPage=await ordersEndpoint.GET(new Request(`${base}&page=121&user_id=store-b`));
  assert.equal(httpPage.status,200);const payload=await httpPage.json();assert.equal(payload.pagination.total,12052);assert.equal(payload.orders.length,52);
  assert.ok(payload.orders.every(row=>row.external_order_id!=='foreign'));
  const paidRow=payload.orders.find(row=>row.payment_status==='paid'&&row.status!=='cancelled');
  assert.ok(Math.abs(paidRow.profit-(43000-90000/12050))<0.00001);
  assert.equal((await ordersEndpoint.GET(new Request(`${base}&page=-1`))).status,400);
  const hostile=await ordersEndpoint.GET(new Request(`${base}&q=${encodeURIComponent("' OR 1=1 --")}`));assert.equal((await hostile.json()).pagination.total,0);
  adapter.sqlite.prepare('UPDATE orders SET order_number=? WHERE user_id=? AND external_order_id=?').run('=HYPERLINK("unsafe")','store-a','0');
  const download=await exportEndpoint.GET(new Request(base)),csv=await download.text();
  assert.equal(download.headers.get('cache-control'),'private, no-store');assert.equal(csv.trimEnd().split('\r\n').length,12053);assert.ok(csv.includes("\"'=HYPERLINK(\"\"unsafe\"\")\""));assert.ok(!csv.includes('foreign'));
  const productResponse=await productsEndpoint.GET(new Request(base));assert.equal(productResponse.status,200);
  const analytics=await productResponse.json();assert.equal(analytics.products.reduce((sum,row)=>sum+row.units_sold,0),36150);assert.equal(analytics.products.reduce((sum,row)=>sum+row.revenue,0),paid.revenue);
  assert.ok(Math.abs(analytics.products.reduce((sum,row)=>sum+row.profit,0)-(12050*43000-90000))<0.01);
  globalThis.__scalingUser=null;
  assert.equal((await ordersEndpoint.GET(new Request(base))).status,401);assert.equal((await exportEndpoint.GET(new Request(base))).status,401);
  adapter.sqlite.close();
});

test('imports split the upstream 10,000-result window, resume after interruption and preserve timestamp boundary orders',()=>{
  const progress=newImportProgress(null,new Date('2026-10-01T00:00:00.000Z'));progress.productsDone=true;
  const start=Date.parse(progress.windows[0].start),end=Date.parse(progress.until),middle=Math.floor((start+end)/2);
  const source=Array.from({length:15051},(_,id)=>({id,date:id===0?middle:start+Math.floor((end-start)*(id+1)/15052)}));
  const stored=new Map();let requests=0,interrupted=false;
  while(progress.windows.length){
    const saved=JSON.stringify(progress),window=progress.windows.at(-1),matching=source.filter(row=>row.date>=Date.parse(window.start)&&row.date<=Date.parse(window.end));
    requests++;
    if(matching.length>10000){splitImportWindow(progress);continue;}
    const rows=matching.slice((window.page-1)*IMPORT_PAGE_SIZE,window.page*IMPORT_PAGE_SIZE);
    for(const row of rows)stored.set(row.id,row);
    if(!interrupted&&requests===8){
      // Rows may have committed before a crash; the checkpoint is unchanged.
      assert.deepEqual(parseImportProgress(saved),progress);interrupted=true;continue;
    }
    advanceImportWindow(progress,rows.length);
    Object.assign(progress,parseImportProgress(JSON.stringify(progress)));
    assert.ok(requests<1000,'import must make progress');
  }
  assert.equal(stored.size,source.length);assert.ok(stored.has(0));assert.ok(interrupted);assert.ok(progress.done);
  assert.equal(progress.since,null);assert.equal(progress.until,'2026-10-01T00:00:00.000Z');
  const next=newImportProgress(progress,new Date('2026-10-02T00:00:00.000Z'));
  assert.equal(next.since,'2026-09-30T23:55:00.000Z');assert.match(importOrdersPath(next),/updated_at_min/);
  assert.match(importOrdersPath(newImportProgress(null,new Date('2026-10-01T00:00:00.000Z'))),/created_at_min=2025-10-01/);
  assert.equal(newImportProgress({...progress,version:IMPORT_VERSION-1}).since,null);
  const exact=newImportProgress(null);exact.productsDone=true;advanceImportWindow(exact,IMPORT_PAGE_SIZE);assert.equal(exact.done,false);advanceImportWindow(exact,0);assert.equal(exact.done,true);
  const narrow=newImportProgress(null);narrow.windows=[{start:'2026-10-01T00:00:00.000Z',end:'2026-10-01T00:00:00.500Z',page:1}];assert.throws(()=>splitImportWindow(narrow),/sin omitir/);assert.equal(narrow.done,false);
});

test('one active lease per store, independent stores, stale-token safety and expiry recovery',async()=>{
  const adapter=fixture(),state=JSON.stringify(newImportProgress(null));
  const first=await commerce.claimImportJob('store-a','tiendanube',state);assert.ok(first);
  assert.equal(await commerce.claimImportJob('store-a','tiendanube',state),null);
  assert.ok(await commerce.claimImportJob('store-b','tiendanube',state));
  await commerce.releaseImportJob('store-a','tiendanube','not-the-owner');assert.equal(await commerce.claimImportJob('store-a','tiendanube',state),null);
  adapter.sqlite.prepare('UPDATE sync_jobs SET lease_expires_at=0 WHERE user_id=?').run('store-a');
  const resumed=await commerce.claimImportJob('store-a','tiendanube',state);assert.ok(resumed);assert.notEqual(resumed.token,first.token);
  await assert.rejects(()=>commerce.checkpointImportJob('store-a','tiendanube',first.token,state),/Otro proceso/);
  await commerce.checkpointImportJob('store-a','tiendanube',resumed.token,state,true);assert.ok(await commerce.claimImportJob('store-a','tiendanube',state));
  adapter.sqlite.close();
});

test('failed line replacement rolls back the whole order; retry is idempotent and binds stay <=100',async()=>{
  const adapter=fixture();
  const order={externalId:'atomic',number:'1',currency:'ARS',status:'open',paymentStatus:'paid',paymentMethod:'card',paymentType:null,paymentInstallments:null,shippingStatus:null,shippingCost:0,total:100,subtotal:100,discount:0,createdAt:'2026-09-25T12:00:00.000Z',updatedAt:'2026-09-25T12:00:00.000Z',items:[{externalLineId:'old-line',productId:null,variantId:null,name:'Original',sku:null,quantity:1,unitPrice:100,unitCost:40}]};
  await commerce.upsertOrders('store-a','tiendanube',[order]);
  const changed={...order,total:900,items:Array.from({length:27},(_,id)=>({...order.items[0],externalLineId:`new-${id}`}))};
  adapter.failLine='new-11';await assert.rejects(()=>commerce.upsertOrders('store-a','tiendanube',[changed]),/simulated/);
  assert.equal(adapter.sqlite.prepare('SELECT total FROM orders').get().total,100);
  assert.equal(adapter.sqlite.prepare('SELECT external_line_id FROM order_items').get().external_line_id,'old-line');
  adapter.failLine=null;await commerce.upsertOrders('store-a','tiendanube',[changed]);await commerce.upsertOrders('store-a','tiendanube',[changed]);
  assert.equal(adapter.sqlite.prepare('SELECT COUNT(*) AS total FROM orders').get().total,1);
  assert.equal(adapter.sqlite.prepare('SELECT COUNT(*) AS total FROM order_items').get().total,27);
  const groups=[[1,2,3],[4,5,6],[7,8,9,10,11,12]],batches=[...atomicBatches(groups,5)];assert.deepEqual(batches,groups);
  adapter.sqlite.close();
});

test('long historical ranges and the appended migration are valid without changing applied migrations',()=>{
  const parsed=analyticsRangeFromUrl(new URL('https://example.invalid/api/orders?start=2019-01-01&end=2026-10-01'));
  assert.ok(parsed.days>731);assert.equal(parsed.range.start,'2019-01-01');
  const adapter=fixture();adapter.sqlite.exec(readFileSync(new URL('../drizzle/0020_resumable_commerce.sql',import.meta.url),'utf8'));adapter.sqlite.close();
});
