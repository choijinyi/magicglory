import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);const {chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/rea-agents/node_modules/playwright-core'));
const pages=JSON.parse(fs.readFileSync('data/pages.json','utf8'));
const mime={'.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml'};
const cache=new Map();
function asset(value,base='http://magicglory.com/'){
 try{const u=new URL(value.replaceAll('&amp;','&').replaceAll('&quot;','').replaceAll('&#39;',''),base);if(u.hostname!=='magicglory.com')return '';
 const p=path.resolve('public','.'+decodeURIComponent(u.pathname));if(!p.startsWith(path.resolve('public')+path.sep)||!fs.existsSync(p))return '';
 if(cache.has(p))return cache.get(p);let bytes=fs.readFileSync(p),type=mime[path.extname(p).toLowerCase()]||'application/octet-stream';
 if(type==='text/css'){let css=bytes.toString('utf8');css=css.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(_,q,v)=>`url("${asset(v,u.href)}")`).replace(/@import[^;]+;/g,'');bytes=Buffer.from(css);}
 const data=`data:${type};base64,${bytes.toString('base64')}`;cache.set(p,data);return data;
 }catch{return '';}
}
function inline(html){return html.replace(/<link([^>]+)href="([^"]+)"([^>]*)>/g,(m,b,v,a)=>b.includes('stylesheet')?`<link${b}href="${asset(v)}"${a}>`:m).replace(/src="([^"#]+)"/g,(m,v)=>`src="${asset(v)||'about:blank'}"`).replace(/style="([^"]+)"/g,(m,s)=>`style="${s.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(m,q,v)=>`url(&quot;${asset(v)}&quot;)`)}"`).replace(/<style>([\s\S]*?)<\/style>/g,(m,s)=>'<style>'+s.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(m,q,v)=>`url("${asset(v)}")`)+'</style>');}
fs.mkdirSync('runtime/qa',{recursive:true});const file=path.resolve('runtime/qa/home.html');fs.writeFileSync(file,inline(pages['/']));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){const page=await browser.newPage({viewport:{width,height},locale:'ko-KR'});await page.route('http://**/*',r=>r.abort());await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(file).href,{waitUntil:'load'});await page.screenshot({path:`runtime/qa/${name}.png`});const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length}));console.log(JSON.stringify({viewport:name,...metrics}));await page.close();}}finally{await browser.close();}
