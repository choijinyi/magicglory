import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareMediaMarkup} from '../worker/media.js';
import {createApp} from '../worker/app.js';
import {loadData,openDatabase} from '../server.mjs';

test('homepage delivers local video posters and all gallery thumbnails',async()=>{
 const DB=openDatabase(':memory:');
 try{
  const response=await createApp(loadData()).fetch(new Request('https://media.test/'),{DB,MODE:'local'});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
  const html=await response.text();
  assert.doesNotMatch(html,/<iframe[^>]+youtube\.com\/embed\//);
  for(const id of ['FrO9tfddZY0','hBzsgoh9EUk','dawKHC9cOJI','Mgcurp2KbOU','Pk5fudUeWWU','s0VFmWpxqO4','AjQ_0kkM7IA','eKwb6gLeXP4']){
   assert.match(html,new RegExp('/media/youtube/'+id+'\\.jpg'));
   const poster=fs.readFileSync('public/media/youtube/'+id+'.jpg');
   assert.equal(poster.readUInt16BE(0),0xffd8,id);
  }
  const gallery=[...html.matchAll(/<img[^>]+src="(\/data\/editor\/[^"']*thumb-[^"']+)"/g)];
  assert.equal(gallery.length,8);
  for(const [,src]of gallery)assert.ok(fs.statSync('public'+src).size>1000,src);
 }finally{DB.close();}
});

test('media conversion leaves other providers intact and escapes titles',()=>{
 assert.equal(prepareMediaMarkup('<iframe src="https://player.vimeo.com/video/1"></iframe>'),'<iframe src="https://player.vimeo.com/video/1"></iframe>');
 const html=prepareMediaMarkup('<iframe src="https://www.youtube.com/embed/FrO9tfddZY0" title="공연 &amp; 영상"></iframe>');
 assert.match(html,/data-youtube-id="FrO9tfddZY0"/);
 assert.doesNotMatch(html,/<iframe/);
});
