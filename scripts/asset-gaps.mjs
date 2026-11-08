import fs from 'node:fs';
const missing=new Set(JSON.parse(fs.readFileSync('data/missing-assets.json','utf8').replace(/^\uFEFF/,'')));
const b=JSON.parse(fs.readFileSync('../evidence/rea-capture.json','utf8'));const result={};
for(const r of b.records){const events=r.normalized_result?.events?.items||[];const requests=new Map(events.filter(e=>e.kind==='response').map(e=>[e.transaction_id,e]));for(const e of events){if(e.kind==='network-content'&&e.phase==='response'){const response=requests.get(e.transaction_id);if(!response)continue;let p;try{p=new URL(response.url.url).pathname;}catch{continue;}if(missing.has(p))result[p]={status:response.status,body:e.body?.state,reason:e.body?.reason,bytes:e.body?.observed_bytes};}}}
console.log(JSON.stringify(result,null,2));
