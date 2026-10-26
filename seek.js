(function(){
 'use strict';
 if(window.AudiVoxSeek||!/(^|\.)youtube\.com$/.test(location.hostname))return;
 const selector='.ytPlayerProgressBarDragContainer,.ytp-progress-bar';
 let down=null;
 function bar(target){return target&&target.closest?target.closest(selector):null;}
 function seek(target,x){
  const track=bar(target),videos=Array.from(document.querySelectorAll('video'));
  const video=videos.find(v=>!v.paused)||videos[0];
  if(!track||!video||!Number.isFinite(video.duration)||video.duration<=0||document.querySelector('.ad-showing,.ad-interrupting'))return false;
  const rect=track.getBoundingClientRect();
  if(rect.width<=0||!Number.isFinite(x))return false;
  const time=Math.max(0,Math.min(1,(x-rect.left)/rect.width))*video.duration;
  // Coordinates and bounding box use the same viewport space, including page zoom.
  if(window.ClearTubeMedia)window.ClearTubeMedia.command('seek',time*1000).catch(()=>{});
  else video.currentTime=time;
  return true;
 }
 document.addEventListener('pointerdown',e=>{down=e.isPrimary!==false&&e.button===0&&bar(e.target)?{id:e.pointerId,x:e.clientX,y:e.clientY,target:e.target}:null;},true);
 document.addEventListener('pointercancel',()=>{down=null;},true);
 document.addEventListener('pointerup',e=>{
  const start=down;down=null;
  if(!start||e.pointerId!==start.id||Math.hypot(e.clientX-start.x,e.clientY-start.y)>12)return;
  if(seek(start.target,e.clientX)){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 document.addEventListener('click',e=>{if(e.detail>0&&e.button===0&&seek(e.target,e.clientX)){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.AudiVoxSeek={seek};
})();
