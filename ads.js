(()=>{
 'use strict';
 if(window.ClearTubeAds)return;
 let enabled=false,style=null,saved=null;
 const youtube=location.hostname==='youtube.com'||location.hostname.endsWith('.youtube.com');
 const originalParse=JSON.parse;
 function cleanPlayer(value){
   if(!enabled||!youtube||!value||typeof value!=='object')return value;
   // Only remove known advertising fields from identified player responses.
   const clean=p=>{if(p&&typeof p==='object'&&(p.videoDetails||p.playabilityStatus)){
     delete p.adPlacements;delete p.playerAds;delete p.adSlots;
   }};
   clean(value);clean(value.playerResponse);
   return value;
 }
 if(youtube){
   JSON.parse=function(...args){return cleanPlayer(originalParse.apply(this,args));};
   const originalFetch=window.fetch;
   if(originalFetch)window.fetch=async function(input,init){
     const response=await originalFetch.call(this,input,init);
     const url=typeof input==='string'?input:(input&&input.url);
     if(!enabled||!url)return response;
     let u;try{u=new URL(url,location.href);}catch(_){return response;}
     if(u.origin!==location.origin||!u.pathname.startsWith('/youtubei/v1/player')||!response.ok)return response;
     try{
       const value=cleanPlayer(originalParse(await response.clone().text()));
       const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');
       return new Response(JSON.stringify(value),{status:response.status,statusText:response.statusText,headers});
     }catch(_){return response;}
   };
 }
 function restore(){if(saved){saved.media.muted=saved.muted;saved=null;}}
 function setEnabled(on){enabled=!!on;if(!enabled){restore();if(style)style.remove();style=null;}}
 window.ClearTubeAds={setEnabled};
 function tick(){
   if(!enabled||!youtube)return;
   cleanPlayer(window.ytInitialPlayerResponse);
   if(!style&&document.documentElement){style=document.createElement('style');style.textContent='ytd-ad-slot-renderer,ytm-ad-slot-renderer,ytd-display-ad-renderer,ytm-promoted-sparkles-web-renderer,ytd-promoted-sparkles-web-renderer,.ytp-ad-overlay-container{display:none!important}';document.documentElement.appendChild(style);}
   // Only act inside an explicitly ad-marked player, never on normal playback.
   const player=document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting');
   if(!player){restore();return;}
   const video=player.querySelector('video');
   if(video){
     if(saved&&saved.media!==video)restore();
     if(!saved)saved={media:video,muted:video.muted};
     video.muted=true;
   }
   const skip=player.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
   if(skip&&!skip.disabled&&skip.getClientRects().length)skip.click();
 }
 setInterval(tick,350);
})();
