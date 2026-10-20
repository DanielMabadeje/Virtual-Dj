const $=(s,e=document)=>e.querySelector(s);
const COL=["#ffb02e","#3cd6c8","#ff5d73","#9b8cff"];
let ctx,fadeG,cueBus,hpMaster,hpOut,hpAudio,master,irBuf,sBus,recDest,cf=.5,lib=[];
const decks=[];

/* ---------- build deck UI ---------- */
COL.forEach((c,i)=>{
  const n=i+1,s=document.createElement("section");
  s.className="box deck"+(i>1?" x":"");s.id="d"+n;s.style.setProperty("--c",c);
  s.innerHTML=`
  <header><span class="tag">${n}</span><span class="title">Empty. Load a track from the library.</span><input class="lcd bpm" type="text" inputmode="decimal" value="--.-" title="BPM: type a number, or use the up and down arrow keys" aria-label="BPM deck ${n}"><span class="lcd time">0:00</span></header>
  <div class="zwrap"><canvas class="zoom" width="900" height="64" title="Scroll to zoom"></canvas><span class="zb"><button class="zo" title="Zoom out">&minus;</button><button class="zi" title="Zoom in">+</button></span></div>
  <canvas class="wave" width="900" height="70"></canvas>
  <div class="gridrow"><span class="beats" title="Current beat"><i></i><i></i><i></i><i></i></span><button class="bh" title="Halve the BPM">&frac12;</button><button class="bd" title="Double the BPM">&times;2</button><button class="tap" title="Tap along to the beat to set BPM and beat 1">Tap</button><button class="grid" title="Mark the playhead as beat 1">Set 1</button><button class="gl" title="Nudge the grid earlier (shift for finer)">&lsaquo;</button><button class="gr" title="Nudge the grid later (shift for finer)">&rsaquo;</button><button class="quant on" title="Snap cues and loops to the beat">Quant</button><span class="lcd barlcd" title="Bar . beat">-</span></div>
  <div class="mid">
    <div class="col"><span class="pv">0.0%</span><input type="range" class="v fd pitch" min="-16" max="16" step=".1" value="0" aria-label="Tempo ${n}"><span>tempo</span></div>
    <svg class="platter" viewBox="-100 -100 200 200" aria-label="Platter ${n}">
      <circle r="99" fill="#0a0a0c" stroke="#444"/>
      ${Array.from({length:48},(_,k)=>`<rect x="-.8" y="-98" width="1.6" height="4" fill="#666" transform="rotate(${k*7.5})"/>`).join("")}
      <g class="rot">
        <circle r="90" fill="#111216"/>
        ${[80,70,60,50,42].map(r=>`<circle r="${r}" fill="none" stroke="#1d1f25" stroke-width="2"/>`).join("")}
        <path d="M0 0L90 0A90 90 0 0 0 63.6 -63.6Z" fill="#fff" opacity=".05"/><path d="M0 0L-90 0A90 90 0 0 0 -63.6 63.6Z" fill="#fff" opacity=".05"/>
        <circle r="32" fill="${c}"/><circle r="3" fill="#111"/>
        <rect x="-2" y="-88" width="4" height="40" rx="2" fill="${c}"/>
        <text y="16" text-anchor="middle" font-size="9" font-weight="700" fill="#111">DECK ${n}</text>
      </g>
    </svg>
    <div class="col"><div style="display:flex;gap:6px"><input type="range" class="v fd vol" min="0" max="1" step=".01" value=".8" aria-label="Volume ${n}"><div class="vu"><i></i></div></div><span>level</span></div>
  </div>
  <div class="btns"><button class="play">Play</button><button class="cue">Cue</button><button class="sync">Sync</button><button class="brake">Brake</button><button class="pfl" title="Hear this deck in your headphones">Phones</button></div>
  <div class="pads">${"ABCD".split("").map((l,k)=>`<button class="hc" title="Click to set or jump. Right-click or shift-click to clear.">${l}</button>`).join("")}</div>
  <div class="loops"><span>Loop (beats)</span><button class="lh" title="Halve">&frac12;</button>${[1,2,4,8].map(b=>`<button class="lp" data-b="${b}">${b}</button>`).join("")}<button class="ld" title="Double">&times;2</button></div>
  <div class="perf"><span>Jump</span><button class="jb" title="Jump back">&laquo;</button><select class="jn" aria-label="Jump size"><option>1</option><option>2</option><option selected>4</option><option>8</option><option>16</option><option>32</option></select><button class="jf" title="Jump forward">&raquo;</button><span style="margin-left:10px">Roll (hold)</span><button class="rl" data-b=".125">1/8</button><button class="rl" data-b=".25">1/4</button><button class="rl" data-b=".5">1/2</button><button class="rl" data-b="1">1</button></div>
  <div class="keyrow"><span class="lcd keyl" title="Camelot key and note">--</span><button class="ksd" title="Down a semitone">&minus;</button><span class="kst">0</span><button class="ksu" title="Up a semitone">+</button><button class="klock" title="Keep the key steady when you change the tempo">Key lock</button><button class="kmatch" title="Shift this deck to the key of another deck">Match key</button></div>
  <div class="fxrow"><button class="fxon" title="Switch the effect on or off">FX</button><select class="fxs" aria-label="Effect"><option value="echo">Echo</option><option value="reverb">Reverb</option><option value="flanger">Flanger</option><option value="phaser">Phaser</option><option value="crush">Crusher</option><option value="gate">Gater</option><option value="ring">Ring mod</option><option value="pan">Auto-pan</option></select><label>Wet / dry<input type="range" class="kn fxw" min="0" max="1" step=".01" value=".5"></label></div>
  <div class="knobs">
    <label>Low<input type="range" class="kn eql" min="-1" max="1" step=".01" value="0"></label>
    <label>Mid<input type="range" class="kn eqm" min="-1" max="1" step=".01" value="0"></label>
    <label>High<input type="range" class="kn eqh" min="-1" max="1" step=".01" value="0"></label>
    <label>Filter<input type="range" class="kn flt" min="0" max="1" step=".01" value=".5"></label>
  </div>
  <div class="row" style="margin-top:10px;align-items:center;color:var(--dim);font-size:12px">Crossfader side
    <select class="asg" style="background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:3px"><option value="A"${i%2?"":" selected"}>A</option><option value="B"${i%2?" selected":""}>B</option><option value="T">Thru</option></select></div>`;
  $("#stage").appendChild(s);
  decks.push({n,c,el:s,buf:null,rev:null,playing:false,off:0,t0:0,rate:1,cue:0,bpm:0,ang:0,scr:false,v:0,moved:false,braking:false,wf:null,rec:null,key:null,semi:0,klock:false,quant:true,zs:8,pk:null,pps:100,pkScale:1,hc:[null,null,null,null],loop:null});
});
const $d=(d,q)=>$(q,d.el);
document.querySelectorAll("input.fd").forEach(i=>{
  const w=document.createElement("div"),h=i.classList.contains("h");
  w.className="fader "+(h?"h":"v");i.replaceWith(w);
  w.append(Object.assign(document.createElement("i"),{className:"slot"}),Object.assign(document.createElement("i"),{className:"cap"}),i);
});
document.querySelectorAll("input.kn").forEach(i=>{
  const k=document.createElement("div"),def=i.value,min=+i.min,max=+i.max;
  k.className="knob";k.tabIndex=0;k.setAttribute("role","slider");k.title="Drag, scroll or use arrow keys. Double-click to reset.";
  k.innerHTML=`<svg viewBox="-50 -50 100 100"><path d="M-35 35A49 49 0 1 1 35 35" fill="none" stroke="#07080a" stroke-width="5" stroke-linecap="round"/>${Array.from({length:11},(_,n)=>`<rect x="-1" y="-47" width="2" height="${n==5?7:4}" fill="${n==5?"#aaa":"#666"}" transform="rotate(${-135+n*27})"/>`).join("")}<circle r="31" fill="#2b2e35" stroke="#000"/><circle r="26" fill="#3a3e47"/><g class="ind"><rect x="-2" y="-27" width="4" height="15" rx="2" fill="currentColor"/></g></svg>`;
  i.hidden=true;i.after(k);k.append(i);
  const set=v=>{v=Math.max(min,Math.min(max,v));i.value=v;i.dispatchEvent(new Event("input"))};
  let y0,v0;
  k.onpointerdown=e=>{k.setPointerCapture(e.pointerId);y0=e.clientY;v0=+i.value;k.focus()};
  k.onpointermove=e=>{if(y0!=null)set(v0+(y0-e.clientY)/140*(max-min))};
  k.onpointerup=k.onpointercancel=()=>{y0=null};
  k.ondblclick=()=>set(+def);
  k.onwheel=e=>{e.preventDefault();set(+i.value-Math.sign(e.deltaY)*(max-min)/40)};
  k.onkeydown=e=>{const s=(max-min)/40;if(e.key=="ArrowUp"||e.key=="ArrowRight"){set(+i.value+s);e.preventDefault()}if(e.key=="ArrowDown"||e.key=="ArrowLeft"){set(+i.value-s);e.preventDefault()}};
});
const syncFaders=()=>document.querySelectorAll(".knob").forEach(k=>{const i=k.lastChild,p=(i.value-i.min)/(i.max-i.min);k.style.setProperty("--p",p);k.setAttribute("aria-valuenow",i.value)})||document.querySelectorAll(".fader").forEach(w=>{const i=w.lastChild;w.style.setProperty("--p",(i.value-i.min)/(i.max-i.min))});

/* ---------- audio graph ---------- */
function init(){
  if(ctx){ctx.resume();return}
  ctx=new AudioContext();master=ctx.createGain();master.gain.value=+$("#mvol").value;
  const comp=ctx.createDynamicsCompressor();fadeG=ctx.createGain();master.connect(fadeG);fadeG.connect(comp);comp.connect(ctx.destination);
  {const N=ctx.sampleRate*2.4;irBuf=ctx.createBuffer(2,N,ctx.sampleRate);
   for(let c=0;c<2;c++){const a=irBuf.getChannelData(c);for(let k=0;k<N;k++)a[k]=(Math.random()*2-1)*Math.pow(1-k/N,3)}}
  sBus=ctx.createGain();sBus.gain.value=+$("#svol").value;sBus.connect(master);
  recDest=ctx.createMediaStreamDestination();comp.connect(recDest);
  cueBus=ctx.createGain();hpMaster=ctx.createGain();hpOut=ctx.createGain();
  const cueDest=ctx.createMediaStreamDestination();
  cueBus.connect(hpOut);master.connect(hpMaster);hpMaster.connect(hpOut);hpOut.connect(cueDest);
  hpAudio=new Audio();hpAudio.srcObject=cueDest.stream;hpMixSet();
  decks.forEach(d=>{
    const f=(t,fr)=>{const b=ctx.createBiquadFilter();b.type=t;b.frequency.value=fr;return b};
    d.low=f("lowshelf",250);d.mid=f("peaking",1200);d.high=f("highshelf",4000);d.flt=f("allpass",1000);d.flt.Q.value=2;
    d.vol=ctx.createGain();d.x=ctx.createGain();d.an=ctx.createAnalyser();d.an.fftSize=256;
    d.low.connect(d.mid);d.mid.connect(d.high);d.high.connect(d.flt);d.fxIn=ctx.createGain();d.fxDry=ctx.createGain();d.fxWet=ctx.createGain();d.fxOut=ctx.createGain();d.flt.connect(d.fxIn);d.fxIn.connect(d.fxDry);d.fxDry.connect(d.fxOut);d.fxWet.connect(d.fxOut);d.fxOut.connect(d.vol);d.vol.connect(d.x);d.x.connect(d.an);d.x.connect(master);
    d.pfl=ctx.createGain();d.pfl.gain.value=$d(d,".pfl").classList.contains("on")?1:0;d.fxOut.connect(d.pfl);d.pfl.connect(cueBus);
    d.pin=ctx.createGain();d.pdry=ctx.createGain();d.pwet=ctx.createGain();d.pwet.gain.value=0;
    d.pin.connect(d.pdry);d.pdry.connect(d.low);buildShifter(d);d.pin.connect(d.psIn);d.psOut.connect(d.pwet);d.pwet.connect(d.low);
    applyAll(d);fxApply(d);setShift(d);
  });
  loadPadSamples();
}
const eqdb=v=>v<0?v*40:v*6;
function applyAll(d){
  d.low.gain.value=eqdb(+$d(d,".eql").value);d.mid.gain.value=eqdb(+$d(d,".eqm").value);d.high.gain.value=eqdb(+$d(d,".eqh").value);
  setFilter(d);d.vol.gain.value=+$d(d,".vol").value;applyX(d);
}
function setFilter(d){
  const v=+$d(d,".flt").value;
  if(Math.abs(v-.5)<.03){d.flt.type="allpass";return}
  if(v<.5){d.flt.type="lowpass";d.flt.frequency.value=20*Math.pow(1000,v*2)}
  else{d.flt.type="highpass";d.flt.frequency.value=20*Math.pow(400,(v-.5)*2)}
}
function applyX(d){
  if(!ctx)return;const a=$d(d,".asg").value;
  d.x.gain.value=a==="A"?Math.cos(cf*Math.PI/2):a==="B"?Math.sin(cf*Math.PI/2):1;
}

/* ---------- transport ---------- */
const pos=d=>{
  if(!d.playing)return d.off;
  let p=d.off+(ctx.currentTime-d.t0)*d.rate;const L=d.loop;
  if(L&&p>=L.e)p=L.s+(p-L.s)%(L.e-L.s);
  return Math.min(d.buf.duration,p);
};
function play(d){
  if(!d.buf||d.playing)return;
  if(d.off>=d.buf.duration-.05)d.off=0;
  const s=ctx.createBufferSource();s.buffer=d.buf;s.playbackRate.value=d.rate;if(d.loop){s.loopStart=d.loop.s;s.loopEnd=d.loop.e;s.loop=true}
  s.connect(d.pin);s.start(0,d.off);
  d.src=s;d.t0=ctx.currentTime;d.playing=true;$d(d,".play").classList.add("on");$d(d,".play").textContent="Pause";
}
function stop(d){
  if(d.playing){d.off=pos(d);try{d.src.stop()}catch(e){}d.src.disconnect();d.playing=false}
  $d(d,".play").classList.remove("on");$d(d,".play").textContent="Play";
}
function seek(d,t){
  const was=d.playing;if(was)stop(d);
  d.off=Math.max(0,Math.min(d.buf.duration-.01,t));
  if(d.loop&&(d.off<d.loop.s||d.off>=d.loop.e)){d.loop=null;loopUI(d)}
  if(was)play(d);
}
function setRate(d,r){if(d.playing){d.off=pos(d);d.t0=ctx.currentTime;d.src.playbackRate.value=r}d.rate=r;setShift(d)}

/* ---------- loading, waveform, bpm ---------- */
function bpmOf(b){
  const x=b.getChannelData(0),sr=b.sampleRate,H=512,n=Math.floor(Math.min(x.length,sr*60)/H),e=new Float32Array(n),f=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let j=0;j<H;j+=2){const v=x[i*H+j];s+=v*v}e[i]=Math.sqrt(s)}
  for(let i=1;i<n;i++)f[i]=Math.max(0,e[i]-e[i-1]);
  const g=(p)=>{const k=Math.floor(p),fr=p-k;return k+1<n?f[k]*(1-fr)+f[k+1]*fr:0};
  let best=0,bb=0;
  for(let bpm=70;bpm<=180;bpm+=.5){const lag=(sr/H)*60/bpm;let s=0;for(let i=0;i+lag*2<n;i++)s+=f[i]*(g(i+lag)+.5*g(i+lag*2));if(s>best){best=s;bb=bpm}}
  const lag=(sr/H)*60/bb,m=Math.min(n,Math.floor(20*sr/H));let bo=0,bs=0;
  for(let o=0;o<lag;o+=.25){let s=0;for(let k=0;o+k*lag<m;k++)s+=g(o+k*lag);if(s>bs){bs=s;bo=o}}
  return{bpm:bb,t0:bo*H/sr};
}
async function load(d,rec){
  init();stop(d);const t=$d(d,".title");t.textContent="Loading "+rec.name+"…";
  try{
    const blob=mem.get(rec.id)||await dbGet(rec.id);if(!blob)throw new Error("missing");
    const buf=await ctx.decodeAudioData(await blob.arrayBuffer());
    const rev=ctx.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate);
    for(let c=0;c<buf.numberOfChannels;c++)rev.getChannelData(c).set(buf.getChannelData(c).slice().reverse());
    d.rec=rec;d.buf=buf;d.rev=rev;d.off=0;d.cue=0;
    {const a=rec.bpm?{bpm:rec.bpm,t0:rec.beat0||0}:bpmOf(buf);d.bpm=a.bpm;d.beat0=a.t0}
    d.key=rec.key||keyOf(buf);d.semi=0;d.hc=rec.hc?rec.hc.slice():[null,null,null,null];d.loop=null;padsUI(d);loopUI(d);
    const W=900,H=70,o=document.createElement("canvas");o.width=W;o.height=H;const g=o.getContext("2d"),x=buf.getChannelData(0),step=Math.floor(x.length/W);
    g.fillStyle=d.c;
    for(let i=0;i<W;i++){let m=0;for(let j=0;j<step;j+=16){const v=Math.abs(x[i*step+j]);if(v>m)m=v}const h=Math.max(1,m*H*.95);g.fillRect(i,(H-h)/2,1,h)}
    {const x0=buf.getChannelData(0),st=Math.floor(buf.sampleRate/100),pk=new Float32Array(Math.ceil(x0.length/st)+1);let mx=0;
    for(let i=0;i<pk.length;i++){let m=0;const e=Math.min(x0.length,(i+1)*st);for(let j=i*st;j<e;j+=6){const v=Math.abs(x0[j]);if(v>m)m=v}pk[i]=m;if(m>mx)mx=m}
    d.pk=pk;d.pps=buf.sampleRate/st;d.pkScale=mx?1/mx:1}
    d.wf=o;t.textContent=rec.name.replace(/\.[^.]+$/,"");setBpm(d,d.bpm);
    $d(d,".pitch").value=0;d.rate=1;$d(d,".pv").textContent="0.0%";setShift(d);keyUI(d);
  }catch(err){t.textContent="Could not read that file. Try an mp3, wav or m4a."}
}

/* ---------- library (saved in the browser with IndexedDB) ---------- */
const mem=new Map();let dbOK=true;
const DBP=new Promise((res,rej)=>{
  if(!window.indexedDB)return rej(new Error("no idb"));
  const r=indexedDB.open("virtual-dj",1);
  r.onupgradeneeded=()=>{r.result.createObjectStore("meta",{keyPath:"id"});r.result.createObjectStore("audio")};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
});
const dbDo=(store,mode,fn)=>DBP.then(db=>new Promise((res,rej)=>{
  const t=db.transaction(store,mode),r=fn(t.objectStore(store));
  t.oncomplete=()=>res(r&&r.result);t.onerror=t.onabort=()=>rej(t.error);
}));
const dbGet=id=>dbDo("audio","readonly",s=>s.get(id)).catch(()=>undefined);
const dbFail=()=>{dbOK=false;$("#libnote").textContent="This browser blocked storage, so tracks are only kept until you close the page."};
DBP.catch(dbFail);
const NOTES=["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const CAM_MAJ=["8B","3B","10B","5B","12B","7B","2B","9B","4B","11B","6B","1B"],CAM_MIN=["5A","12A","7A","2A","9A","4A","11A","6A","1A","8A","3A","10A"];
const keyCode=k=>k?(k.minor?CAM_MIN:CAM_MAJ)[k.pc]:"zz";
const keyLabel=k=>k?keyCode(k)+" "+NOTES[k.pc]+(k.minor?"m":""):"--";
const keyShift=(k,s)=>k?{pc:((k.pc+s)%12+12)%12,minor:k.minor}:null;
function keyUI(d){
  const q=s=>$d(d,s);
  q(".keyl").textContent=keyLabel(keyShift(d.key,d.semi));
  q(".keyl").title=d.key?"Detected "+keyLabel(d.key)+(d.semi?", shifted "+(d.semi>0?"+":"")+d.semi+" semitones":""):"No key detected";
  q(".kst").textContent=(d.semi>0?"+":"")+d.semi;
}
function saveMeta(d){
  if(!d.rec||!d.buf)return;
  clearTimeout(d.sv);
  d.sv=setTimeout(()=>{
    Object.assign(d.rec,{bpm:d.bpm,beat0:d.beat0||0,key:d.key,hc:d.hc});
    dbDo("meta","readwrite",s=>s.put(d.rec)).catch(dbFail);renderLib();
  },500);
}
function renderLib(){
  const L=$("#lib"),q=$("#libq").value.toLowerCase(),s=$("#libs").value;
  const a=lib.filter(r=>r.name.toLowerCase().includes(q));
  a.sort(s==="name"?(x,y)=>x.name.localeCompare(y.name):s==="bpm"?(x,y)=>(x.bpm||999)-(y.bpm||999):s==="key"?(x,y)=>keyCode(x.key).localeCompare(keyCode(y.key),undefined,{numeric:true}):(x,y)=>y.added-x.added);
  L.textContent="";
  if(!a.length){const e=document.createElement("div");e.className="drop";e.textContent=lib.length?"No tracks match that search.":"No tracks yet. Add files, then load them onto a deck.";L.append(e);return}
  a.forEach(r=>{
    const row=document.createElement("div");row.className="song";
    const nm=document.createElement("span");nm.textContent=r.name;row.append(nm);
    const tag=document.createElement("span");tag.className="tag2";tag.textContent=r.bpm?Math.round(r.bpm)+" · "+keyCode(r.key).replace("zz",""):"";row.append(tag);
    decks.forEach(d=>{const b=document.createElement("button");b.textContent=d.n;b.title="Load on deck "+d.n;b.style.setProperty("--c",d.c);if(d.n>2)b.classList.add("x");b.onclick=()=>load(d,r);row.append(b)});
    const x=document.createElement("button");x.textContent="×";x.title="Remove from library";x.className="del";
    x.onclick=()=>{if(!confirm("Remove "+r.name+" from the library?"))return;lib=lib.filter(z=>z!==r);mem.delete(r.id);
      dbDo("meta","readwrite",s=>s.delete(r.id)).catch(()=>{});dbDo("audio","readwrite",s=>s.delete(r.id)).catch(()=>{});renderLib()};
    row.append(x);L.append(row);
  });
}
function addFiles(files){
  [...files].filter(f=>f.type.startsWith("audio/")||/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm)$/i.test(f.name)).forEach(f=>{
    if(lib.some(r=>r.name===f.name&&r.size===f.size))return;
    const rec={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:f.name,size:f.size,added:Date.now(),bpm:0,beat0:0,key:null,hc:[null,null,null,null]};
    lib.push(rec);mem.set(rec.id,f);
    dbDo("audio","readwrite",s=>s.put(f,rec.id)).then(()=>dbDo("meta","readwrite",s=>s.put(rec))).catch(dbFail);
  });
  renderLib();
}
$("#pick").onclick=()=>$("#file").click();$("#file").onchange=e=>{addFiles(e.target.files);e.target.value=""};
$("#libq").oninput=renderLib;$("#libs").onchange=renderLib;
addEventListener("dragover",e=>{e.preventDefault();$("#drop").classList.add("hot")});
addEventListener("dragleave",()=>$("#drop").classList.remove("hot"));
addEventListener("drop",e=>{e.preventDefault();$("#drop").classList.remove("hot");addFiles(e.dataTransfer.files)});
dbDo("meta","readonly",s=>s.getAll()).then(a=>{lib=a||[];renderLib()}).catch(()=>{});
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});

/* ---------- key detection (chroma + Krumhansl-Schmuckler profiles) ---------- */
function fft(re,im){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let len=2;len<=n;len<<=1){
    const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang),h=len>>1;
    for(let i=0;i<n;i+=len){let cr=1,ci=0;
      for(let k=0;k<h;k++){const a=i+k,b=a+h,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;
        re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}
  }
}
const KS_MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],KS_MIN=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function keyOf(b){
  const x=b.getChannelData(0),sr=b.sampleRate,N=32768;if(x.length<N)return null;
  const hop=Math.max(N,Math.floor((x.length-N)/40)),ch=new Float64Array(12),re=new Float64Array(N),im=new Float64Array(N);
  const lo=Math.ceil(65*N/sr),hi=Math.floor(2000*N/sr),pcOf=new Int8Array(hi+1);
  for(let k=lo;k<=hi;k++)pcOf[k]=((Math.round(69+12*Math.log2(k*sr/N/440))%12)+12)%12;
  for(let s=0;s+N<=x.length;s+=hop){
    for(let i=0;i<N;i++){re[i]=x[s+i]*(.5-.5*Math.cos(2*Math.PI*i/N));im[i]=0}
    fft(re,im);
    const f=new Float64Array(12);
    for(let k=lo;k<=hi;k++)f[pcOf[k]]+=Math.sqrt(re[k]*re[k]+im[k]*im[k]);
    const m=Math.max(...f)||1;for(let i=0;i<12;i++)ch[i]+=f[i]/m;
  }
  const corr=(p,r)=>{let mx=0,mp=0;for(let i=0;i<12;i++){mx+=ch[i];mp+=p[i]}mx/=12;mp/=12;let n=0,dx=0,dp=0;
    for(let i=0;i<12;i++){const a=ch[(i+r)%12]-mx,c=p[i]-mp;n+=a*c;dx+=a*a;dp+=c*c}return n/Math.sqrt(dx*dp||1)};
  let best=null;
  for(let r=0;r<12;r++)for(const [p,minor] of [[KS_MAJ,false],[KS_MIN,true]]){const c=corr(p,r);if(!best||c>best.conf)best={pc:r,minor,conf:+c.toFixed(3)}}
  return best;
}

/* ---------- key change and key lock: a delay-line pitch shifter per deck ---------- */
const SHIFT_T=.12;
function buildShifter(d){
  const C=ctx,T=SHIFT_T,n=Math.floor(T*C.sampleRate),rb=C.createBuffer(1,n,C.sampleRate),wb=C.createBuffer(1,n,C.sampleRate),r=rb.getChannelData(0),w=wb.getChannelData(0);
  for(let i=0;i<n;i++){r[i]=i/n;w[i]=Math.pow(Math.sin(Math.PI*i/n),2)}
  const inn=C.createGain(),out=C.createGain();d.psMods=[];d.psDels=[];
  [0,1].forEach(k=>{
    const del=C.createDelay(.5),g=C.createGain(),mg=C.createGain(),rs=C.createBufferSource(),ws=C.createBufferSource();
    rs.buffer=rb;rs.loop=true;ws.buffer=wb;ws.loop=true;g.gain.value=0;del.delayTime.value=0;mg.gain.value=0;
    rs.connect(mg);mg.connect(del.delayTime);ws.connect(g.gain);inn.connect(del);del.connect(g);g.connect(out);
    const t=C.currentTime+.05;rs.start(t,k*T/2);ws.start(t,k*T/2);d.psMods.push(mg);d.psDels.push(del);
  });
  d.psIn=inn;d.psOut=out;
}
function setShift(d){
  if(!ctx||!d.psMods)return;
  const st=d.semi+(d.klock&&!d.braking&&d.rate>.05?-12*Math.log2(d.rate):0),on=Math.abs(st)>.02,now=ctx.currentTime;
  d.pdry.gain.setTargetAtTime(on?0:1,now,.02);d.pwet.gain.setTargetAtTime(on?1:0,now,.02);
  if(!on)return;
  const r=Math.pow(2,st/12),g=(1-r)*SHIFT_T;
  d.psMods.forEach(m=>m.gain.setTargetAtTime(g,now,.02));d.psDels.forEach(x=>x.delayTime.setTargetAtTime(g<0?-g:0,now,.02));
}

/* ---------- sampler ---------- */
const PADS=["Kick","Snare","Clap","Hat","Horn","Siren","Zap","Riser"];
let padNames=JSON.parse(localStorage.getItem("pad_names")||"{}");const padBuf={};
const noiseBuf=s=>{const n=Math.floor(ctx.sampleRate*s),b=ctx.createBuffer(1,n,ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;return b};
const envG=(t,a,dcy,pk)=>{const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.001,t+a+dcy);g.connect(sBus);return g};
const oscAt=(type,f,t,dur)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+dur);return o};
const nzAt=(t,dur,ft,fr,q)=>{const s=ctx.createBufferSource(),f=ctx.createBiquadFilter();s.buffer=noiseBuf(dur);f.type=ft;f.frequency.value=fr;if(q)f.Q.value=q;s.connect(f);s.start(t);return f};
const SYN={
  Kick:t=>{const o=oscAt("sine",150,t,.6);o.frequency.exponentialRampToValueAtTime(40,t+.15);o.connect(envG(t,.002,.5,.65))},
  Snare:t=>{nzAt(t,.3,"highpass",1500).connect(envG(t,.001,.2,.4));oscAt("triangle",190,t,.2).connect(envG(t,.001,.12,.35))},
  Clap:t=>{[0,.012,.026].forEach(dl=>nzAt(t+dl,.2,"bandpass",1300,1.2).connect(envG(t+dl,.001,dl>.02?.18:.02,2.4)))},
  Hat:t=>nzAt(t,.1,"highpass",7000).connect(envG(t,.001,.05,1.1)),
  Horn:t=>[440,554,659].forEach((f,i)=>{const o=oscAt("sawtooth",f,t,1.1),lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3200;o.detune.value=i*4;
    o.frequency.setValueAtTime(f,t+.8);o.frequency.exponentialRampToValueAtTime(f*.8,t+1.05);o.connect(lp);lp.connect(envG(t,.02,1,.22))}),
  Siren:t=>{const o=oscAt("square",900,t,2.2),l=oscAt("sine",1.1,t,2.2),lg=ctx.createGain();lg.gain.value=320;l.connect(lg);lg.connect(o.frequency);
    const lp=ctx.createBiquadFilter();lp.frequency.value=2500;o.connect(lp);lp.connect(envG(t,.02,2.1,.25))},
  Zap:t=>{const o=oscAt("sawtooth",2400,t,.4);o.frequency.exponentialRampToValueAtTime(80,t+.3);o.connect(envG(t,.002,.3,.4))},
  Riser:t=>{const f=nzAt(t,3.2,"bandpass",200,3);f.frequency.exponentialRampToValueAtTime(9000,t+3);const g=ctx.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.8,t+3);g.gain.linearRampToValueAtTime(0,t+3.1);f.connect(g);g.connect(sBus)}
};
function trig(i){
  init();const t=ctx.currentTime;
  if(padBuf[i]){const s=ctx.createBufferSource();s.buffer=padBuf[i];s.connect(sBus);s.start(t)}else SYN[PADS[i]](t);
  const b=$("#pads8").children[i];b.classList.add("hit");setTimeout(()=>b.classList.remove("hit"),120);
}
async function loadPadSamples(){
  for(let i=0;i<8;i++){const blob=await dbGet("pad:"+i);if(blob)try{padBuf[i]=await ctx.decodeAudioData(await blob.arrayBuffer())}catch(e){}}
}
function padLabel(i){const b=$("#pads8").children[i];b.textContent=(i+1)+" "+(padNames[i]||PADS[i])}
PADS.forEach((p,i)=>{
  const b=document.createElement("button");b.className="pad";$("#pads8").append(b);padLabel(i);
  b.onclick=e=>{if(e.shiftKey){$("#sfile").dataset.i=i;$("#sfile").click()}else trig(i)};
  b.oncontextmenu=e=>{e.preventDefault();delete padBuf[i];delete padNames[i];localStorage.setItem("pad_names",JSON.stringify(padNames));dbDo("audio","readwrite",s=>s.delete("pad:"+i)).catch(()=>{});padLabel(i)};
});
$("#sfile").onchange=async e=>{
  const f=e.target.files[0],i=+e.target.dataset.i;e.target.value="";if(!f)return;init();
  try{padBuf[i]=await ctx.decodeAudioData(await f.arrayBuffer());padNames[i]=f.name.replace(/\.[^.]+$/,"").slice(0,10);
    localStorage.setItem("pad_names",JSON.stringify(padNames));dbDo("audio","readwrite",s=>s.put(f,"pad:"+i)).catch(()=>{});padLabel(i)}
  catch(err){alert("Could not read that sound file.")}
};
$("#svol").oninput=e=>{init();sBus.gain.value=+e.target.value};
addEventListener("keydown",e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)&&document.activeElement.type!=="range")return;
  if(/^[1-8]$/.test(e.key))trig(+e.key-1);
});

/* ---------- recording the mix ---------- */
let mr=null,recChunks=[],recT0=0,recTick=null,recN=0;
function encodeWav(b){
  const ch=b.numberOfChannels,n=b.length,sr=b.sampleRate,v=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,"RIFF");v.setUint32(4,36+n*ch*2,true);w(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n*ch*2,true);
  const d=[];for(let c=0;c<ch;c++)d.push(b.getChannelData(c));let o=44;
  for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,d[c][i]));v.setInt16(o,s<0?s*32768:s*32767,true);o+=2}
  return new Blob([v],{type:"audio/wav"});
}
function saveBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove()}
function addRecording(blob,mt){
  const ext=mt.includes("mp4")?"m4a":mt.includes("ogg")?"ogg":"webm",stamp=new Date().toISOString().slice(0,16).replace(/[-:T]/g,""),base="mix-"+stamp+"-"+(++recN);
  const row=document.createElement("div");row.className="rec";
  const au=document.createElement("audio");au.controls=true;au.src=URL.createObjectURL(blob);
  const dl=document.createElement("button");dl.textContent="Save ."+ext;dl.onclick=()=>saveBlob(blob,base+"."+ext);
  const wv=document.createElement("button");wv.textContent="Save .wav";
  wv.onclick=async()=>{wv.textContent="Converting…";try{init();saveBlob(encodeWav(await ctx.decodeAudioData(await blob.arrayBuffer())),base+".wav")}catch(e){alert("Could not convert that recording.")}wv.textContent="Save .wav"};
  row.append(au,dl,wv);const L=$("#recs");if(!L.children.length){const h=document.createElement("h2");h.textContent="Recordings (this session)";L.append(h)}L.append(row);
}
$("#rec").onclick=()=>{
  init();
  if(mr&&mr.state==="recording"){mr.stop();return}
  const mt=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t));
  if(!mt){alert("This browser cannot record audio from the page. Try Chrome, Edge or Firefox.");return}
  recChunks=[];mr=new MediaRecorder(recDest.stream,{mimeType:mt});
  mr.ondataavailable=e=>{if(e.data.size)recChunks.push(e.data)};
  mr.onstop=()=>{clearInterval(recTick);$("#rec").classList.remove("on");$("#rec").textContent="Record";addRecording(new Blob(recChunks,{type:mt}),mt)};
  mr.start(1000);recT0=Date.now();$("#rec").classList.add("on");$("#rec").textContent="Stop";
  recTick=setInterval(()=>{$("#rect").textContent=fmt((Date.now()-recT0)/1000)},250);
};

/* ---------- effects: one unit per deck, with a wet/dry knob ---------- */
function buildFx(d,type){
  const nodes=[],osc=[],mk=n=>{nodes.push(n);return n},C=ctx;
  const inn=mk(C.createGain()),out=mk(C.createGain());
  const lfo=(freq,depth,param)=>{const o=C.createOscillator(),g=mk(C.createGain());o.frequency.value=freq;g.gain.value=depth;o.connect(g);g.connect(param);o.start();osc.push(o);return o};
  const beat=()=>d.bpm?60/(d.bpm*d.rate):.4;
  let upd=null,mix="eq";
  if(type==="echo"){
    mix="add";const del=mk(C.createDelay(2)),fb=mk(C.createGain()),lp=mk(C.createBiquadFilter());
    fb.gain.value=.5;lp.frequency.value=3000;del.delayTime.value=Math.min(1.9,beat()*.75);
    inn.connect(del);del.connect(lp);lp.connect(fb);fb.connect(del);lp.connect(out);
    upd=()=>del.delayTime.setTargetAtTime(Math.min(1.9,Math.max(.05,beat()*.75)),C.currentTime,.05);
  }else if(type==="reverb"){
    mix="add";const cv=mk(C.createConvolver());cv.buffer=irBuf;inn.connect(cv);cv.connect(out);
  }else if(type==="flanger"){
    const del=mk(C.createDelay(.05)),fb=mk(C.createGain());del.delayTime.value=.003;fb.gain.value=.55;
    inn.connect(del);del.connect(fb);fb.connect(del);del.connect(out);lfo(.25,.002,del.delayTime);
  }else if(type==="phaser"){
    let prev=inn;
    for(let k=0;k<4;k++){const ap=mk(C.createBiquadFilter());ap.type="allpass";ap.frequency.value=700+k*350;ap.Q.value=2;prev.connect(ap);prev=ap;lfo(.3,500,ap.frequency)}
    prev.connect(out);
  }else if(type==="crush"){
    const ws=mk(C.createWaveShaper()),cu=new Float32Array(4096),st=7;
    for(let k=0;k<4096;k++)cu[k]=Math.round((k/2047.5-1)*st)/st;ws.curve=cu;inn.connect(ws);ws.connect(out);
  }else if(type==="ring"){
    const g=mk(C.createGain());g.gain.value=0;lfo(220,1,g.gain);inn.connect(g);g.connect(out);
  }else if(type==="pan"){
    const p=mk(C.createStereoPanner());lfo(.5,1,p.pan);inn.connect(p);p.connect(out);
  }else if(type==="gate"){
    const g=mk(C.createGain()),sh=mk(C.createWaveShaper()),lp=mk(C.createBiquadFilter()),o=C.createOscillator();
    g.gain.value=0;sh.curve=new Float32Array([0,1]);lp.frequency.value=250;o.type="square";o.frequency.value=4;
    o.connect(sh);sh.connect(lp);lp.connect(g.gain);o.start();osc.push(o);inn.connect(g);g.connect(out);
    upd=()=>o.frequency.setTargetAtTime(d.bpm?d.bpm*d.rate/30:4,C.currentTime,.05);
  }
  return{in:inn,out,upd,mix,stop(){osc.forEach(o=>{try{o.stop()}catch(e){}});nodes.forEach(n=>n.disconnect())}};
}
function fxApply(d){
  if(!ctx)return;
  const on=$d(d,".fxon").classList.contains("on"),type=$d(d,".fxs").value,w=+$d(d,".fxw").value;
  if(d.fx&&(!on||d.fxType!==type)){d.fxIn.disconnect(d.fx.in);d.fx.stop();d.fx=null}
  if(on&&!d.fx){d.fx=buildFx(d,type);d.fxType=type;d.fxIn.connect(d.fx.in);d.fx.out.connect(d.fxWet)}
  if(!on){d.fxDry.gain.value=1;d.fxWet.gain.value=0;return}
  const add=d.fx.mix==="add";
  d.fxDry.gain.value=add?1:Math.cos(w*Math.PI/2);d.fxWet.gain.value=add?w:Math.sin(w*Math.PI/2);
}

/* ---------- beat jump and loop roll ---------- */
function beatJump(d,beats){
  if(!d.buf||!d.bpm)return;init();
  const dl=beats*60/d.bpm,dur=d.buf.duration,t=pos(d)+dl;
  if(t<0||t>=dur-.05)return;
  if(d.loop){const s=d.loop.s+dl,e=d.loop.e+dl;if(s>=0&&e<=dur)d.loop={...d.loop,s,e}}
  seek(d,t);
}
function rollOn(d,frac){
  if(!d.buf||!d.bpm||!d.playing||d.loop)return;init();
  const len=frac*60/d.bpm,p=pos(d),b0=d.beat0||0,s=d.quant?Math.max(0,b0+Math.floor((p-b0)/len)*len):p;
  d.slip={p,t:ctx.currentTime,r:d.rate};d.loop={s,e:s+len,beats:frac,roll:true};
  d.src.loopStart=s;d.src.loopEnd=s+len;d.src.loop=true;loopUI(d);
}
function rollOff(d){
  const sl=d.slip;d.slip=null;
  if(!sl||!d.loop||!d.loop.roll)return;
  const target=sl.p+(ctx.currentTime-sl.t)*sl.r;d.loop=null;loopUI(d);
  if(d.playing)seek(d,Math.min(target,d.buf.duration-.05));
}

/* ---------- bpm, beat grid, headphones ---------- */
function setBpm(d,v){d.bpm=v;$d(d,".bpm").value=v?v.toFixed(1):"--.-";if(d.loop&&ctx)loopOff(d);saveMeta(d)}
const snap=(d,t)=>{if(!d.quant||!d.bpm)return t;const bl=60/d.bpm,b0=d.beat0||0;return Math.max(0,b0+Math.round((t-b0)/bl)*bl)};
const phase=(d,p)=>(((p-(d.beat0||0))*d.bpm/60)%1+1)%1;
function hpMixSet(){
  if(!ctx)return;const m=+$("#hpmix").value;
  cueBus.gain.value=Math.cos(m*Math.PI/2);hpMaster.gain.value=Math.sin(m*Math.PI/2);hpOut.gain.value=+$("#hpvol").value;
}
let phonesReady=false;
async function setPhones(id){
  init();const st=$("#hpst");phonesReady=false;
  if(!id){hpAudio.pause();st.textContent="No headphone output chosen.";return}
  if(!hpAudio.setSinkId){st.textContent="This browser cannot pick an output. Try Chrome or Edge.";return}
  try{await hpAudio.setSinkId(id);await hpAudio.play();phonesReady=true;st.textContent="Headphones ready."}
  catch(e){st.textContent="Could not open that output."}
}
const hpsel=$("#hpsel");
function addOut(id,label){
  if(![...hpsel.options].some(o=>o.value===id))hpsel.add(new Option(label||"Output "+hpsel.options.length,id));
  hpsel.value=id;
}
$("#hppick").onclick=async()=>{
  init();
  try{
    if(navigator.mediaDevices.selectAudioOutput){const dv=await navigator.mediaDevices.selectAudioOutput();addOut(dv.deviceId,dv.label);setPhones(dv.deviceId)}
    else{(await navigator.mediaDevices.enumerateDevices()).filter(x=>x.kind==="audiooutput").forEach(x=>addOut(x.deviceId,x.label));hpsel.value="";$("#hpst").textContent="Choose an output from the list."}
  }catch(e){$("#hpst").textContent="No output was chosen."}
};
hpsel.onchange=()=>setPhones(hpsel.value);
$("#hpmix").oninput=()=>{init();hpMixSet()};$("#hpvol").oninput=()=>{init();hpMixSet()};

/* ---------- hot cues and loops ---------- */
const LET="ABCD";
function padsUI(d){saveMeta(d);d.el.querySelectorAll(".hc").forEach((b,i)=>{const t=d.hc[i];b.classList.toggle("set",t!=null);b.textContent=LET[i]+(t!=null?" "+fmt(t):"")})}
function loopUI(d){d.el.querySelectorAll(".lp").forEach(b=>b.classList.toggle("on",!!d.loop&&Math.abs(d.loop.beats-+b.dataset.b)<.001))}
function loopOff(d){
  if(!d.loop)return;
  if(d.playing){d.off=pos(d);d.t0=ctx.currentTime;d.src.loop=false}
  d.loop=null;loopUI(d);
}
function loopSet(d,beats){
  if(!d.buf||!d.bpm||beats<.25||beats>32)return;init();
  if(d.loop&&Math.abs(d.loop.beats-beats)<.001){loopOff(d);return}
  const len=beats*60/d.bpm,p=pos(d),s=d.loop?d.loop.s:snap(d,p);
  if(s+len>d.buf.duration)return;
  if(d.loop&&d.playing){const q=s+(p-s)%len;stop(d);d.off=q;d.loop={s,e:s+len,beats};play(d)}
  else{
    d.loop={s,e:s+len,beats};
    if(d.playing){
      if(s+len<=p+.03){stop(d);d.off=s;play(d)}
      else{d.src.loopStart=s;d.src.loopEnd=s+len;d.src.loop=true}
    }
  }
  loopUI(d);
}

/* ---------- controls ---------- */
decks.forEach(d=>{
  const q=s=>$d(d,s);
  q(".play").onclick=()=>{init();if(!d.buf)return;d.playing?stop(d):play(d)};
  q(".cue").onclick=()=>{init();if(!d.buf)return;if(d.playing){stop(d);d.off=d.cue}else d.cue=snap(d,d.off)};
  q(".pitch").oninput=e=>{init();const v=+e.target.value;q(".pv").textContent=(v>0?"+":"")+v.toFixed(1)+"%";setRate(d,1+v/100)};
  q(".vol").oninput=e=>{init();d.vol.gain.value=+e.target.value};
  q(".eql").oninput=e=>{init();d.low.gain.value=eqdb(+e.target.value)};
  q(".eqm").oninput=e=>{init();d.mid.gain.value=eqdb(+e.target.value)};
  q(".eqh").oninput=e=>{init();d.high.gain.value=eqdb(+e.target.value)};
  q(".flt").oninput=()=>{init();setFilter(d)};
  q(".asg").onchange=()=>{init();applyX(d)};
  q(".sync").onclick=()=>{
    init();
    const o=decks.filter(x=>x!==d&&x.buf&&x.bpm&&!(document.body.classList.contains("dec2")&&x.n>2)).sort((a,b)=>b.playing-a.playing)[0];
    if(!d.buf||!d.bpm||!o)return;
    const want=o.bpm*o.rate/d.bpm,r=Math.max(.84,Math.min(1.16,want)),p=(r-1)*100;
    q(".pitch").value=p;q(".pv").textContent=(p>0?"+":"")+p.toFixed(1)+"%";setRate(d,r);
    if(d.playing&&o.playing&&Math.abs(want-r)<.001){
      let dl=phase(o,pos(o))-phase(d,pos(d));if(dl>.5)dl-=1;if(dl<-.5)dl+=1;
      seek(d,pos(d)+dl*60/d.bpm);
    }
  };
  const br=q(".brake");
  br.onpointerdown=()=>{init();if(d.playing)d.braking=true};
  const rel=()=>{if(d.braking){d.braking=false;if(d.playing)setRate(d,1+ +q(".pitch").value/100)}};
  br.onpointerup=rel;br.onpointerleave=rel;
  d.el.querySelectorAll(".hc").forEach((b,i)=>{
    b.onclick=e=>{init();if(!d.buf)return;
      if(e.shiftKey)d.hc[i]=null;else if(d.hc[i]==null)d.hc[i]=snap(d,pos(d));else seek(d,d.quant&&d.bpm&&d.playing?d.hc[i]+phase(d,pos(d))*60/d.bpm:d.hc[i]);
      padsUI(d)};
    b.oncontextmenu=e=>{e.preventDefault();d.hc[i]=null;padsUI(d)};
  });
  d.el.querySelectorAll(".lp").forEach(b=>b.onclick=()=>loopSet(d,+b.dataset.b));
  q(".lh").onclick=()=>loopSet(d,(d.loop?d.loop.beats:1)/2);
  q(".ld").onclick=()=>loopSet(d,(d.loop?d.loop.beats:1)*2);
  const bi=q(".bpm");let taps=[];
  bi.onfocus=()=>bi.select();
  bi.onchange=()=>{const v=parseFloat(bi.value.replace(",","."));if(d.buf&&v>=40&&v<=250)setBpm(d,v);else bi.value=d.bpm?d.bpm.toFixed(1):"--.-"};
  bi.onkeydown=e=>{
    if(e.key==="Enter")bi.blur();
    else if((e.key==="ArrowUp"||e.key==="ArrowDown")&&d.bpm){e.preventDefault();setBpm(d,Math.max(40,Math.min(250,d.bpm+(e.key==="ArrowUp"?1:-1)*(e.shiftKey?1:.1))))}
  };
  q(".bh").onclick=()=>{if(d.bpm&&d.bpm/2>=40)setBpm(d,d.bpm/2)};
  q(".bd").onclick=()=>{if(d.bpm&&d.bpm*2<=250)setBpm(d,d.bpm*2)};
  q(".grid").onclick=()=>{init();if(d.buf){d.beat0=pos(d);saveMeta(d)}};
  q(".jb").onclick=()=>beatJump(d,-q(".jn").value);q(".jf").onclick=()=>beatJump(d,+q(".jn").value);
  d.el.querySelectorAll(".rl").forEach(b=>{
    b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);rollOn(d,+b.dataset.b)};
    b.onpointerup=b.onpointercancel=()=>rollOff(d);
  });
  q(".fxon").onclick=e=>{init();e.currentTarget.classList.toggle("on");fxApply(d)};
  q(".fxs").onchange=()=>{init();fxApply(d)};q(".fxw").oninput=()=>{init();fxApply(d)};
  /* drag the scrolling waveform to scrub or scratch */
  const zc=q(".zoom");let zon=false,zx=0,zt=0,zwas=false;
  zc.onpointerdown=e=>{init();if(!d.buf)return;zc.setPointerCapture(e.pointerId);zon=true;d.scr=true;zwas=d.playing;if(zwas)stop(d);zx=e.clientX;zt=performance.now();d.v=0};
  zc.onpointermove=e=>{
    if(!zon)return;const now=performance.now(),dp=-(e.clientX-zx)/zc.getBoundingClientRect().width*d.zs,dt=Math.max(.004,(now-zt)/1000);
    d.off=Math.max(0,Math.min(d.buf.duration-.05,d.off+dp));d.ang+=dp/1.8*360;d.v=d.v*.5+(dp/dt)*.5;d.moved=true;zx=e.clientX;zt=now;
  };
  zc.onpointerup=zc.onpointercancel=()=>{if(!zon)return;zon=false;d.scr=false;d.v=0;if(zwas)play(d)};
  q(".gl").onclick=e=>{d.beat0=(d.beat0||0)-(e.shiftKey?.002:.01);saveMeta(d)};
  q(".gr").onclick=e=>{d.beat0=(d.beat0||0)+(e.shiftKey?.002:.01);saveMeta(d)};
  q(".ksd").onclick=()=>{init();d.semi=Math.max(-12,d.semi-1);setShift(d);keyUI(d)};
  q(".ksu").onclick=()=>{init();d.semi=Math.min(12,d.semi+1);setShift(d);keyUI(d)};
  q(".klock").onclick=e=>{init();d.klock=e.currentTarget.classList.toggle("on");setShift(d)};
  q(".kmatch").onclick=()=>{
    init();const o=decks.filter(x=>x!==d&&x.key&&!(document.body.classList.contains("dec2")&&x.n>2)).sort((a,b)=>b.playing-a.playing)[0];
    if(!d.key||!o){spmsg("Load a track with a detected key on this deck and another deck first.");return}
    const eq=k=>(k.minor?k.pc+3:k.pc)%12,ok=keyShift(o.key,o.semi);
    d.semi=((eq(ok)-eq(d.key)+18)%12)-6;setShift(d);keyUI(d);
  };
  q(".quant").onclick=e=>{d.quant=e.currentTarget.classList.toggle("on")};
  q(".zi").onclick=()=>{d.zs=Math.max(2,d.zs/1.4)};q(".zo").onclick=()=>{d.zs=Math.min(32,d.zs*1.4)};
  q(".zoom").onwheel=e=>{e.preventDefault();d.zs=Math.max(2,Math.min(32,d.zs*(e.deltaY>0?1.12:1/1.12)))};
  q(".tap").onclick=()=>{
    init();if(!d.buf)return;const t=performance.now();
    if(taps.length&&t-taps[taps.length-1]>2000)taps=[];
    taps=[...taps,t].slice(-8);
    if(taps.length>=3){setBpm(d,Math.max(40,Math.min(250,60000/((taps[taps.length-1]-taps[0])/(taps.length-1)))));d.beat0=pos(d)}
  };
  q(".pfl").onclick=e=>{
    init();const on=e.currentTarget.classList.toggle("on");d.pfl.gain.value=on?1:0;
    if(on&&!phonesReady)$("#hpst").textContent="Pick a headphone output first.";
  };
  q(".wave").onclick=e=>{init();if(!d.buf)return;const r=e.currentTarget.getBoundingClientRect();seek(d,(e.clientX-r.left)/r.width*d.buf.duration)};

  /* scratching */
  const pl=q(".platter");let last=0,lt=0,was=false;
  const angle=e=>{const r=pl.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))*180/Math.PI};
  pl.onpointerdown=e=>{init();if(!d.buf)return;pl.setPointerCapture(e.pointerId);d.scr=true;was=d.playing;if(was)stop(d);last=angle(e);lt=performance.now();d.v=0};
  pl.onpointermove=e=>{
    if(!d.scr)return;const a=angle(e),now=performance.now();let da=a-last;if(da>180)da-=360;if(da<-180)da+=360;
    const dt=Math.max(.004,(now-lt)/1000),dp=da/360*1.8;
    d.off=Math.max(0,Math.min(d.buf.duration-.05,d.off+dp));d.ang+=da;d.v=d.v*.5+(dp/dt)*.5;d.moved=true;last=a;lt=now;
  };
  const up=()=>{if(!d.scr)return;d.scr=false;d.v=0;if(was)play(d)};
  pl.onpointerup=up;pl.onpointercancel=up;
});
function grain(d,v){
  const len=.08,fwd=v>0,b=fwd?d.buf:d.rev,off=fwd?d.off:d.buf.duration-d.off;
  if(off<0||off>b.duration-.02)return;
  const s=ctx.createBufferSource(),g=ctx.createGain(),t=ctx.currentTime;
  s.buffer=b;s.playbackRate.value=Math.min(Math.abs(v),4);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.7,t+len/2);g.gain.linearRampToValueAtTime(0,t+len);
  s.connect(g);g.connect(d.low);s.start(t,off);s.stop(t+len);
}
setInterval(()=>{
  if(!ctx)return;
  decks.forEach(d=>{
    if(!d.scr)return;
    if(!d.moved)d.v*=.5;d.moved=false;
    if(Math.abs(d.v)>.04)grain(d,d.v);
  });
},27);

/* mixer */
$("#cf").oninput=e=>{init();cf=+e.target.value;decks.forEach(applyX)};
$("#mvol").oninput=e=>{init();master.gain.value=+e.target.value};
function setMode(four){
  document.body.classList.toggle("dec2",!four);$("#m2").classList.toggle("on",!four);$("#m4").classList.toggle("on",four);
  if(!four)decks.slice(2).forEach(d=>{if(d.buf)stop(d)});
}
$("#m2").onclick=()=>setMode(false);$("#m4").onclick=()=>setMode(true);

/* ---------- bar markers and the scrolling waveform ---------- */
function drawBars(d,g,W,H){
  if(!d.bpm)return;const bar=240/d.bpm,dur=d.buf.duration,b0=d.beat0||0;
  g.font="10px sans-serif";g.fillStyle="#ffffff99";
  for(let n=0;b0+n*bar<dur;n+=8){const x=(b0+n*bar)/dur*W;g.fillRect(x,H-8,1,8);if(n%16===0)g.fillText(n+1,x+2,H-9)}
}
function drawZoom(d,p){
  const cv=$d(d,".zoom"),g=cv.getContext("2d"),W=cv.width,H=cv.height,S=d.zs,c=W/2,pk=d.pk,dur=d.buf.duration;
  g.clearRect(0,0,W,H);const tL=p-S/2,tR=p+S/2;
  g.fillStyle=d.c+"88";
  for(let x=0;x<W;x++){
    if(x===c)g.fillStyle=d.c;
    const t0=tL+x/W*S;if(t0<0||t0>dur)continue;
    const i0=Math.floor(t0*d.pps),i1=Math.min(pk.length-1,Math.max(i0,Math.floor((t0+S/W)*d.pps)));let m=0;
    for(let i=i0;i<=i1;i++)if(pk[i]>m)m=pk[i];
    const h=Math.max(1,m*d.pkScale*H*.92);g.fillRect(x,(H-h)/2,1,h);
  }
  if(d.loop){g.fillStyle=d.c+"40";const a=c+(d.loop.s-p)/S*W;g.fillRect(a,0,(d.loop.e-d.loop.s)/S*W,H)}
  g.font="bold 11px sans-serif";
  if(d.bpm){
    const bl=60/d.bpm,b0=d.beat0||0;
    for(let n=Math.max(0,Math.ceil((tL-b0)/bl));b0+n*bl<=tR;n++){
      const x=Math.round(c+(b0+n*bl-p)/S*W),bar=n%4===0;
      g.fillStyle=bar?"#ffffffcc":"#ffffff55";g.fillRect(x,bar?0:H-14,1,bar?H:14);
      if(bar){g.fillStyle="#fff";g.fillText(n/4+1,x+3,11)}
    }
  }
  d.hc.forEach((t,i)=>{if(t==null)return;const x=c+(t-p)/S*W;if(x<0||x>W)return;g.fillStyle="#ffd84a";g.fillRect(x-1,0,2,H);g.fillText(LET[i],x+3,H-4)});
  g.fillStyle="#fff";g.fillRect(c-1,0,2,H);
}

/* ---------- animation loop ---------- */
const fmt=t=>Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
let prev=performance.now();
function frame(now){
  syncFaders();
  const dt=(now-prev)/1000;prev=now;
  decks.forEach(d=>{
    const q=s=>$d(d,s);
    if(ctx&&d.fx&&d.fx.upd)d.fx.upd();
    if(ctx&&d.braking&&d.playing){const r=d.rate*.94;if(r<.05){stop(d);d.rate=1+ +q(".pitch").value/100;d.braking=false}else setRate(d,r)}
    if(d.buf&&ctx){
      const p=pos(d);
      if(d.playing&&p>=d.buf.duration-.02){stop(d);d.off=0}
      if(d.playing)d.ang+=d.rate*dt*200;
      q(".time").textContent=fmt(p);
      const bt=d.bpm&&d.playing?((Math.floor((p-(d.beat0||0))*d.bpm/60)%4)+4)%4:-1;
      if(bt!==d.bt){d.bt=bt;[...q(".beats").children].forEach((c,k)=>c.classList.toggle("on",k===bt))}
      const cv=q(".wave"),g=cv.getContext("2d"),W=cv.width,H=cv.height;
      g.clearRect(0,0,W,H);if(d.wf)g.drawImage(d.wf,0,0);
      const x=p/d.buf.duration*W;g.fillStyle="rgba(0,0,0,.45)";g.fillRect(0,0,x,H);
      g.fillStyle="#fff";g.fillRect(x-1,0,2,H);g.fillStyle=d.c;g.fillRect(d.cue/d.buf.duration*W-1,0,2,H);
      const dur=d.buf.duration;
      if(d.loop){g.fillStyle=d.c+"66";g.fillRect(d.loop.s/dur*W,0,(d.loop.e-d.loop.s)/dur*W,H)}
      g.font="bold 12px sans-serif";
      d.hc.forEach((t,i)=>{if(t==null)return;const hx=t/dur*W;g.fillStyle="#fff";g.fillRect(hx-1,0,2,H);g.fillText(LET[i],hx+4,12)});
      drawBars(d,g,W,H);drawZoom(d,p);
      if(d.bpm){const bx=(p-(d.beat0||0))*d.bpm/60,txt=bx<0?"-":(Math.floor(bx/4)+1)+"."+(Math.floor(bx)%4+1);if(txt!==d.bartxt){d.bartxt=txt;q(".barlcd").textContent=txt}}
      const a=new Uint8Array(d.an.fftSize);d.an.getByteTimeDomainData(a);let m=0;for(const v of a)m=Math.max(m,Math.abs(v-128));
      q(".vu i").style.height=Math.min(100,m/128*140)+"%";
    }
    q(".rot").setAttribute("transform","rotate("+d.ang%360+")");
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);


/* ---------- spotify ---------- */
const SP_SCOPE="streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";
const redirectUri=location.origin+location.pathname;
const spmsg=t=>{$("#spmsg").textContent=t};
let spPlayer=null,spDev=null,spVol=.8,spLevel=.8,spPaused=true,spHas=false,fadeT=null;
$("#spred").textContent=redirectUri;
$("#spcid").value=localStorage.getItem("sp_cid")||"";
if(!/^(127\.0\.0\.1|\[::1\])$/.test(location.hostname)&&location.protocol!=="https:")
  spmsg("Spotify only accepts https or 127.0.0.1 here. Open this page at http://127.0.0.1:3000 (npm start).");
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");

async function spLogin(){
  const cid=$("#spcid").value.trim();
  if(!cid){spmsg("Paste your Spotify Client ID first.");return}
  if(!window.crypto||!crypto.subtle){spmsg("Open this page at http://127.0.0.1:3000 so the browser allows sign in.");return}
  localStorage.setItem("sp_cid",cid);
  const v=b64(crypto.getRandomValues(new Uint8Array(48)));localStorage.setItem("sp_ver",v);
  const ch=b64(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));
  location.href="https://accounts.spotify.com/authorize?"+new URLSearchParams({response_type:"code",client_id:cid,scope:SP_SCOPE,redirect_uri:redirectUri,code_challenge_method:"S256",code_challenge:ch});
}
async function spToken(body){
  const r=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:localStorage.getItem("sp_cid"),...body})});
  const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||"token error");
  const old=JSON.parse(localStorage.getItem("sp_tok")||"{}");
  const t={access:j.access_token,refresh:j.refresh_token||old.refresh,exp:Date.now()+j.expires_in*1000};
  localStorage.setItem("sp_tok",JSON.stringify(t));return t;
}
async function spAccess(){
  let t=JSON.parse(localStorage.getItem("sp_tok")||"null");if(!t)throw new Error("Not connected.");
  if(Date.now()>t.exp-60000)t=await spToken({grant_type:"refresh_token",refresh_token:t.refresh});
  return t.access;
}
function spStart(){
  $("#spsetup").hidden=true;$("#spon").hidden=false;spmsg("Starting the Spotify player…");
  window.onSpotifyWebPlaybackSDKReady=()=>{
    spPlayer=new Spotify.Player({name:"Virtual DJ",volume:spVol,getOAuthToken:cb=>spAccess().then(cb).catch(()=>spmsg("Session expired. Disconnect and connect again."))});
    spPlayer.addListener("ready",({device_id})=>{spDev=device_id;spmsg("Spotify player ready.")});
    spPlayer.addListener("not_ready",()=>{spDev=null;spmsg("Spotify player went offline.")});
    spPlayer.addListener("player_state_changed",s=>{
      if(!s||!s.track_window.current_track)return;
      const t=s.track_window.current_track;spHas=true;spPaused=s.paused;
      $("#spnow").textContent=t.name+" - "+t.artists.map(a=>a.name).join(", ");
      $("#sptog").textContent=s.paused?"Play":"Pause";
    });
    ["initialization_error","authentication_error","account_error","playback_error"].forEach(ev=>
      spPlayer.addListener(ev,({message})=>spmsg(ev==="account_error"?"Spotify Premium is required to play here.":message)));
    spPlayer.connect();
  };
  const s=document.createElement("script");s.src="https://sdk.scdn.co/spotify-player.js";
  s.onerror=()=>spmsg("Could not load the Spotify player script.");document.head.append(s);
}
$("#spconn").onclick=spLogin;
$("#spoff").onclick=()=>{if(spPlayer)spPlayer.disconnect();["sp_tok","sp_ver"].forEach(k=>localStorage.removeItem(k));location.reload()};
$("#spgo").onclick=async()=>{
  const m=$("#sp").value.match(/(track|album|playlist|episode)[\/:]([A-Za-z0-9]+)/);
  if(!m){spmsg("That does not look like a Spotify link.");return}
  if(!spPlayer||!spDev){spmsg("The player is still starting. Try again in a moment.");return}
  spPlayer.activateElement();
  const uri=`spotify:${m[1]}:${m[2]}`,body=(m[1]==="track"||m[1]==="episode")?{uris:[uri]}:{context_uri:uri};
  try{
    const r=await fetch("https://api.spotify.com/v1/me/player/play?device_id="+spDev,{method:"PUT",headers:{Authorization:"Bearer "+await spAccess(),"Content-Type":"application/json"},body:JSON.stringify(body)});
    spmsg(r.ok?"":"Spotify refused that ("+r.status+"). Check that Premium is active and the app has Web API enabled.");
  }catch(e){spmsg(e.message)}
};
$("#sptog").onclick=()=>{if(spPlayer){spPlayer.activateElement();spPlayer.togglePlay()}};
$("#spprev").onclick=()=>spPlayer&&spPlayer.previousTrack();
$("#spnext").onclick=()=>spPlayer&&spPlayer.nextTrack();
$("#spvol").oninput=e=>{spVol=spLevel=+e.target.value;if(spPlayer)spPlayer.setVolume(spVol)};

/* ---------- other sources: YouTube, Apple Music ---------- */
let ytp=null,ytReady=false,ytHas=false,mk=null,amHas=false,amScript=false,curTab="spotify";
const setAmVol=v=>{try{mk.volume=v}catch(e){}try{mk.player.volume=v}catch(e){}};

/* Every source is a separate player (its audio cannot go through the mixer), so each exposes the same
   few controls and the handoff fade treats them alike. */
const SRC={
  spotify:{name:"Spotify",ok:()=>!!(spPlayer&&spDev),has:()=>spHas,paused:()=>spPaused,
    get vol(){return spVol},get lvl(){return spLevel},set lvl(v){spLevel=v},
    set:v=>spPlayer.setVolume(v),resume:()=>spPlayer.resume(),pause:()=>spPlayer.pause()},
  youtube:{name:"YouTube",vol:.8,lvl:.8,ok:()=>ytReady,has:()=>ytHas,paused:()=>![1,3].includes(ytp.getPlayerState()),
    set:v=>ytp.setVolume(v*100),resume:()=>ytp.playVideo(),pause:()=>ytp.pauseVideo()},
  apple:{name:"Apple Music",vol:.8,lvl:.8,ok:()=>!!mk,has:()=>amHas,paused:()=>!mk.isPlaying,
    set:setAmVol,resume:()=>mk.play(),pause:()=>mk.pause()}
};

/* YouTube: the official IFrame player. YouTube Music links share the same video ids. */
function ytMake(then){
  const go=()=>{
    $("#ytplayer").textContent="";
    ytp=new YT.Player("ytplayer",{width:"100%",height:"220",playerVars:{playsinline:1,rel:0},events:{
      onReady:()=>{ytReady=true;ytp.setVolume(SRC.youtube.vol*100);if(then)then()},
      onStateChange:e=>{if(e.data===1){ytHas=true;$("#ytnow").textContent=ytp.getVideoData().title||"Playing"}$("#yttog").textContent=e.data===1?"Pause":"Play"},
      onError:e=>spmsg(e.data===101||e.data===150?"The owner of that video does not allow embedded playback.":"YouTube could not play that ("+e.data+").")}});
  };
  if(window.YT&&YT.Player)return go();
  window.onYouTubeIframeAPIReady=go;
  const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";
  s.onerror=()=>spmsg("Could not load the YouTube player.");document.head.append(s);
}
$("#ytgo").onclick=()=>{
  let id=null,list=null;
  try{
    const x=new URL($("#ytlink").value.trim());
    id=x.searchParams.get("v")||(x.hostname==="youtu.be"?x.pathname.slice(1):null)||(x.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/)||[])[1]||null;
    list=x.searchParams.get("list");
  }catch(e){}
  if(!id&&!list){spmsg("That does not look like a YouTube or YouTube Music link.");return}
  spmsg("");
  const go=()=>id?ytp.loadVideoById(id):ytp.loadPlaylist({list,listType:"playlist"});
  if(ytp&&ytReady)go();else if(!ytp)ytMake(go);else spmsg("The player is still starting. Try again in a moment.");
};
$("#yttog").onclick=()=>{if(ytReady)ytp.getPlayerState()===1?ytp.pauseVideo():ytp.playVideo()};
$("#ytprev").onclick=()=>ytReady&&ytp.previousVideo();
$("#ytnext").onclick=()=>ytReady&&ytp.nextVideo();

/* Apple Music: MusicKit JS. The developer token is made outside the browser (tools/apple-token.js). */
function amPrep(){
  if(amScript||window.MusicKit)return;amScript=true;
  const s=document.createElement("script");s.src="https://js-cdn.music.apple.com/musickit/v1/musickit.js";
  s.onerror=()=>{amScript=false;spmsg("Could not load the Apple Music player.")};document.head.append(s);
}
$("#amtok").value=localStorage.getItem("am_tok")||"";
$("#amconn").onclick=async()=>{
  const tok=$("#amtok").value.trim();
  if(!tok){spmsg("Paste your Apple Music developer token first.");return}
  if(!window.MusicKit){amPrep();spmsg("Loading the Apple Music player. Press Connect again in a moment.");return}
  try{
    await MusicKit.configure({developerToken:tok,app:{name:"Virtual DJ",build:"1.0"}});
    mk=MusicKit.getInstance();await mk.authorize();localStorage.setItem("am_tok",tok);setAmVol(SRC.apple.vol);
    mk.addEventListener("mediaItemDidChange",()=>{const it=mk.nowPlayingItem;if(it){amHas=true;$("#amnow").textContent=it.title+" - "+(it.artistName||"")}});
    mk.addEventListener("playbackStateDidChange",()=>{$("#amtog").textContent=mk.isPlaying?"Pause":"Play"});
    $("#amsetup").hidden=true;$("#amon").hidden=false;spmsg("Apple Music ready.");
  }catch(e){mk=null;spmsg("Apple Music sign in failed. Check the token, and that your account has a subscription.")}
};
$("#amgo").onclick=async()=>{
  if(!mk)return;let u;
  try{u=new URL($("#amlink").value.trim())}catch(e){spmsg("Paste an Apple Music link.");return}
  const i=u.searchParams.get("i"),seg=u.pathname.split("/").filter(Boolean),last=seg[seg.length-1];
  const q=i?{song:i}:seg.includes("song")?{song:last}:seg.includes("album")?{album:last}:seg.includes("playlist")?{playlist:last}:null;
  if(!q){spmsg("That does not look like an Apple Music song, album or playlist link.");return}
  try{await mk.setQueue(q);await mk.play();spmsg("")}catch(e){spmsg("Apple Music could not play that.")}
};
$("#amtog").onclick=()=>{if(mk)mk.isPlaying?mk.pause():mk.play()};
$("#amprev").onclick=()=>mk&&mk.skipToPreviousItem();
$("#amnext").onclick=()=>mk&&mk.skipToNextItem();
$("#amoff").onclick=()=>{localStorage.removeItem("am_tok");location.reload()};
["youtube","apple"].forEach(k=>{
  const id=k==="youtube"?"#ytvol":"#amvol";
  $(id).oninput=e=>{const S=SRC[k];S.vol=S.lvl=+e.target.value;if(S.ok())S.set(S.vol)};
});

/* tabs */
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{
  curTab=b.dataset.s;
  document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x===b));
  document.querySelectorAll(".pane").forEach(p=>{p.hidden=p.id!=="pane-"+curTab});
  const S=SRC[curTab];$("#fadebar").hidden=!S;if(S)$("#srcto").textContent="Fade to "+S.name;
  if(curTab==="apple")amPrep();
});

/* handoff: fade the decks out and the chosen source in (or back), and quiet any other source */
function srcFade(toSrc){
  init();const S=SRC[curTab];if(!S)return;
  if(!S.ok()){spmsg(S.name+" is not ready yet. Connect it and start a track first.");return}
  if(toSrc&&!S.has()){spmsg("Start a track on "+S.name+" first, then fade to it.");return}
  clearInterval(fadeT);
  const sec=Math.max(1,Math.min(30,+$("#spsec").value||8)),t0=performance.now(),k0=fadeG.gain.value,kT=toSrc?0:1;
  const others=toSrc?Object.values(SRC).filter(o=>o!==S&&o.ok()&&!o.paused()).map(o=>({o,s0:o.lvl})):[];
  if(toSrc&&S.paused()){S.lvl=0;S.set(0);S.resume()}
  const s0=S.lvl,sT=toSrc?S.vol:0;
  fadeT=setInterval(()=>{
    const p=Math.min(1,(performance.now()-t0)/(sec*1000));
    fadeG.gain.linearRampToValueAtTime(k0+(kT-k0)*p,ctx.currentTime+.1);
    S.lvl=s0+(sT-s0)*p;S.set(S.lvl);
    others.forEach(x=>{x.o.lvl=x.s0*(1-p);x.o.set(x.o.lvl)});
    if(p>=1){
      clearInterval(fadeT);
      const rest=o=>Promise.resolve(o.pause()).then(()=>{o.lvl=o.vol;o.set(o.vol)});
      others.forEach(x=>rest(x.o));
      if(toSrc){decks.forEach(d=>{if(d.playing)stop(d)});spmsg(S.name+" is playing. The decks are muted until you fade back.")}
      else{rest(S);spmsg("Back on the decks.")}
    }
  },80);
}
$("#srcto").onclick=()=>srcFade(true);$("#srcback").onclick=()=>srcFade(false);

(async()=>{
  const q=new URLSearchParams(location.search);
  if(q.get("error")){spmsg("Spotify said: "+q.get("error"));history.replaceState({},"",location.pathname)}
  else if(q.get("code")){
    try{await spToken({grant_type:"authorization_code",code:q.get("code"),redirect_uri:redirectUri,code_verifier:localStorage.getItem("sp_ver")})}
    catch(e){spmsg("Sign in failed: "+e.message)}
    history.replaceState({},"",location.pathname);
  }
  if(localStorage.getItem("sp_tok"))spStart();
})();