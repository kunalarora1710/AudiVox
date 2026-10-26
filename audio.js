(()=>{
 'use strict';
 if(window.ClearTubeAudio)return;
 const graphs=new Map(),sources=new WeakMap(),DSP=window.ClearTubeDSP;
 let ctx,raw={},settings=DSP.settings({});
 function resumeCtx(){
  if(!ctx)return Promise.resolve();
  if(ctx.state==='suspended'||ctx.state==='interrupted'||ctx.state!=='running'){
   try{return Promise.resolve(ctx.resume()).catch(()=>{});}catch(_){return Promise.resolve();}
  }
  return Promise.resolve();
 }
 const api=window.ClearTubeAudio={resume:resumeCtx,status:'Original audio • all values zero',apply,inspect:()=>({graphs:graphs.size,settings,context:ctx?ctx.state:'none',levels:Array.from(graphs.values()).map(g=>g.levels||{})})};
 function apply(s){raw=s;settings=DSP.settings(s);graphs.forEach(g=>g.processor.update(s));if(ctx&&settings.enabled)resumeCtx();api.status=DSP.neutral(settings)?'Original audio • all values zero':'Effects ready. Tap Play inside the page.';scan();}
 function eligible(m){
  if(m.mediaKeys)return false;
  try{const u=new URL(m.currentSrc||m.src,location.href);return !!(m.currentSrc||m.src)&&(u.origin===location.origin||u.protocol==='blob:'||u.protocol==='data:'||u.protocol==='audivox-assets:'||!!m.crossOrigin);}catch(_){return false;}
 }
 function createAudioContext(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  try{return new AC({latencyHint:"playback"});}catch(_){return new AC();}
 }
 function attach(media){
  if(!settings.enabled||graphs.has(media))return;
  if(!eligible(media)){api.status='This video cannot be safely processed. Original audio continues.';return;}
  let source;
  try{
   ctx=ctx||createAudioContext();source=sources.get(media)||ctx.createMediaElementSource(media);sources.set(media,source);
   const processor=DSP.create(ctx,source,raw);processor.output.connect(ctx.destination);graphs.set(media,{processor,silent:0,source,inputBuffer:new Float32Array(1024),outputBuffer:new Float32Array(1024)});resumeCtx();
   api.status='Audio connected. Waiting for a signal…';
  }catch(_){if(source&&ctx){source.disconnect();source.connect(ctx.destination);}api.status='Effects unavailable. Use Menu → Reset to original audio if silent.';}
 }
 function scan(){if(settings.enabled)document.querySelectorAll('video,audio').forEach(m=>{if(!m.paused&&m.readyState>=2)attach(m);});}
 function level(meter,b){meter.getFloatTimeDomainData(b);let sq=0,peak=0;for(let i=0;i<b.length;i++){sq+=b[i]*b[i];peak=Math.max(peak,Math.abs(b[i]));}return {rms:Math.sqrt(sq/b.length),peak};}
 for(const event of ['play','playing','loadeddata'])document.addEventListener(event,e=>{if(e.target instanceof HTMLMediaElement)attach(e.target);},true);
 for(const gesture of ['pointerup','touchend','click'])document.addEventListener(gesture,()=>{if(settings.enabled){if(ctx)resumeCtx();scan();}},true);
 setInterval(()=>{
  scan();graphs.forEach((g,m)=>{
   if(!m.isConnected){g.source.disconnect();g.processor.dispose();graphs.delete(m);return;}
   if(settings.enabled&&!m.paused&&ctx&&(ctx.state==='suspended'||ctx.state==='interrupted'))resumeCtx();
   if(!settings.enabled||m.paused||ctx.state!=='running')return;
   const input=level(g.processor.inputMeter,g.inputBuffer),output=level(g.processor.outputMeter,g.outputBuffer);g.levels={input,output};
   if(m.muted||m.volume===0){api.status='Player is muted. Tap the video to unmute.';return;}
   if(output.peak>.00001){g.silent=0;api.status=DSP.neutral(settings)?'Original audio • all values zero':'Processed audio active'+(settings.reverbPreset?' • '+DSP.rooms[settings.reverbPreset].name:'');}
   else if(++g.silent>=8)api.status=input.peak>.00001?'No processed output. Use Menu → Reset to original audio.':'No audio signal. Check playback or use Reset to original audio.';
  });
 },2000);
})();
