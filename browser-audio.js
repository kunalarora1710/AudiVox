// Run in Chromium/WebView with dsp.js loaded. Renders the actual production graph.
async function runAudioMeasurements(rate=48000){
 const results=[],neutral={enabled:true,clarity:0,ambience:0,width:0,dynamics:0,bass:0,reverbPreset:0,reverbAmount:0,eqBass:0,eqMid:0,eqTreble:0};
 async function render(opts,kind='tone',duration=2){
  const ctx=new OfflineAudioContext(2,Math.round(rate*duration),rate),src=ctx.createBufferSource(),b=ctx.createBuffer(2,ctx.length,rate);
  let seed=12345;
  for(let i=0;i<b.length;i++){
   const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
   let l=.2*Math.sin(2*Math.PI*1000*t),r=l;
   if(typeof kind==='number'){l=.08*Math.sin(2*Math.PI*kind*t);r=l;}
   if(kind==='burst'){l=t<.25?noise*.3:0;r=l;}
   if(kind==='stereo'){l=.14*Math.sin(2*Math.PI*1000*t)+.12*Math.sin(2*Math.PI*2500*t);r=.14*Math.sin(2*Math.PI*1000*t)-.12*Math.sin(2*Math.PI*2500*t);}
   if(kind==='stress'){l=.8*Math.sin(2*Math.PI*80*t)+.5*Math.sin(2*Math.PI*2300*t)+.2*noise;r=.8*Math.sin(2*Math.PI*90*t)+.5*Math.sin(2*Math.PI*3700*t)-.2*noise;}
   b.getChannelData(0)[i]=l;b.getChannelData(1)[i]=r;
  }
  src.buffer=b;const graph=ClearTubeDSP.create(ctx,src,Object.assign({},neutral,opts));graph.output.connect(ctx.destination);src.start();const output=await ctx.startRendering();
  return [output.getChannelData(0),output.getChannelData(1)];
 }
 const rms=(a,start,end)=>{let e=0;const lo=Math.floor(start*rate),hi=Math.min(a.length,Math.floor(end*rate));for(let i=lo;i<hi;i++)e+=a[i]*a[i];return Math.sqrt(e/Math.max(1,hi-lo));};
 const db=x=>20*Math.log10(Math.max(1e-12,x));
 const peak=a=>{let p=0;for(const v of a){if(!Number.isFinite(v))return Infinity;p=Math.max(p,Math.abs(v));}return p;};
 const check=(name,pass,data)=>{results.push({name,pass,...data});};
 for(const [key,hz] of [['eqBass',60],['eqMid',1100],['eqTreble',12000]]){
  const original=await render({},hz);
  for(const sign of [-1,1]){
   const changed=await render({[key]:sign},hz);
   const changeDb=db(rms(changed[0],.5,1.5)/rms(original[0],.5,1.5));
   check(key+(sign>0?' boost':' cut')+' measurably changes its frequency range',sign*changeDb>5&&sign*changeDb<7,{changeDb});
  }
 }
 const bassPlus=await render({eqBass:1},60),bassDouble=await render({eqBass:2},60);
 const extraBassDb=db(rms(bassDouble[0],.5,1.5)/rms(bassPlus[0],.5,1.5));
 check('Bass ++ is stronger than Bass + with headroom',extraBassDb>3&&extraBassDb<5,{extraBassDb});
 const flat=await render({}),clear=await render({clarity:100});
 const ratio=db(rms(clear[0],.5,1.5)/rms(flat[0],.5,1.5));
 check('Clarity keeps vocal-range level within 3 dB',Math.abs(ratio)<3,{changeDb:ratio});
 check('Neutral graph retains nominal level',Math.abs(db(rms(flat[0],.5,1.5)/(.2/Math.sqrt(2))))<.2,{rms:rms(flat[0],.5,1.5)});
 let zeroError=0;for(let i=0;i<flat[0].length;i++)zeroError=Math.max(zeroError,Math.abs(flat[0][i]-Math.fround(.2*Math.sin(2*Math.PI*1000*i/rate))));
 check('Zero controls return unmodified samples',zeroError<1e-7,{maxError:zeroError});
 const monoWide=await render({width:100});const midRatio=rms(monoWide[0],.5,1.5)/rms(flat[0],.5,1.5);
 let stereoError=0;for(let i=0;i<monoWide[0].length;i++)stereoError=Math.max(stereoError,Math.abs(monoWide[0][i]-monoWide[1][i]));
 check('Surround keeps mono centered with FxSound mid scaling',Math.abs(midRatio-.79)<.025&&stereoError<.0001,{midRatio,stereoError});
 const stereo=await render({},'stereo'),wide=await render({width:100},'stereo');let mid0=0,mid1=0,side0=0,side1=0;
 for(let i=rate/2;i<rate*1.5;i++){mid0+=(stereo[0][i]+stereo[1][i])**2;mid1+=(wide[0][i]+wide[1][i])**2;side0+=(stereo[0][i]-stereo[1][i])**2;side1+=(wide[0][i]-wide[1][i])**2;}
 check('Surround matches FxSound 3.1x side and .79x mid gains',Math.abs(Math.sqrt(side1/side0)-3.1)<.08&&Math.abs(Math.sqrt(mid1/mid0)-.79)<.025,{sideRatio:Math.sqrt(side1/side0),midRatio:Math.sqrt(mid1/mid0)});
 const dynamic=await render({dynamics:100});const dynamicDb=db(rms(dynamic[0],.5,1.5)/rms(flat[0],.5,1.5));
 check('Dynamic Boost raises the quiet test tone',dynamicDb>0&&dynamicDb<12,{changeDb:dynamicDb});
 // Isolate Aural to compare rendered output with the original recurrence/sine equation.
 const ac=new OfflineAudioContext(2,rate,rate),source=ac.createBufferSource(),input=ac.createBuffer(2,rate,rate);
 for(let i=0;i<rate;i++){const x=.32*Math.sin(2*Math.PI*2200*i/rate);input.getChannelData(0)[i]=x;input.getChannelData(1)[i]=x;}
 source.buffer=input;const gain=v=>{const n=ac.createGain();n.gain.value=v;return n;};
 const aural=ClearTubeFX.aural(ac,n=>n,gain,source);aural.drive.value=aural.scale;aural.output.connect(ac.destination);source.start();const rendered=(await ac.startRendering()).getChannelData(0);
 const w=2*Math.PI*(500*20**(53/127))/rate,w2=w*w,t=1/(4+w2+2*Math.SQRT2*w),g=4*t,a1=(8-2*w2)*t,a0=(2*Math.SQRT2*w-4-w2)*t;
 let x1=0,x2=0,y1=0,y2=0,referenceError=0,harmonicReal=0,harmonicImag=0;
 for(let i=0;i<rate;i++){const x=input.getChannelData(0)[i],y=g*(x-2*x1+x2)+a1*y1+a0*y2;const expected=x+.377953*1.5*Math.sin(y*(2*Math.PI/4*1.8*2*.75*.8));referenceError=Math.max(referenceError,Math.abs(expected-rendered[i]));x2=x1;x1=x;y2=y1;y1=y;if(i>=rate/2){harmonicReal+=rendered[i]*Math.cos(2*Math.PI*6600*i/rate);harmonicImag+=rendered[i]*Math.sin(2*Math.PI*6600*i/rate);}}
 const harmonicAmplitude=4*Math.hypot(harmonicReal,harmonicImag)/rate;
 check('Clarity render matches the upstream Aural equation',referenceError<.00002,{maxError:referenceError});
 check('Clarity produces odd harmonics, not just an EQ boost',harmonicAmplitude>.001,{thirdHarmonicAmplitude:harmonicAmplitude});
 const amb=await render({ambience:100},'burst',2),room=await render({reverbPreset:1,reverbAmount:5},'burst',7),hall=await render({reverbPreset:2,reverbAmount:5},'burst',7),huge=await render({reverbPreset:4,reverbAmount:5},'burst',8);
 const ambTail=rms(amb[0],.3,.48),roomTail=rms(room[0],1.2,1.8),hallTail=rms(hall[0],1.2,1.8),hugeTail=rms(huge[0],2,3);
 check('Ambience generates a short audible-scale tail',ambTail>.0001,{tailRms:ambTail});
 check('Concert hall has a stronger late tail than medium room',hallTail>roomTail*4&&hallTail>.00001,{roomTailRms:roomTail,hallTailRms:hallTail});
 check('Huge cathedral retains a longer decay',hugeTail>rms(hall[0],2,3)*3,{tailRms:hugeTail,hallTailRms:rms(hall[0],2,3)});
 let lr=0,ll=0,rr=0;for(let i=Math.floor(rate/3);i<rate;i++){lr+=hall[0][i]*hall[1][i];ll+=hall[0][i]**2;rr+=hall[1][i]**2;}
 check('Room tail has stereo diffusion',Math.abs(lr/Math.sqrt(ll*rr))<.8,{correlation:lr/Math.sqrt(ll*rr)});
 const extreme=await render({clarity:100,ambience:100,width:100,dynamics:100,bass:100,reverbPreset:4,reverbAmount:10,eqBass:2,eqMid:1,eqTreble:1},'stress',3);
 const maximum=Math.max(peak(extreme[0]),peak(extreme[1]));check('All effects at maximum stay finite and below digital full scale',maximum<=1,{peak:maximum});
 return {sampleRate:rate,passed:results.filter(x=>x.pass).length,total:results.length,results};
}
