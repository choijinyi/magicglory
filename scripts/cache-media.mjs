import fs from 'node:fs';
import path from 'node:path';
const pages=JSON.parse(fs.readFileSync('data/pages.json','utf8'));
const ids=[...new Set(Object.values(pages).flatMap(html=>[...html.matchAll(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/g)].map(match=>match[1])))];
const directory='public/media/youtube';fs.mkdirSync(directory,{recursive:true});
let next=0,cached=0,downloaded=0;const unavailable=[];
async function worker(){while(next<ids.length){const id=ids[next++],filename=path.join(directory,id+'.jpg');if(fs.existsSync(filename)){cached++;continue;}let saved=false;for(const quality of ['hqdefault','mqdefault']){try{const response=await fetch(`https://i.ytimg.com/vi/${id}/${quality}.jpg`,{signal:AbortSignal.timeout(15000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))continue;const data=Buffer.from(await response.arrayBuffer());if(data.length<1000)continue;fs.writeFileSync(filename,data);downloaded++;saved=true;break;}catch{}}
 if(!saved)unavailable.push(id);
}}
await Promise.all(Array.from({length:6},worker));
console.log(JSON.stringify({videos:ids.length,cached,downloaded,unavailable}));
if(unavailable.length)process.exitCode=1;
