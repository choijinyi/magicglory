import fs from 'node:fs';
import {createApp} from '../worker/app.js';
import {createTursoDatabase} from './turso-db.mjs';

export function normalizeVercelRequest(request){
 const url=new URL(request.url);
 if(url.searchParams.has('__route')){url.pathname='/'+url.searchParams.get('__route').replace(/^\/+/, '');url.searchParams.delete('__route');}
 const headers=new Headers(request.headers);
 const ip=(headers.get('x-vercel-forwarded-for')||headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
 for(const name of [...headers.keys()])if(name.startsWith('oai-')||name.startsWith('cf-'))headers.delete(name);
 headers.set('cf-connecting-ip',ip);
 return new Request(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:'half'});
}

function loadData(){return {pages:JSON.parse(fs.readFileSync(new URL('../data/pages.json',import.meta.url),'utf8')),imported:JSON.parse(fs.readFileSync(new URL('../data/imported-posts.json',import.meta.url),'utf8')),assets:{}};}

export function createVercelHandler({databaseFactory=()=>createTursoDatabase(),environment=()=>process.env,data}={}){
 let database,application;
 return {async fetch(request){
  try{
   const normalized=normalizeVercelRequest(request);
   const settings=environment();
   if(!settings.ADMIN_USERNAME||!settings.ADMIN_PASSWORD_HASH||!settings.ADMIN_PASSWORD_SALT)throw new Error('Administrator configuration is missing');
   database??=databaseFactory();
   if(new URL(normalized.url).pathname==='/api/health')await database.prepare('SELECT 1 AS ok').bind().first();
   application??=createApp(data||loadData());
   return await application.fetch(normalized,{DB:database,MODE:'vercel',ADMIN_USERNAME:settings.ADMIN_USERNAME,ADMIN_PASSWORD_HASH:settings.ADMIN_PASSWORD_HASH,ADMIN_PASSWORD_SALT:settings.ADMIN_PASSWORD_SALT});
  }catch(error){console.error('Vercel request failed:',error.message);return Response.json({error:'서버 연결 설정을 확인하고 다시 시도해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 }};
}
