import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const cache = new Map();
const session = new Map(), local = new Map();
const storage = map => ({getItem:key=>map.get(key)??null, setItem:(key,value)=>map.set(key,value), removeItem:key=>map.delete(key)});
let calls = 0;
const context = { process, URL, Headers, AbortSignal, structuredClone, window:{sessionStorage:storage(session),localStorage:storage(local)}, fetch:async()=>{calls++;return {ok:true,json:async()=>({role:'BENEFICIARY'})};} };
function load(file) {
  file=path.resolve(file);
  if(file.endsWith('.json')) return JSON.parse(fs.readFileSync(file,'utf8'));
  if(cache.has(file)) return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{...context,module,exports:module.exports,require:name=>load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.ts'))});
  return module.exports;
}
const {demoRoles,startDemo,endDemo,demoResponse}=load('lib/demo-session.ts');
const {api,saveTokens,getAccessToken}=load('lib/api.ts');
saveTokens({access_token:'existing-session-sentinel',refresh_token:'refresh-sentinel'});
for(const role of demoRoles){
  startDemo(role);assert.equal((await api.me()).role,role);
  const reads={BENEFICIARY:()=>api.myBeneficiary(),FIELD_WORKER:()=>api.fieldWorkerTasks(),FACILITATOR:()=>api.reviewQueue(),DISTRICT_OFFICER:()=>api.officerSummary(),ADMIN:()=>api.adminDiagnostics()};
  assert.ok(await reads[role]());
  for(const mutation of [()=>api.login({email:'unused@example.invalid',password:'unused'}),()=>api.updateProfile(1,{}),()=>api.reviewAction(1,'approve','test'),()=>api.generatePathways(1)]) await assert.rejects(mutation,error=>error.code==='DEMO_READ_ONLY');
  await assert.rejects(()=>api.beneficiary(99999));
  assert.equal(calls,0,'Demo must never contact a live API, including on missing data or errors');
}
assert.throws(()=>demoResponse('BENEFICIARY','/api/admin/diagnostics'));
assert.throws(()=>demoResponse('DISTRICT_OFFICER','/api/beneficiaries/1'));
const reviews=demoResponse('FACILITATOR','/api/reviews?page=1&status=OPEN');
assert.ok(reviews.items.every(item=>item.status==='OPEN'));
assert.equal(demoResponse('FACILITATOR','/api/reviews?page=2').items.length,0);
endDemo();assert.equal(getAccessToken(),'existing-session-sentinel');
await api.me();assert.equal(calls,1,'Normal accounts still use the existing API');
console.log('PASS: five roles; no live network or mutation in demo; missing data, role scope, pagination, review filter, and preserved real login');
