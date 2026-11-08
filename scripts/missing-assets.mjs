import fs from 'node:fs';import path from 'node:path';
const pages=JSON.parse(fs.readFileSync('data/pages.json','utf8'));
const assets=JSON.parse(fs.readFileSync('data/assets.json','utf8'));const paths=new Set();
const add=(v,base='http://magicglory.com/')=>{try{const u=new URL(v.replaceAll('&quot;','').replaceAll('&amp;','&'),base);if(u.hostname==='magicglory.com'&&/\.(png|jpe?g|gif|webp|css|woff2?|ttf|svg)(\?|$)/i.test(u.pathname)&&!assets[u.pathname])paths.add(u.pathname+u.search);}catch{}};
for(const h of Object.values(pages)){for(const m of h.matchAll(/(?:src|href)="([^"]+)"/g))add(m[1]);for(const m of h.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))add(m[1]);}
for(const [p,a] of Object.entries(assets)){if(a.type==='stylesheet'){const css=fs.readFileSync(path.join('public',p),'utf8');for(const m of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))add(m[1],'http://magicglory.com'+p);}}
console.log(JSON.stringify([...paths]));
