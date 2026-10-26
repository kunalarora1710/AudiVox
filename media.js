(function(){
 'use strict';
 if(window.ClearTubeMedia)return;
 const youtube=/(^|\.)youtube\.com$/.test(location.hostname),handlers={};
 let lastMedia=null,lastSent='',lastTime=0;
 const diagnostics={waiting:0,stalled:0,errors:0};
 let startupId='',startupSince=0,started=false,restoring=false;
 function videoId(){try{return youtube?new URL(location.href).searchParams.get('v')||'':'';}catch(_){return '';}}
 function read(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch(_){return null;}}
 function prepareReload(){
  const m=media(),id=videoId();
  if(m&&id)try{sessionStorage.setItem('cleartube.reload',JSON.stringify({id,until:Date.now()+20000,playing:!m.paused&&!m.ended,muted:m.muted,position:Number.isFinite(m.currentTime)?m.currentTime:0}));}catch(_){}
 }
 // A fresh watch document avoids the mobile site's stalled SPA player hand-off.
 document.addEventListener('click',e=>{
  if(!youtube||e.defaultPrevented||e.button>0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const a=e.target&&e.target.closest&&e.target.closest('a[href]');
  if(!a||a.hasAttribute('download')||(a.target&&a.target!=='_self'))return;
  let u;try{u=new URL(a.href,location.href);}catch(_){return;}
  const id=u.searchParams.get('v');
  if(u.origin!==new URL(location.href).origin||u.pathname!=='/watch'||!id||id===videoId())return;
  try{
   sessionStorage.setItem('cleartube.reload',JSON.stringify({id,until:Date.now()+20000,playing:true,muted:false,position:0}));
   sessionStorage.setItem('cleartube.startupRetry','null');
  }catch(_){return;}
  e.preventDefault();e.stopImmediatePropagation();location.href=u.href;
 },true);
 function restoreReload(m){
  if(restoring||!m||m.readyState<1)return;
  const r=read('cleartube.reload');
  if(!r||r.id!==videoId()||r.until<Date.now()||document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting'))return;
  restoring=true;
  try{
   if(!r.seekDone&&r.position>0&&Number.isFinite(m.duration)&&m.duration>0)m.currentTime=Math.min(r.position,m.duration);
   r.seekDone=true;sessionStorage.setItem('cleartube.reload',JSON.stringify(r));
   if(m.muted!==r.muted)m.muted=r.muted;
   if(r.playing&&m.paused)m.play().catch(()=>{});else if(!r.playing&&!m.paused)m.pause();
  }finally{restoring=false;}
 }
 function dismissAutoplayMute(){
  if(!youtube)return;
  const m=media(),r=read('cleartube.reload');
  if(!m||(r&&r.id===videoId()&&r.until>Date.now()&&r.muted)||document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting'))return;
  const prompt=document.querySelector('.ytp-unmute');
  if(!prompt||!prompt.getClientRects().length)return;
  // Activate the site's own autoplay-unmute action so its UI and audio agree.
  // A normal intentional mute has no autoplay prompt and is left alone.
  prompt.click();
  const p=player();if(p&&typeof p.unMute==='function')p.unMute();
  m.muted=false;
  if(window.ClearTubeAudio)window.ClearTubeAudio.resume().catch(()=>{});
  if(!m.muted)prompt.style.display='none';
 }
 function checkStartup(){
  const id=videoId(),m=media();
  if(id!==startupId){startupId=id;startupSince=0;started=false;}
  restoreReload(m);
  dismissAutoplayMute();
  if(!id||!m||started)return;
  if(m.currentTime>0.1&&m.readyState>=2){started=true;return;}
  // Recover only a requested first play with no decoded media, never a mid-song buffer.
  if(m.paused||m.readyState>=2||document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting')){startupSince=0;return;}
  if(!startupSince){startupSince=Date.now();return;}
  const previous=read('cleartube.startupRetry');
  if(Date.now()-startupSince<6000||(previous&&previous.id===id))return;
  try{sessionStorage.setItem('cleartube.startupRetry',JSON.stringify({id,at:Date.now()}));}catch(_){return;}
  prepareReload();started=true;location.reload();
 }
 // A listening browser keeps the page visible to site playback code while locked.
 if(youtube){
  for(const [key,value] of [['hidden',false],['visibilityState','visible']])try{Object.defineProperty(document,key,{configurable:true,get:()=>value});}catch(_){}
  document.addEventListener('visibilitychange',e=>e.stopImmediatePropagation(),true);
 }
 if(navigator.mediaSession){
  const original=navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);
  navigator.mediaSession.setActionHandler=function(name,fn){handlers[name]=fn;return original(name,fn);};
 }
 function media(){
  if(lastMedia&&lastMedia.isConnected&&!lastMedia.paused)return lastMedia;
  const list=Array.from(document.querySelectorAll('video,audio'));
  return list.find(m=>!m.paused&&!m.ended)||list.find(m=>m.currentSrc||m.src)||null;
 }
 function queue(){
  let q={urls:[],index:-1};
  if(!youtube)return q;
  try{
   q=JSON.parse(sessionStorage.getItem('cleartube.queue')||'null')||q;
   const u=new URL(location.href),id=u.searchParams.get('v');if(!id)return q;
   const current=u.origin+'/watch?v='+encodeURIComponent(id)+(u.searchParams.get('list')?'&list='+encodeURIComponent(u.searchParams.get('list')):'');
   if(q.urls[q.index]!==current){const found=q.urls.indexOf(current);if(found>=0)q.index=found;else{q.urls=q.urls.slice(0,q.index+1);q.urls.push(current);q.urls=q.urls.slice(-40);q.index=q.urls.length-1;}sessionStorage.setItem('cleartube.queue',JSON.stringify(q));}
  }catch(_){q={urls:[],index:-1};}
  return q;
 }
 function button(direction){return document.querySelector(direction==='next'?'.ytp-next-button:not([aria-disabled="true"])':'.ytp-prev-button:not([aria-disabled="true"])');}
 function player(){return document.getElementById('movie_player');}
 function state(){
  const m=media(),metadata=navigator.mediaSession&&navigator.mediaSession.metadata,q=queue(),p=player();
  return {playing:!!(m&&!m.paused&&!m.ended),title:String(metadata&&metadata.title||document.title||'AudiVox').slice(0,180),artist:String(metadata&&metadata.artist||'').slice(0,120),
   position:m&&Number.isFinite(m.currentTime)?Math.round(m.currentTime*1000):0,duration:m&&Number.isFinite(m.duration)?Math.round(m.duration*1000):0,
   next:!!(handlers.nexttrack||button('next')||(p&&typeof p.nextVideo==='function')||q.index<q.urls.length-1),
   previous:!!(handlers.previoustrack||button('previous')||q.index>0)};
 }
 function unmuteRemote(m){
  try{if(m&&m.muted&&Date.now()<Number(sessionStorage.getItem('cleartube.remotePlayUntil')||0)&&!document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting'))m.muted=false;}catch(_){}
 }
 document.addEventListener('pointerdown',()=>{try{sessionStorage.setItem('cleartube.remotePlayUntil','0');sessionStorage.setItem('cleartube.reload','null');sessionStorage.setItem('cleartube.startupRetry','null');}catch(_){}},true);
 function publish(force){
  unmuteRemote(media());
  const s=state(),key=JSON.stringify({...s,position:0});
  if(!force&&key===lastSent&&Date.now()-lastTime<3000)return;
  lastSent=key;lastTime=Date.now();
  const payload=JSON.stringify(s);if(window.ClearTubePlayback)window.ClearTubePlayback.postMessage(payload);else if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.ClearTubePlayback)window.webkit.messageHandlers.ClearTubePlayback.postMessage(payload);
 }
 async function command(action,position){
  try{sessionStorage.setItem('cleartube.reload','null');}catch(_){}
  const m=media(),name={next:'nexttrack',previous:'previoustrack',seek:'seekto'}[action]||action;
  if(action==='pause'){try{sessionStorage.setItem('cleartube.remotePlayUntil','0');}catch(_){}if(m)m.pause();}
  else if(action==='play'){if(m){m.muted=false;await m.play();if(window.ClearTubeAudio)window.ClearTubeAudio.resume();}}
  else if(action==='seek'){if(m&&Number.isFinite(m.duration))m.currentTime=Math.max(0,Math.min(m.duration,Number(position)/1000));}
  else if(action==='next'||action==='previous'){
   // YouTube may otherwise start the new video muted after remote navigation.
   try{sessionStorage.setItem('cleartube.remotePlayUntil',String(Date.now()+15000));}catch(_){}
   if(handlers[name]){handlers[name]({action:name});}
   else{
    const q=queue(),target=q.index+(action==='next'?1:-1),p=player(),b=button(action);
    if(target>=0&&target<q.urls.length){q.index=target;sessionStorage.setItem('cleartube.queue',JSON.stringify(q));location.href=q.urls[target];}
    else if(b){b.click();}
    else if(action==='next'&&p&&typeof p.nextVideo==='function'){p.nextVideo();}
   }
  }
  publish(true);
 }
 for(const name of ['play','playing','pause','ended','durationchange','loadedmetadata','waiting','stalled','error','volumechange'])document.addEventListener(name,e=>{
  if(!(e.target instanceof HTMLMediaElement))return;lastMedia=e.target;
  if(name==='loadedmetadata'||name==='playing'||name==='volumechange')restoreReload(e.target);
  if(name==='play'||name==='playing'||name==='loadedmetadata'||name==='volumechange'){
   try{if(Date.now()<Number(sessionStorage.getItem('cleartube.remotePlayUntil')||0)){
    unmuteRemote(e.target);if(name==='loadedmetadata'&&e.target.paused)e.target.play().catch(()=>{});
   }}catch(_){}
  }
  if(name==='waiting')diagnostics.waiting++;if(name==='stalled')diagnostics.stalled++;if(name==='error')diagnostics.errors++;
  publish(true);
 },true);
 window.ClearTubeMedia={command,state,publish,prepareReload,inspect:()=>({...state(),diagnostics:{...diagnostics}})};
 setInterval(checkStartup,1000);
 setInterval(()=>publish(false),2000);
})();
