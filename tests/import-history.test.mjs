import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
  try{return next(specifier,context);}catch(error){
    if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(`${specifier}.ts`,context);
    throw error;
  }
}});
const {importHistoryStart,IMPORT_HISTORY_MONTHS}=await import('../lib/import-history.ts');
const {newImportProgress,parseImportProgress,importOrdersPath}=await import('../lib/ingestion-progress.ts');
const {newMeliProgress}=await import('../lib/mercadolibre-data.ts');
const {orderDetailsHref}=await import('../lib/order-review-links.ts');
const {analyticsRangeFromUrl}=await import('../lib/analytics-range.ts');

test('review links open the exact historical date and post-sale section, even outside the default month',()=>{
  const href=orderDetailsHref({provider:'mercadolibre',externalOrderId:'2000016659731116',date:'2026-05-28T12:00:00.000Z'},true);
  const url=new URL(href,'https://rentia.example.invalid');
  assert.equal(url.searchParams.get('order'),'2000016659731116');
  assert.equal(url.searchParams.get('provider'),'mercadolibre');
  assert.equal(url.hash,'#meli-review-2000016659731116');
  assert.deepEqual(analyticsRangeFromUrl(url),{days:1,range:{start:'2026-05-28',end:'2026-05-28'}});
  assert.equal(new URL(orderDetailsHref({externalOrderId:'id&not-query',date:'invalid'}),'https://rentia.example.invalid').searchParams.get('order'),'id&not-query');
  assert.equal(analyticsRangeFromUrl(new URL(orderDetailsHref({externalOrderId:'id',date:'2026-02-31'}),'https://rentia.example.invalid')).range,undefined);
});

test('calendar-month cutoff is identical for channels, including leap years',()=>{
  assert.equal(IMPORT_HISTORY_MONTHS,12);
  for(const [now,start] of [
    ['2026-10-07T18:30:01.123Z','2025-10-07T18:30:01.123Z'],
    ['2024-02-29T12:00:00.000Z','2023-02-28T12:00:00.000Z'],
    ['2025-03-31T23:59:59.999Z','2024-03-31T23:59:59.999Z'],
  ]) {
    const date=new Date(now);
    assert.equal(importHistoryStart(date),start);
    assert.equal(date.toISOString(),now,'cutoff must not mutate the caller date');
    assert.equal(newImportProgress(null,date).windows[0].start,start);
    const meli=newMeliProgress('123',undefined,now);
    assert.ok(meli.windows.every(window=>window.from===start&&window.to===now));
  }
});

test('legacy pending full-history jobs trim only unprocessed windows and reset shifted page offsets',()=>{
  const state=newImportProgress(null,new Date('2026-10-07T00:00:00.000Z'));
  state.productsDone=true;state.orders=30;state.products=9;
  state.windows=[
    {start:'1970-01-01T00:00:00.000Z',end:'2025-01-01T00:00:00.000Z',page:12},
    {start:'2025-01-01T00:00:00.000Z',end:'2026-01-01T00:00:00.000Z',page:7},
    {start:'2026-01-01T00:00:00.000Z',end:state.until,page:3},
  ];
  const resumed=parseImportProgress(JSON.stringify(state));
  assert.deepEqual(resumed.windows,[
    {start:'2025-10-07T00:00:00.000Z',end:'2026-01-01T00:00:00.000Z',page:1},
    state.windows[2],
  ]);
  assert.equal(resumed.orders,30);assert.equal(resumed.products,9);
  assert.equal(resumed.productsDone,true);
  assert.deepEqual(parseImportProgress(JSON.stringify(resumed)),resumed,'resuming again must not rewind a valid page');
});

test('completed jobs and incremental update windows stay intact; old orders can still receive updates',()=>{
  const state=newImportProgress(null,new Date('2026-10-07T00:00:00.000Z'));
  state.done=true;state.productsDone=true;state.windows=[];
  assert.deepEqual(parseImportProgress(JSON.stringify(state)),state);
  const next=newImportProgress(state,new Date('2026-10-08T00:00:00.000Z'));
  assert.equal(next.since,'2026-10-06T23:55:00.000Z');
  assert.match(importOrdersPath(next),/updated_at_min/);
  next.windows[0].start='2020-01-01T00:00:00.000Z';
  assert.deepEqual(parseImportProgress(JSON.stringify(next)),next);
  assert.equal(newMeliProgress('123','2026-10-06T23:50:00.000Z',state.until).mode,'updates');
});
