// Applies drizzle/*.sql to the local D1 used by `npm run local`, once each.
// Local only: it never touches the production database.
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';

const persist='.wrangler/state';
const ledger=`${persist}/rentia-migrations.json`;
const config='dist/server/wrangler.json';

if(!existsSync(config)) {
  console.error('Falta el build. Corré primero: npx vinext build');
  process.exit(1);
}
mkdirSync(persist,{recursive:true});
const applied=new Set(existsSync(ledger)?JSON.parse(readFileSync(ledger,'utf8')):[]);
const pending=readdirSync('drizzle').filter(file=>file.endsWith('.sql')).sort().filter(file=>!applied.has(file));
for(const file of pending) {
  execFileSync('npx',['wrangler','d1','execute','DB','-c',config,'--local','--persist-to',persist,'--file',`drizzle/${file}`,'-y'],{stdio:['ignore','ignore','inherit'],shell:process.platform==='win32'});
  applied.add(file);
  writeFileSync(ledger,JSON.stringify([...applied].sort(),null,2));
  console.log(`aplicada ${file}`);
}
console.log(pending.length?`${pending.length} migraciones aplicadas.`:'La base local ya está al día.');
