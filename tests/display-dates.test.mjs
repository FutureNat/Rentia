import test from 'node:test';
import assert from 'node:assert/strict';
import {rollingDisplayRange,formatDisplayDate,formatDisplayRange} from '../lib/display-dates.ts';

test('quick ranges label the same rolling endpoints as analytics',()=>{
  const now=new Date('2026-09-30T22:30:00Z');
  assert.deepEqual(rollingDisplayRange(7,now),{start:'2026-09-23',end:'2026-09-30'});
  assert.deepEqual(rollingDisplayRange(30,now),{start:'2026-08-31',end:'2026-09-30'});
  assert.deepEqual(rollingDisplayRange(365,now),{start:'2025-09-30',end:'2026-09-30'});
});

test('dates retain both full years across year boundaries and locales',()=>{
  const range={start:'2025-12-28',end:'2026-01-04'};
  for(const locale of ['es-AR','pt-BR','en-US']){
    const label=formatDisplayRange(range,locale);
    assert.ok(label.includes('2025')&&label.includes('2026'));
    assert.equal(label,`${formatDisplayDate(range.start,locale)} – ${formatDisplayDate(range.end,locale)}`);
  }
  assert.match(formatDisplayDate('2024-02-29','en-US'),/Feb 29, 2024/);
});
