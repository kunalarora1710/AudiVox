const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/ads.js'),'utf8');
function fixture(host='m.youtube.com'){
 let ad=false,clicks=0;const video={muted:false};const button={disabled:false,getClientRects(){return [1];},click(){clicks++;}};
 const player={querySelector(q){return q==='video'?video:button;}};const timers=[];
 const window={};const document={documentElement:{appendChild(){}},createElement(){return {remove(){}};},querySelector(){return ad?player:null;}};
 const ctx=vm.createContext({window,document,location:{hostname:host,origin:'https://'+host,href:'https://'+host},setInterval(fn){timers.push(fn);},URL});vm.runInContext(code,ctx);
 return {window,video,ctx,tick(){timers[0]();},set ad(v){ad=v;},get clicks(){return clicks;}};
}
test('normal playback is never muted or skipped',()=>{const f=fixture();f.window.ClearTubeAds.setEnabled(true);f.tick();assert.equal(f.video.muted,false);assert.equal(f.clicks,0);});
test('ad mute and visible skip recover the prior mute state',()=>{const f=fixture();f.window.ClearTubeAds.setEnabled(true);f.ad=true;f.tick();assert.equal(f.video.muted,true);assert.equal(f.clicks,1);f.ad=false;f.tick();assert.equal(f.video.muted,false);});
test('turning blocker off restores audio immediately',()=>{const f=fixture();f.window.ClearTubeAds.setEnabled(true);f.ad=true;f.tick();f.window.ClearTubeAds.setEnabled(false);assert.equal(f.video.muted,false);});
test('non-YouTube sites are never treated as YouTube',()=>{const f=fixture('youtube.com.evil.test');f.window.ClearTubeAds.setEnabled(true);f.ad=true;f.tick();assert.equal(f.clicks,0);});
test('player filtering removes only known ad fields, preserving media and captions',()=>{
 const f=fixture();f.window.ClearTubeAds.setEnabled(true);
 const result=vm.runInContext(`JSON.parse('{"videoDetails":{"title":"Song"},"streamingData":{"formats":[1]},"captions":{"ok":true},"adPlacements":[1],"playerAds":[2]}')`,f.ctx);
 assert.equal(result.adPlacements,undefined);assert.equal(result.playerAds,undefined);assert.equal(result.streamingData.formats[0],1);assert.equal(result.captions.ok,true);
});
test('generic JSON and disabled filtering remain unchanged',()=>{const f=fixture();f.window.ClearTubeAds.setEnabled(true);assert.equal(vm.runInContext(`JSON.parse('{"adPlacements":5}').adPlacements`,f.ctx),5);f.window.ClearTubeAds.setEnabled(false);assert.equal(vm.runInContext(`JSON.parse('{"videoDetails":{},"adPlacements":5}').adPlacements`,f.ctx),5);});
