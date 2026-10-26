(function(root){
 'use strict';
 if(root.ClearTubeDSP)return;
 const legacy=[[0,0,0],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
 const rooms=[{name:'Off',decay:0,delay:0},{name:'Medium room',decay:1.1,delay:.012},{name:'Concert hall',decay:2.8,delay:.028},{name:'Cathedral',decay:4.5,delay:.042},{name:'Huge cathedral',decay:6.5,delay:.055}];
 const clamp=(v,d,lo,hi)=>Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):d;
 function settings(s){
  s=s||{};const old=legacy[Math.round(clamp(s.equalizer,0,0,6))];
  const tone=['eqBass','eqMid','eqTreble'].map((k,i)=>Math.round(clamp(s[k],old[i],-1,i===0?2:1)));
  return {enabled:s.enabled!==false,tone:tone,clarity:clamp(s.clarity,0,0,100),ambience:clamp(s.ambience,0,0,100),width:clamp(s.width,0,0,100),dynamics:clamp(s.dynamics,0,0,100),bass:clamp(s.bass,0,0,100),reverbPreset:Math.round(clamp(s.reverbPreset,0,0,4)),reverbAmount:clamp(s.reverbAmount,0,0,10)};
 }
 // Unit-energy stereo impulse: room length no longer silently determines loudness.
 // Independent channels, early reflections and increasingly damped late diffusion.
 function impulse(ctx,decay,seed){
  const rate=ctx.sampleRate,length=Math.ceil(decay*rate),b=ctx.createBuffer(2,length,rate);
  for(let c=0;c<2;c++){
   const a=b.getChannelData(c);let state=(seed+c*7919)>>>0,low=0,energy=0;
   for(let i=0;i<length;i++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const t=i/rate,damping=.3+.55*(i/length);
    low=damping*low+(1-damping)*(state/2147483648-1);
    const onset=Math.min(1,Math.max(0,(t-.008)/.035));
    a[i]=low*Math.exp(-6.908*t/decay)*onset;
   }
   const taps=[.013,.021,.034,.051,.079];
   taps.forEach((t,i)=>{const n=Math.floor((t+c*.0017*(i+1))*rate);if(n<length)a[n]+=(i%2?-1:1)*.45*Math.exp(-i*.3);});
   for(let i=0;i<length;i++)energy+=a[i]*a[i];
   const scale=1/Math.sqrt(Math.max(1e-12,energy));
   for(let i=0;i<length;i++)a[i]*=scale;
  }
  return b;
 }
 let safetyCurve;
 function ceiling(){
  if(safetyCurve)return safetyCurve;
  safetyCurve=new Float32Array(8193);
  for(let i=0;i<safetyCurve.length;i++){
   const x=i*2/(safetyCurve.length-1)-1,a=Math.abs(x);
   safetyCurve[i]=Math.sign(x)*(a<=.85?a:.85+.13*(1-Math.exp(-(a-.85)/.13)));
  }
  return safetyCurve;
 }
 function create(ctx,source,initial){
  const nodes=[],keep=n=>(nodes.push(n),n),routes=[];
  let disposed=false;
  function route(from,to){
   const r={on:false,wanted:false,from,to};routes.push(r);return r;
  }
  function enable(r,on,immediate){
   r.wanted=on;
   if(on&&!r.on){r.from.connect(r.to);r.on=true;}
   if(!on&&r.on){const stop=()=>{if(!disposed&&!r.wanted&&r.on){r.from.disconnect(r.to);r.on=false;}};
    if(immediate||!root.setTimeout)stop();else root.setTimeout(stop,300);
   }
  }
  const gain=v=>{const n=keep(ctx.createGain());n.gain.value=v;return n;};
  const filter=(type,hz,q)=>{const n=keep(ctx.createBiquadFilter());n.type=type;n.frequency.value=Math.min(hz,ctx.sampleRate*.45);n.Q.value=q||.707;return n;};
  const connect=(...chain)=>{for(let i=0;i<chain.length-1;i++)chain[i].connect(chain[i+1]);};
  const set=(p,v,now)=>{if(now)p.setValueAtTime(v,ctx.currentTime);else p.setTargetAtTime(v,ctx.currentTime,.045);};
  const eq=[filter('lowshelf',220),filter('peaking',1100,.65),filter('highshelf',4000)];
  const bass=filter('peaking',90,2.5);
  connect(...eq);const inputRoute=route(source,eq[0]);const clarity=root.ClearTubeFX.aural(ctx,keep,gain,eq[2]);
  const trim=gain(1),compressor=keep(ctx.createDynamicsCompressor()),makeup=gain(1),stereo=gain(1),sum=gain(1);
  compressor.knee.value=18;compressor.attack.value=.025;compressor.release.value=.25;
  stereo.channelCount=2;stereo.channelCountMode='explicit';
  connect(clarity.output,bass,trim,compressor,makeup,stereo);
  const width=root.ClearTubeFX.surround(ctx,keep,gain,stereo);width.output.connect(sum);
  // Short diffuse space is separate from the selectable long room.
  const sendHP=filter('highpass',180),sendLP=filter('lowpass',7200),amb=keep(ctx.createConvolver()),ambGain=gain(0);
  connect(makeup,sendHP,sendLP);amb.normalize=false;amb.buffer=impulse(ctx,.42,2731);connect(amb,ambGain,sum);const ambRoute=route(sendLP,amb);
  const slots=[0,1].map(()=>{
   const delay=keep(ctx.createDelay(.1)),room=keep(ctx.createConvolver()),wet=gain(0);
   room.normalize=false;connect(delay,room,wet,sum);return {delay,room,wet,route:route(sendLP,delay)};
  });
  const limiter=keep(ctx.createDynamicsCompressor()),guard=keep(ctx.createWaveShaper()),wet=gain(0),dry=gain(1),output=gain(1);
  limiter.threshold.value=0;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.12;
  guard.curve=ceiling();guard.oversample='2x';connect(sum,limiter,guard,wet,output);connect(source,dry,output);
  const inputMeter=keep(ctx.createAnalyser()),outputMeter=keep(ctx.createAnalyser());inputMeter.fftSize=1024;outputMeter.fftSize=1024;source.connect(inputMeter);output.connect(outputMeter);
  let s,active=0,roomIndex=0,ambStep=0;
  function update(raw,immediate){
   s=settings(raw);const c=s.clarity/100;
   eq.forEach((n,i)=>set(n.gain,s.tone[i]*6,immediate));
   set(bass.gain,s.bass*.15,immediate);
   set(clarity.drive,c*clarity.scale,immediate);
   // Leave Clarity's dry vocal intact; reserve headroom only for large tone boosts.
   const boost=Math.max(0,s.tone[0]*6+s.bass*.15,s.tone[1]*6,s.tone[2]*6);
   set(trim.gain,Math.pow(10,-Math.max(0,boost-6)*.35/20),immediate);
   // Browser compressor includes automatic makeup gain. Do not attenuate it again.
   set(compressor.threshold,-24,immediate);set(compressor.ratio,1+s.dynamics*.025,immediate);set(makeup.gain,1,immediate);
   width.update(s.width,set,immediate);
   const nextAmb=Math.round(s.ambience/10);
   if(nextAmb!==ambStep){ambStep=nextAmb;amb.buffer=impulse(ctx,.25+1.2*nextAmb/10,2731);}
   set(ambGain.gain,s.ambience*.00273,immediate);enable(ambRoute,s.enabled&&s.ambience>0,immediate);
   if(s.reverbPreset!==roomIndex){
    if(s.reverbPreset){
     active=1-active;const slot=slots[active],r=rooms[s.reverbPreset];slot.delay.delayTime.value=r.delay;slot.room.buffer=impulse(ctx,r.decay,6871+s.reverbPreset*101);
    }
    roomIndex=s.reverbPreset;
   }
   slots.forEach((slot,i)=>{const on=s.enabled&&s.reverbPreset&&s.reverbAmount>0&&i===active;set(slot.wet.gain,on?s.reverbAmount*.065:0,immediate);enable(slot.route,!!on,immediate);});
   const activeSound=s.enabled&&!neutral(s);enable(inputRoute,activeSound,immediate);
   set(wet.gain,activeSound?1:0,immediate);set(dry.gain,activeSound?0:1,immediate);
  }
  update(initial,true);
  return {output,update,inputMeter,outputMeter,inspect:()=>({settings:s,room:rooms[roomIndex].name,decay:rooms[roomIndex].decay}),dispose:()=>{disposed=true;nodes.forEach(n=>n.disconnect());}};
 }
 function neutral(s){return !s.clarity&&!s.ambience&&!s.width&&!s.dynamics&&!s.bass&&!s.tone.some(Boolean)&&!(s.reverbPreset&&s.reverbAmount);}
 root.ClearTubeDSP={settings,create,impulse,rooms,neutral};
})(typeof window!=='undefined'?window:globalThis);
