const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const fx=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/fx-adapted.js'),'utf8');
const dsp=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/dsp.js'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/audio.js'),'utf8');
function fixture(src='https://example.test/a.mp3',extra={}){
 const nodes=[],timers=[],handlers={};let creations=0,buffers=0;
 const param=(value=0)=>({value,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;}});
 const node=kind=>{const n={kind,connections:[],connect(x){this.connections.push(x);},disconnect(target){this.connections=target?this.connections.filter(x=>x!==target):[];}};nodes.push(n);return n;};
 class Media{}const media=Object.assign(new Media(),{src,currentSrc:src,paused:false,readyState:4,isConnected:true,crossOrigin:'',mediaKeys:null},extra);
 class AudioContext{
 constructor(){this.destination=node('destination');this.currentTime=0;this.state='running';this.sampleRate=48000;}
 createMediaElementSource(){creations++;return node('source');}
 createGain(){return Object.assign(node('gain'),{gain:param(1)});}
 createBiquadFilter(){return Object.assign(node('filter'),{frequency:param(),Q:param(),gain:param()});}
 createDynamicsCompressor(){return Object.assign(node('compressor'),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,param()])));}
 createIIRFilter(feed,back){return Object.assign(node('iir'),{feed,back});}
 createWaveShaper(){return node('guard');}
 createDelay(){return Object.assign(node('delay'),{delayTime:param()});}
 createChannelSplitter(){return node('splitter');}
 createChannelMerger(){return node('merger');}
 createConvolver(){return Object.assign(node('room'),{buffer:null});}
 createBuffer(c,n,rate){buffers++;const data=Array.from({length:c},()=>new Float32Array(n));return {length:n,sampleRate:rate,getChannelData(c){return data[c];}};}
 createAnalyser(){return Object.assign(node('meter'),{getFloatTimeDomainData(b){b.fill(.1);}});}
 resume(){return Promise.resolve();}
 }
 const window={AudioContext};const document={querySelectorAll(){return [media];},addEventListener(e,fn){handlers[e]=fn;}};
 vm.runInNewContext(fx+"\n"+dsp+"\n"+code,{window,document,location:{href:'https://example.test/',origin:'https://example.test'},URL,HTMLMediaElement:Media,Float32Array,setInterval(fn){timers.push(fn);}});
 return {window,nodes,timers,handlers,media,get creations(){return creations;},get buffers(){return buffers;},apply(s={}){window.ClearTubeAudio.apply({enabled:true,...s});}};
}
test('disabled effects never take over the media source',()=>{const f=fixture();f.apply({enabled:false});f.timers[0]();assert.equal(f.creations,0);});
test('unsafe and protected media remain untouched',()=>{for(const f of [fixture('https://other.test/a'),fixture(undefined,{mediaKeys:{}})]){f.apply();assert.equal(f.creations,0);}});
test('Bass Mid and Treble combine independently and old single choice migrates',()=>{const f=fixture(),normalize=f.window.ClearTubeDSP.settings;assert.deepEqual(Array.from(normalize({eqBass:1,eqMid:-1,eqTreble:1}).tone),[1,-1,1]);assert.deepEqual(Array.from(normalize({equalizer:4}).tone),[0,1,0]);assert.deepEqual(Array.from(normalize({equalizer:4,eqMid:0,eqBass:1}).tone),[1,0,0]);});
test('repeated play and preset changes reuse one media source',()=>{const f=fixture();f.apply({eqBass:1});f.handlers.play({target:f.media});f.apply({eqMid:1,reverbPreset:2});assert.equal(f.creations,1);assert.equal(f.window.ClearTubeAudio.inspect().graphs,1);});
test('bypass restores dry audio without rebuilding the graph',()=>{const f=fixture();f.apply();f.apply({enabled:false});const output=f.nodes.find(n=>n.kind==='gain'&&n.connections.some(x=>x.kind==='destination'));const routes=f.nodes.filter(n=>n.kind==='gain'&&n.connections.includes(output));assert.deepEqual(routes.map(n=>n.gain.value),[0,1]);assert.equal(f.creations,1);});
test('stereo room impulses have unit energy and distinct channels',()=>{const f=fixture();f.apply({reverbPreset:2});const rooms=f.nodes.filter(n=>n.kind==='room'&&n.buffer);assert.equal(rooms.length,2);const b=rooms.find(n=>n.buffer.length===134400).buffer;const a=b.getChannelData(0),right=b.getChannelData(1);const energy=a.reduce((sum,v)=>sum+v*v,0);assert.ok(Math.abs(energy-1)<.00001);assert.ok(a.every(Number.isFinite));assert.notDeepEqual(a,right);});
test('changing amount and EQ does not regenerate room impulse',()=>{const f=fixture();f.apply({reverbPreset:1});const count=f.buffers;f.apply({reverbPreset:1,reverbAmount:8,eqBass:1});assert.equal(f.buffers,count);f.apply({reverbPreset:4});assert.equal(f.buffers,count+1);});
test('ambience can be enabled while long reverb is off',()=>{const f=fixture();f.apply({ambience:100,reverbPreset:0});const rooms=f.nodes.filter(n=>n.kind==='room');assert.ok(rooms[0].connections[0].gain.value>0);assert.equal(rooms[1].connections[0].gain.value,0);assert.equal(rooms[2].connections[0].gain.value,0);});
test('invalid inputs clamp without creating an invalid room',()=>{const f=fixture();f.apply({reverbPreset:999,reverbAmount:999,eqBass:99,clarity:-99});const s=f.window.ClearTubeAudio.inspect().settings;assert.equal(s.reverbPreset,4);assert.equal(s.reverbAmount,10);assert.equal(s.tone[0],2);assert.equal(s.clarity,0);});
test('silent processed output never reports success from input alone',()=>{const f=fixture();f.apply();const meters=f.nodes.filter(n=>n.kind==='meter');meters[1].getFloatTimeDomainData=b=>b.fill(0);for(let i=0;i<9;i++)f.timers[0]();assert.match(f.window.ClearTubeAudio.status,/No processed output/);});
test('muted player reports unmute instead of an EQ error',()=>{const f=fixture(undefined,{muted:true,volume:1});f.apply();f.timers[0]();assert.match(f.window.ClearTubeAudio.status,/Player is muted/);});
test('detached elements release graphs and reuse their media source when reattached',()=>{const f=fixture();f.apply();f.media.isConnected=false;f.timers[0]();assert.equal(f.window.ClearTubeAudio.inspect().graphs,0);f.media.isConnected=true;f.timers[0]();assert.equal(f.creations,1);assert.equal(f.window.ClearTubeAudio.inspect().graphs,1);});

test('startup defaults are enabled and completely neutral',()=>{const f=fixture(),s=f.window.ClearTubeDSP.settings({});assert.equal(s.enabled,true);assert.equal(f.window.ClearTubeDSP.neutral(s),true);assert.equal(s.reverbAmount,0);});
test('reset to zero restores an exact dry route without rebuilding media',()=>{const f=fixture();f.apply({clarity:80,bass:70});f.apply({});const output=f.nodes.find(n=>n.kind==='gain'&&n.connections.some(x=>x.kind==='destination'));const routes=f.nodes.filter(n=>n.kind==='gain'&&n.connections.includes(output));assert.deepEqual(routes.map(n=>n.gain.value),[0,1]);assert.equal(f.creations,1);});

test('neutral audio disconnects the processing input; EQ reconnects it once',()=>{const f=fixture();f.apply();const source=f.nodes.find(n=>n.kind==='source');assert.equal(source.connections.filter(n=>n.kind==='filter').length,0);f.apply({clarity:40});f.apply({clarity:50});assert.equal(source.connections.filter(n=>n.kind==='filter').length,1);f.apply();assert.equal(source.connections.filter(n=>n.kind==='filter').length,0);});
test('unused convolution inputs are disconnected during steady playback',()=>{const f=fixture();f.apply({clarity:50});const rooms=f.nodes.filter(n=>n.kind==='room');for(const room of rooms)assert.equal(f.nodes.some(n=>n.connections.includes(room)&&n.kind==='filter'),false);f.apply({ambience:40});assert.equal(f.nodes.some(n=>n.connections.includes(rooms[0])&&n.kind==='filter'),true);f.apply({clarity:30});assert.equal(f.nodes.some(n=>n.connections.includes(rooms[0])&&n.kind==='filter'),false);});

test('Bass ++ combines with independent mid/treble and resets to neutral',()=>{const f=fixture();f.apply({eqBass:2,eqMid:-1,eqTreble:1});assert.deepEqual(Array.from(f.window.ClearTubeAudio.inspect().settings.tone),[2,-1,1]);f.apply({});assert.deepEqual(Array.from(f.window.ClearTubeAudio.inspect().settings.tone),[0,0,0]);});
