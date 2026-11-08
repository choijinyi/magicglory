import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,loadData} from '../server.mjs';
import {passwordHash} from '../worker/app.js';
import {createVercelHandler} from '../lib/vercel-handler.mjs';

test('Vercel rewrites preserve pages, query strings, login bodies, cookies and origin checks',async()=>{
 const DB=openDatabase(':memory:');
 try{
  const salt='42'.repeat(32),settings={ADMIN_USERNAME:'admin1004',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('TestPass9',salt)};
  const handler=createVercelHandler({databaseFactory:()=>DB,environment:()=>settings,data:loadData()});
  const origin='https://vercel.test';
  const call=(route,method='GET',data,headers={})=>handler.fetch(new Request(origin+'/api/index?__route='+encodeURIComponent(route),{method,headers:{origin,...(data?{'content-type':'application/json'}:{}),...headers},body:data?JSON.stringify(data):undefined}));
  const home=await call('');assert.equal(home.status,200);assert.match(await home.text(),/media\/youtube\/FrO9tfddZY0.jpg/);
  const board=await handler.fetch(new Request(origin+'/api/index?__route=bbs%2Fboard.php&bo_table=4_2'));assert.equal(board.status,200);assert.match(await board.text(),/board-admin.js/);
  assert.equal((await call('api/health')).status,200);
  const me=await call('api/me','GET',undefined,{'oai-authenticated-user-id':'fake','cf-connecting-ip':'spoof'});assert.equal((await me.json()).user,null);
  const login=await call('api/login','POST',{username:'admin1004',password:'TestPass9'});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/; Secure/);
  const created=await call('api/posts','POST',{board:'4_1',title:'Vercel rewrite',body:'Posted through the deployment adapter'},{cookie});assert.equal(created.status,201);
  const id=(await created.json()).id;
  assert.equal((await call('api/posts/'+id,'DELETE',{}, {cookie,origin:'https://other.test'})).status,403);
  assert.equal((await call('api/posts/'+id,'DELETE',{}, {cookie})).status,200);
 }finally{DB.close();}
});
