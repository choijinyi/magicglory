import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp,passwordHash} from '../worker/app.js';
import {openDatabase,loadData} from '../server.mjs';

test('Vercel provisions its administrator before signups and ignores identity spoofing',async()=>{
 const DB=openDatabase(':memory:');
 try{
  const salt='31'.repeat(32);
  const env={DB,MODE:'vercel',ADMIN_USERNAME:'admin1004',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('TestPass9',salt)};
  const app=createApp(loadData()),origin='https://vercel.test';
  const call=async(path,method='GET',data,headers={})=>app.fetch(new Request(origin+path,{method,headers:{origin,...(data?{'content-type':'application/json'}:{}),...headers},body:data?JSON.stringify(data):undefined}),env);
  const me=await call('/api/me','GET',undefined,{'oai-authenticated-user-id':'attacker','oai-authenticated-user-email':'admin@example.test'});
  assert.equal((await me.json()).user,null);
  const signup=await call('/api/register','POST',{username:'member1',name:'Member',email:'member@example.test',password:'Member-Password-9'});
  assert.equal(signup.status,201);
  assert.equal((await DB.prepare('SELECT role FROM users WHERE username=?').bind('member1').first()).role,'member');
  const admin=await call('/api/login','POST',{username:'admin1004',password:'TestPass9'});
  assert.equal(admin.status,200);
  assert.equal((await admin.json()).user.role,'admin');
  assert.match(admin.headers.get('set-cookie'),/; Secure/);
  const cookie=admin.headers.get('set-cookie').split(';')[0];
  const post=await call('/api/posts','POST',{board:'4_1',title:'Vercel admin post',body:'Persistent content'},{cookie});
  assert.equal(post.status,201);
  assert.equal((await call('/api/posts/'+(await post.json()).id,'DELETE',{}, {cookie})).status,200);
 }finally{DB.close();}
});

test('Vercel refuses signups if administrator settings are missing',async()=>{
 const DB=openDatabase(':memory:');
 try{
  const response=await createApp(loadData()).fetch(new Request('https://vercel.test/api/register',{method:'POST',headers:{origin:'https://vercel.test','content-type':'application/json'},body:JSON.stringify({username:'first',name:'First',email:'first@example.test',password:'first-password'})}),{DB,MODE:'vercel'});
  assert.equal(response.status,503);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS total FROM users').bind().first()).total,0);
 }finally{DB.close();}
});
