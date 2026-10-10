import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';

const css=postcss.parse(readFileSync(new URL('../app/report-details.css',import.meta.url),'utf8'));
const markup=readFileSync(new URL('../components/report-details.tsx',import.meta.url),'utf8');
function declaration(selector,property){
  let value;
  css.walkRules(rule=>{
    if(rule.parent.type!=='root'||!rule.selectors.includes(selector))return;
    rule.walkDecls(property,decl=>{value=decl.value;});
  });
  return value;
}
test('wide tables shrink their grid ancestors and scroll locally',()=>{
  for(const selector of ['.reportsPage','.reportDetails','.reportDetailPanel','.reportDetailScroll']){
    assert.equal(declaration(selector,'min-width'),'0');
    assert.equal(declaration(selector,'max-width'),'100%');
  }
  assert.equal(declaration('.reportDetails','grid-template-columns'),'minmax(0, 1fr)');
  assert.equal(declaration('.reportDetailScroll','overflow-x'),'auto');
  assert.equal(declaration('.reportDetailScroll','width'),'100%');
  assert.equal((markup.match(/className="reportDetailScroll" role="region"/g)||[]).length,2);
  assert.equal((markup.match(/tabIndex=\{0\}/g)||[]).length,2);
});
test('pagination has a horizontal, wrapping button group',()=>{
  assert.equal(declaration('.reportPagination','display'),'flex');
  assert.equal(declaration('.reportPageActions','display'),'flex');
  assert.equal(declaration('.reportPageActions','flex-wrap'),'wrap');
  assert.equal(declaration('.reportPageActions .outline','display'),'inline-flex');
  assert.ok(markup.includes('className="reportPagination"'));
  assert.ok(markup.includes('className="reportPageActions"'));
});
