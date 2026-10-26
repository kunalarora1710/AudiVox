/* SPDX-License-Identifier: AGPL-3.0-or-later
 * FxSound DSP algorithms: Copyright (C) 2025 FxSound LLC.
 * ClearTube Web Audio adaptation, modified 2026-10-10.
 * See THIRD_PARTY_NOTICES.md for pinned source files and modifications.
 * This is a partial adaptation, not the complete FxSound processing engine.
 */
(function(root){
 'use strict';
 if(root.ClearTubeFX)return;
 const tune=500*Math.pow(20,53/127),driveMax=(2*Math.PI/4*1.8*2*.75)*.8;
 function highpass(rate){
  const w=2*Math.PI*tune/rate,w2=w*w,r=2*Math.SQRT2*w,t=1/(4+w2+r),g=4*t;
  return {feed:[g,-2*g,g],back:[1,-(8-2*w2)*t,-(r-4-w2)*t]};
 }
 let sineCurve;
 function aural(ctx,keep,gain,source){
  const c=highpass(ctx.sampleRate),hp=keep(ctx.createIIRFilter(c.feed,c.back)),drive=gain(0),shape=keep(ctx.createWaveShaper()),out=gain(1);
  // Domain +/-8 prevents clamping normal filter peaks before applying sin().
  const curve=sineCurve||(sineCurve=new Float32Array(32769));
  if(!curve[0])for(let i=0;i<curve.length;i++)curve[i]=.377953*1.5*Math.sin(8*(i*2/(curve.length-1)-1));
  shape.curve=curve;shape.oversample='none';
  source.connect(out);source.connect(hp);hp.connect(drive);drive.connect(shape);shape.connect(out);
  return {output:out,drive:drive.gain,scale:driveMax/8};
 }
 function surround(ctx,keep,gain,source){
  const split=keep(ctx.createChannelSplitter(2)),merge=keep(ctx.createChannelMerger(2));
  const ll=gain(1),lr=gain(0),rl=gain(0),rr=gain(1);
  source.connect(split);split.connect(ll,0);split.connect(lr,0);split.connect(rl,1);split.connect(rr,1);
  ll.connect(merge,0,0);rl.connect(merge,0,0);lr.connect(merge,0,1);rr.connect(merge,0,1);
  return {output:merge,update(amount,set,immediate){
   const intensity=.7*amount/100,mid=1-.3*intensity,side=1+3*intensity;
   [ll,rr].forEach(n=>set(n.gain,(mid+side)/2,immediate));
   [lr,rl].forEach(n=>set(n.gain,(mid-side)/2,immediate));
  }};
 }
 root.ClearTubeFX={aural,surround,highpass,tune,driveMax};
})(typeof window!=='undefined'?window:globalThis);
