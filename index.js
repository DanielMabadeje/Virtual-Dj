const $=(s,e=document)=>e.querySelector(s);
const COL=["#ffb02e","#3cd6c8","#ff5d73","#9b8cff"];
let ctx,fadeG,cueBus,hpMaster,hpOut,hpAudio,master,echoIn,revIn,delay,cf=.5,lib=[];
const decks=[];

/* ---------- build deck UI ---------- */
COL.forEach((c,i)=>{
  const n=i+1,s=document.createElement("section");
  s.className="box deck"+(i>1?" x":"");s.id="d"+n;s.style.setProperty("--c",c);
  s.innerHTML=`
  <header><span class="tag">${n}</span><span class="title">Empty. Load a track from the library.</span><input class="lcd bpm" type="text" inputmode="decimal" value="--.-" title="BPM: type a number, or use the up and down arrow keys" aria-label="BPM deck ${n}"><span class="lcd time">0:00</span></header>
  <canvas class="wave" width="900" height="70"></canvas>
  <div class="gridrow"><span class="beats" title="Current beat"><i></i><i></i><i></i><i></i></span><button class="bh" title="Halve the BPM">&frac12;</button><button class="bd" title="Double the BPM">&times;2</button><button class="tap" title="Tap along to the beat to set BPM and beat 1">Tap</button><button class="grid" title="Mark the playhead as beat 1">Set 1</button></div>
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
  <div class="btns"><button class="play">Play</button><button class="cue">Cue</button><button class="sync">Sync</button><button class="brake">Brake</button><button class="echo">Echo</button><button class="rev">Reverb</button><button class="pfl" title="Hear this deck in your headphones">Phones</button></div>
  <div class="pads">${"ABCD".split("").map((l,k)=>`<button class="hc" title="Click to set or jump. Right-click or shift-click to clear.">${l}</button>`).join("")}</div>
  <div class="loops"><span>Loop (beats)</span><button class="lh" title="Halve">&frac12;</button>${[1,2,4,8].map(b=>`<button class="lp" data-b="${b}">${b}</button>`).join("")}<button class="ld" title="Double">&times;2</button></div>
  <div class="knobs">
    <label>Low<input type="range" class="kn eql" min="-1" max="1" step=".01" value="0"></label>
    <label>Mid<input type="range" class="kn eqm" min="-1" max="1" step=".01" value="0"></label>
    <label>High<input type="range" class="kn eqh" min="-1" max="1" step=".01" value="0"></label>
    <label>Filter<input type="range" class="kn flt" min="0" max="1" step=".01" value=".5"></label>
  </div>
  <div class="row" style="margin-top:10px;align-items:center;color:var(--dim);font-size:12px">Crossfader side
    <select class="asg" style="background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:3px"><option value="A"${i%2?"":" selected"}>A</option><option value="B"${i%2?" selected":""}>B</option><option value="T">Thru</option></select></div>`;
  $("#stage").appendChild(s);
  decks.push({n,c,el:s,buf:null,rev:null,playing:false,off:0,t0:0,rate:1,cue:0,bpm:0,ang:0,scr:false,v:0,moved:false,braking:false,wf:null,hc:[null,null,null,null],loop:null});
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
  echoIn=ctx.createGain();delay=ctx.createDelay(2);delay.delayTime.value=.375;
  const fb=ctx.createGain(),lp=ctx.createBiquadFilter();fb.gain.value=.5;lp.frequency.value=3000;
  echoIn.connect(delay);delay.connect(lp);lp.connect(fb);fb.connect(delay);lp.connect(master);
  revIn=ctx.createGain();const cv=ctx.createConvolver(),N=ctx.sampleRate*2.4,ir=ctx.createBuffer(2,N,ctx.sampleRate);
  for(let c=0;c<2;c++){const a=ir.getChannelData(c);for(let i=0;i<N;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/N,3)}
  cv.buffer=ir;const rg=ctx.createGain();rg.gain.value=.8;revIn.connect(cv);cv.connect(rg);rg.connect(master);
  cueBus=ctx.createGain();hpMaster=ctx.createGain();hpOut=ctx.createGain();
  const cueDest=ctx.createMediaStreamDestination();
  cueBus.connect(hpOut);master.connect(hpMaster);hpMaster.connect(hpOut);hpOut.connect(cueDest);
  hpAudio=new Audio();hpAudio.srcObject=cueDest.stream;hpMixSet();
  decks.forEach(d=>{
    const f=(t,fr)=>{const b=ctx.createBiquadFilter();b.type=t;b.frequency.value=fr;return b};
    d.low=f("lowshelf",250);d.mid=f("peaking",1200);d.high=f("highshelf",4000);d.flt=f("allpass",1000);d.flt.Q.value=2;
    d.vol=ctx.createGain();d.x=ctx.createGain();d.an=ctx.createAnalyser();d.an.fftSize=256;
    d.sE=ctx.createGain();d.sR=ctx.createGain();d.sE.gain.value=d.sR.gain.value=0;
    d.low.connect(d.mid);d.mid.connect(d.high);d.high.connect(d.flt);d.flt.connect(d.vol);d.vol.connect(d.x);d.x.connect(d.an);d.x.connect(master);
    d.vol.connect(d.sE);d.sE.connect(echoIn);d.vol.connect(d.sR);d.sR.connect(revIn);
    d.pfl=ctx.createGain();d.pfl.gain.value=$d(d,".pfl").classList.contains("on")?1:0;d.flt.connect(d.pfl);d.pfl.connect(cueBus);
    applyAll(d);
  });
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
  s.connect(d.low);s.start(0,d.off);
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
function setRate(d,r){if(d.playing){d.off=pos(d);d.t0=ctx.currentTime;d.src.playbackRate.value=r}d.rate=r}

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
async function load(d,file){
  init();stop(d);const t=$d(d,".title");t.textContent="Loading "+file.name+"…";
  try{
    const buf=await ctx.decodeAudioData(await file.arrayBuffer());
    const rev=ctx.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate);
    for(let c=0;c<buf.numberOfChannels;c++)rev.getChannelData(c).set(buf.getChannelData(c).slice().reverse());
    d.buf=buf;d.rev=rev;d.off=0;d.cue=0;{const a=bpmOf(buf);d.bpm=a.bpm;d.beat0=a.t0}d.hc=[null,null,null,null];d.loop=null;padsUI(d);loopUI(d);
    const W=900,H=70,o=document.createElement("canvas");o.width=W;o.height=H;const g=o.getContext("2d"),x=buf.getChannelData(0),step=Math.floor(x.length/W);
    g.fillStyle=d.c;
    for(let i=0;i<W;i++){let m=0;for(let j=0;j<step;j+=16){const v=Math.abs(x[i*step+j]);if(v>m)m=v}const h=Math.max(1,m*H*.95);g.fillRect(i,(H-h)/2,1,h)}
    d.wf=o;t.textContent=file.name.replace(/\.[^.]+$/,"");setBpm(d,d.bpm);
    $d(d,".pitch").value=0;d.rate=1;$d(d,".pv").textContent="0.0%";
  }catch(err){t.textContent="Could not read that file. Try an mp3, wav or m4a."}
}

/* ---------- library ---------- */
function addFiles(files){
  [...files].filter(f=>f.type.startsWith("audio/")).forEach(f=>lib.push(f));
  const L=$("#lib");L.innerHTML="";
  lib.forEach(f=>{
    const r=document.createElement("div");r.className="song";const nm=document.createElement("span");nm.textContent=f.name;r.append(nm);
    decks.forEach(d=>{const b=document.createElement("button");b.textContent=d.n;b.title="Load on deck "+d.n;b.style.setProperty("--c",d.c);if(d.n>2)b.classList.add("x");b.onclick=()=>load(d,f);r.append(b)});
    L.append(r);
  });
}
$("#pick").onclick=()=>$("#file").click();$("#file").onchange=e=>addFiles(e.target.files);
addEventListener("dragover",e=>{e.preventDefault();$("#drop").classList.add("hot")});
addEventListener("dragleave",()=>$("#drop").classList.remove("hot"));
addEventListener("drop",e=>{e.preventDefault();$("#drop").classList.remove("hot");addFiles(e.dataTransfer.files)});

/* ---------- bpm, beat grid, headphones ---------- */
function setBpm(d,v){d.bpm=v;$d(d,".bpm").value=v?v.toFixed(1):"--.-";if(d.loop&&ctx)loopOff(d)}
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
function padsUI(d){d.el.querySelectorAll(".hc").forEach((b,i)=>{const t=d.hc[i];b.classList.toggle("set",t!=null);b.textContent=LET[i]+(t!=null?" "+fmt(t):"")})}
function loopUI(d){d.el.querySelectorAll(".lp").forEach(b=>b.classList.toggle("on",!!d.loop&&Math.abs(d.loop.beats-+b.dataset.b)<.001))}
function loopOff(d){
  if(!d.loop)return;
  if(d.playing){d.off=pos(d);d.t0=ctx.currentTime;d.src.loop=false}
  d.loop=null;loopUI(d);
}
function loopSet(d,beats){
  if(!d.buf||!d.bpm||beats<.25||beats>32)return;init();
  if(d.loop&&Math.abs(d.loop.beats-beats)<.001){loopOff(d);return}
  const len=beats*60/d.bpm,p=pos(d),s=d.loop?d.loop.s:p;
  if(s+len>d.buf.duration)return;
  if(d.loop&&d.playing){const q=s+(p-s)%len;stop(d);d.off=q;d.loop={s,e:s+len,beats};play(d)}
  else{d.loop={s,e:s+len,beats};if(d.playing){d.src.loopStart=s;d.src.loopEnd=s+len;d.src.loop=true}}
  loopUI(d);
}

/* ---------- controls ---------- */
decks.forEach(d=>{
  const q=s=>$d(d,s);
  q(".play").onclick=()=>{init();if(!d.buf)return;d.playing?stop(d):play(d)};
  q(".cue").onclick=()=>{init();if(!d.buf)return;if(d.playing){stop(d);d.off=d.cue}else d.cue=d.off};
  q(".pitch").oninput=e=>{init();const v=+e.target.value;q(".pv").textContent=(v>0?"+":"")+v.toFixed(1)+"%";setRate(d,1+v/100)};
  q(".vol").oninput=e=>{init();d.vol.gain.value=+e.target.value};
  q(".eql").oninput=e=>{init();d.low.gain.value=eqdb(+e.target.value)};
  q(".eqm").oninput=e=>{init();d.mid.gain.value=eqdb(+e.target.value)};
  q(".eqh").oninput=e=>{init();d.high.gain.value=eqdb(+e.target.value)};
  q(".flt").oninput=()=>{init();setFilter(d)};
  q(".asg").onchange=()=>{init();applyX(d)};
  const fx=(btn,send)=>{q(btn).onclick=e=>{init();const on=e.currentTarget.classList.toggle("on");
    if(send==="sE"&&on&&d.bpm)delay.delayTime.value=Math.min(1.5,Math.max(.1,60/(d.bpm*d.rate)*.75));
    d[send].gain.value=on?.6:0}};
  fx(".echo","sE");fx(".rev","sR");
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
      if(e.shiftKey)d.hc[i]=null;else if(d.hc[i]==null)d.hc[i]=pos(d);else seek(d,d.hc[i]);
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
  q(".grid").onclick=()=>{init();if(d.buf)d.beat0=pos(d)};
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

/* ---------- animation loop ---------- */
const fmt=t=>Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
let prev=performance.now();
function frame(now){
  syncFaders();
  const dt=(now-prev)/1000;prev=now;
  decks.forEach(d=>{
    const q=s=>$d(d,s);
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

/* Spotify cannot pass through the mixer (its audio is protected), so the handoff fades the decks out
   and Spotify in with two separate volume controls. */
function spFade(toSp){
  init();
  if(!spPlayer||!spDev){spmsg("Connect Spotify and wait for the player first.");return}
  if(toSp&&!spHas){spmsg("Play a Spotify track first, then fade to it.");return}
  clearInterval(fadeT);spPlayer.activateElement();
  const sec=Math.max(1,Math.min(30,+$("#spsec").value||8)),t0=performance.now();
  const k0=fadeG.gain.value,kT=toSp?0:1;
  if(toSp&&spPaused){spLevel=0;spPlayer.setVolume(0);spPlayer.resume()}
  const s0=spLevel,sT=toSp?spVol:0;
  fadeT=setInterval(()=>{
    const p=Math.min(1,(performance.now()-t0)/(sec*1000));
    fadeG.gain.linearRampToValueAtTime(k0+(kT-k0)*p,ctx.currentTime+.1);
    spLevel=s0+(sT-s0)*p;spPlayer.setVolume(spLevel);
    if(p>=1){
      clearInterval(fadeT);
      if(toSp){decks.forEach(d=>{if(d.playing)stop(d)});spmsg("Spotify is playing. The decks are muted until you fade back.")}
      else{spPlayer.pause().then(()=>{spLevel=spVol;spPlayer.setVolume(spVol)});spmsg("Back on the decks.")}
    }
  },80);
}
$("#spto").onclick=()=>spFade(true);$("#spback").onclick=()=>spFade(false);
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