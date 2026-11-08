import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {fileURLToPath,pathToFileURL} from 'node:url';
import {createApp} from './worker/app.js';
const root=path.dirname(fileURLToPath(import.meta.url));
export function openDatabase(filename){
 const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
 for(const f of fs.readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync(path.join(root,'migrations',f),'utf8'));
 function prepare(sql){let args=[];return {sql,get args(){return args},bind(...a){args=a;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}};}
 return {prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close();}};
}
export function loadData(){return {pages:JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8')),imported:JSON.parse(fs.readFileSync(path.join(root,'data/imported-posts.json'),'utf8')),assets:{}};}
const mime={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml'};
export function makeServer({dbFile=path.join(root,'runtime','glorymagic.sqlite')}={}){
 fs.mkdirSync(path.dirname(dbFile),{recursive:true});const DB=openDatabase(dbFile),app=createApp(loadData());
 const server=http.createServer(async(req,res)=>{try{
  const origin='http://'+(req.headers.host||'127.0.0.1:4173');let pathname;try{pathname=decodeURIComponent(new URL(req.url,origin).pathname);}catch{res.writeHead(400);res.end('Bad URL');return;}
  const target=path.resolve(root,'public','.'+pathname);const publicRoot=path.join(root,'public')+path.sep;
  if(target.startsWith(publicRoot)&&fs.existsSync(target)&&fs.statSync(target).isFile()){
   res.writeHead(200,{'Content-Type':mime[path.extname(target).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);return;
  }
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>131072){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}
  const headers=new Headers();for(const [k,v]of Object.entries(req.headers)){if(k.startsWith('oai-')||k.startsWith('cf-'))continue;if(v)headers.set(k,Array.isArray(v)?v.join(','):v);}
  const request=new Request(origin+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
  const response=await app.fetch(request,{DB,MODE:'local'});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e.message);res.writeHead(500);res.end('Internal error');}});
 server.on('close',()=>DB.close());return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const port=Number(process.env.PORT||4173);const server=makeServer();server.listen(port,'127.0.0.1',()=>console.log(`GloryMagic: http://127.0.0.1:${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
