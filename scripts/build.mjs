import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const mime={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml'};
const files={};const optimizedFile='data/optimized-assets.json';const optimized=fs.existsSync(optimizedFile)?JSON.parse(fs.readFileSync(optimizedFile,'utf8')):{};
let embeddedBytes=0;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else{const k='/'+path.relative('public',p).split(path.sep).join('/');if(k.endsWith('.js')&&!['/replica.js','/board-admin.js'].includes(k))continue;const original=fs.readFileSync(p);const a=optimized[k]||{base64:original.toString('base64'),mime:mime[path.extname(p).toLowerCase()]||'application/octet-stream'};
if(embeddedBytes+Math.ceil(a.base64.length*3/4)>5500000&&!/\.(css|js|woff2?|ttf)$/.test(k)&&!k.startsWith('/img/'))files[k]={mime:a.mime,remote:'http://magicglory.com'+k};else{files[k]=a;embeddedBytes+=Math.ceil(a.base64.length*3/4);}
}}}
scan('public');const data={pages:JSON.parse(fs.readFileSync('data/pages.json','utf8')),imported:JSON.parse(fs.readFileSync('data/imported-posts.json','utf8')),assets:files};
const app=fs.readFileSync('worker/app.js','utf8').replace(/^export /gm,'');
const output=app+'\nconst application=createApp('+JSON.stringify(data)+');\nexport default {fetch(request,env,ctx){return application.fetch(request,{...env,MODE:"hosted"},ctx)}};\n';
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});fs.writeFileSync('dist/server/index.js',output);fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('migrations','dist/migrations',{recursive:true});
if(fs.existsSync('drizzle'))fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
console.log(JSON.stringify({pages:Object.keys(data.pages).length,posts:data.imported.length,assets:Object.keys(files).length,workerBytes:Buffer.byteLength(output),gzipBytes:zlib.gzipSync(output).length}));
