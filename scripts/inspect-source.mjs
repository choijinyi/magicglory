import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('data/pages.json','utf8'));
console.log('POSTS',Object.keys(p).filter(x=>x.includes('wr_id')).length);
for(const k of ['/bbs/board.php?bo_table=11','/bbs/board.php?bo_table=12','/']){
const h=p[k];console.log(k,h.slice(h.indexOf('fboardlist'),h.indexOf('fboardlist')+2400));
console.log(h.match(/<[^>]*class="[^"]*(?:at-body|at-content|at-side)[^"]*"[^>]*>/g));
console.log(h.match(/url\([^)]*\)/g)?.slice(0,12));}
