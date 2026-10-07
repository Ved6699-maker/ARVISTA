const state = {
  stream: null,
  facingMode: "environment",
  model: null,
  running: false,
  frozen: false,
  lastDetection: null,
  animationTime: 0,
  frame: 0
};

const $ = (id) => document.getElementById(id);
const camera = $("camera");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");

const effects = {
  person: { icon:"🧍", title:"Human Hologram", color:"#6da8ff", kind:"rings" },
  book: { icon:"📖", title:"Magic Pages", color:"#62f3db", kind:"pages" },
  laptop: { icon:"💻", title:"Digital Portal", color:"#6da8ff", kind:"portal" },
  cell_phone: { icon:"📱", title:"Holo Interface", color:"#62f3db", kind:"portal" },
  bottle: { icon:"🧴", title:"Energy Flow", color:"#62f3db", kind:"particles" },
  cup: { icon:"☕", title:"Steam Aura", color:"#ffd166", kind:"steam" },
  apple: { icon:"🍎", title:"Growth Pulse", color:"#ff6b7a", kind:"pulse" },
  banana: { icon:"🍌", title:"Golden Spark", color:"#ffd166", kind:"spark" },
  backpack: { icon:"🎒", title:"Explorer Mode", color:"#6da8ff", kind:"particles" },
  bicycle: { icon:"🚲", title:"Motion Grid", color:"#62f3db", kind:"grid" },
  car: { icon:"🚗", title:"Vehicle Scan", color:"#6da8ff", kind:"grid" },
  chair: { icon:"🪑", title:"Energy Frame", color:"#62f3db", kind:"rings" },
  tv: { icon:"📺", title:"Holo Screen", color:"#6da8ff", kind:"portal" },
  keyboard: { icon:"⌨️", title:"Data Stream", color:"#62f3db", kind:"grid" },
  mouse: { icon:"🖱️", title:"Pointer Portal", color:"#62f3db", kind:"pulse" },
  clock: { icon:"🕒", title:"Time Portal", color:"#ffd166", kind:"rings" },
  vase: { icon:"🏺", title:"Bloom Effect", color:"#62f3db", kind:"particles" },
  dog: { icon:"🐕", title:"Pet Aura", color:"#ffd166", kind:"rings" },
  cat: { icon:"🐈", title:"Pet Aura", color:"#c89cff", kind:"rings" },
  bird: { icon:"🐦", title:"Flight Trail", color:"#6da8ff", kind:"particles" },
  bottle: { icon:"🧴", title:"Energy Flow", color:"#62f3db", kind:"particles" }
};

function normalizeName(name){ return name.toLowerCase().replaceAll(" ","_"); }

function setScreen(name){
  $("homeScreen").classList.toggle("active", name === "home");
  $("scannerScreen").classList.toggle("active", name === "scanner");
}

function setStatus(text, ready=false){
  const pill = $("statusPill");
  pill.innerHTML = `<i></i>${text}`;
  pill.classList.toggle("ready", ready);
}

function toast(message){
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.remove("show"), 2200);
}

async function loadModel(){
  setStatus("Loading AI");
  try{
    state.model = await cocoSsd.load({base:"lite_mobilenet_v2"});
    setStatus("AI Ready", true);
  }catch(err){
    console.error(err);
    setStatus("AI unavailable");
    throw new Error("The AI model could not be loaded. Check your internet connection and reload the page.");
  }
}

async function startCamera(){
  if(state.stream) stopCamera(false);
  if(!navigator.mediaDevices?.getUserMedia){
    showError("Camera access is not supported by this browser. Try the latest Chrome or Safari.");
    return;
  }
  try{
    state.stream = await navigator.mediaDevices.getUserMedia({
      video:{facingMode:state.facingMode,width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    camera.srcObject = state.stream;
    await camera.play();
    resizeCanvas();
    state.running = true;
    state.frozen = false;
    setScreen("scanner");
    if(!state.model) await loadModel();
    detectLoop();
    animate();
  }catch(err){
    console.error(err);
    showError("Camera permission was denied or the camera is already being used by another app. On GitHub Pages, make sure you allow camera access.");
  }
}

function stopCamera(showHome=true){
  state.running = false;
  if(state.stream){
    state.stream.getTracks().forEach(t=>t.stop());
    state.stream = null;
  }
  camera.srcObject = null;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(showHome) setScreen("home");
}

function resizeCanvas(){
  const rect = camera.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width*dpr);
  canvas.height = Math.floor(rect.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

window.addEventListener("resize", resizeCanvas);

function showError(message){
  $("errorText").textContent = message;
  $("errorModal").classList.remove("hidden");
}

async function detectLoop(){
  if(!state.running) return;
  if(!state.frozen && state.model && camera.readyState >= 2){
    try{
      const predictions = await state.model.detect(camera, 12, 0.45);
      const best = predictions
        .filter(p => p.score >= 0.52)
        .sort((a,b)=>b.score-a.score)[0] || null;
      state.lastDetection = best;
      updateDetectionCard(best);
    }catch(err){ console.warn("Detection error", err); }
  }
  setTimeout(detectLoop, 250);
}

function updateDetectionCard(pred){
  const card = $("detectionCard");
  if(!pred){ card.classList.add("hidden"); return; }
  const key = normalizeName(pred.class);
  const effect = effects[key] || {icon:"✦",title:"Holo Highlight",color:"#62f3db",kind:"rings"};
  $("detIcon").textContent = effect.icon;
  $("detectedName").textContent = `${pred.class} • ${Math.round(pred.score*100)}%`;
  $("effectBtn").textContent = effect.title;
  card.classList.remove("hidden");
}

function boxFor(pred){
  const r = camera.getBoundingClientRect();
  const sx = r.width / camera.videoWidth;
  const sy = r.height / camera.videoHeight;
  // Video and canvas are mirrored visually. Convert the model's x coordinate.
  return {x:r.width-(pred.bbox[0]+pred.bbox[2])*sx,y:pred.bbox[1]*sy,w:pred.bbox[2]*sx,h:pred.bbox[3]*sy};
}

function animate(){
  if(!state.running) return;
  state.animationTime += 0.035;
  const r = camera.getBoundingClientRect();
  ctx.clearRect(0,0,r.width,r.height);
  if(state.lastDetection && !state.frozen){
    const box = boxFor(state.lastDetection);
    const key = normalizeName(state.lastDetection.class);
    const effect = effects[key] || {color:"#62f3db",kind:"rings"};
    drawEffect(box,effect);
  } else if(state.lastDetection && state.frozen){
    const box = boxFor(state.lastDetection);
    const key = normalizeName(state.lastDetection.class);
    drawEffect(box,effects[key] || {color:"#62f3db",kind:"rings"});
  }
  requestAnimationFrame(animate);
}

function glowStroke(color, width=2){
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.shadowColor=color;
  ctx.shadowBlur=14;
}

function drawEffect(b,e){
  const cx=b.x+b.w/2, cy=b.y+b.h/2;
  const t=state.animationTime;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  glowStroke(e.color,2);

  // Object outline
  ctx.setLineDash([8,7]);
  ctx.lineDashOffset=-t*30;
  ctx.strokeRect(b.x,b.y,b.w,b.h);
  ctx.setLineDash([]);

  if(e.kind==="rings") drawRings(cx,cy,Math.max(b.w,b.h)*.34,e.color,t);
  if(e.kind==="portal") drawPortal(cx,cy,Math.max(b.w,b.h)*.32,e.color,t);
  if(e.kind==="particles") drawParticles(cx,cy,Math.max(b.w,b.h)*.38,e.color,t);
  if(e.kind==="pages") drawPages(cx,cy,b,e.color,t);
  if(e.kind==="steam") drawSteam(cx,cy,b,e.color,t);
  if(e.kind==="pulse") drawPulse(cx,cy,Math.max(b.w,b.h)*.32,e.color,t);
  if(e.kind==="spark") drawParticles(cx,cy,Math.max(b.w,b.h)*.36,e.color,t);
  if(e.kind==="grid") drawGrid(b,e.color,t);

  ctx.restore();
}

function drawRings(x,y,r,c,t){
  for(let i=0;i<3;i++){
    const rr=r*(.6+i*.22)+Math.sin(t*2+i)*7;
    ctx.globalAlpha=.55-i*.12;
    ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=.8; ctx.beginPath();ctx.arc(x,y,8+Math.sin(t*3)*4,0,Math.PI*2);ctx.stroke();
}

function drawPortal(x,y,r,c,t){
  ctx.globalAlpha=.75;
  ctx.beginPath();ctx.ellipse(x,y,r,r*.35,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y,r*.75,r*.23,0,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=.22;ctx.fillStyle=c;ctx.fill();
  ctx.globalAlpha=.9;
  for(let i=0;i<8;i++){
    const a=t+i*Math.PI/4;
    ctx.fillRect(x+Math.cos(a)*r*.85-2,y+Math.sin(a)*r*.85-2,4,4);
  }
}

function drawParticles(x,y,r,c,t){
  ctx.fillStyle=c;
  for(let i=0;i<18;i++){
    const a=i*2.399+t*(.7+(i%3)*.12);
    const rr=(r*(.25+((i*37)%100)/100*.9))%r;
    const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr-Math.abs(Math.sin(t+i))*14;
    ctx.globalAlpha=.25+.5*((i%4)/4);
    ctx.beginPath();ctx.arc(px,py,2+(i%3),0,Math.PI*2);ctx.fill();
  }
}

function drawPages(x,y,b,c,t){
  ctx.globalAlpha=.7;
  for(let i=0;i<5;i++){
    const yy=y+b.h*.35+i*7+Math.sin(t*2+i)*5;
    const lift=Math.sin(t*2+i)*14;
    ctx.beginPath();ctx.moveTo(x-b.w*.28,yy);ctx.quadraticCurveTo(x,yy+lift,x+b.w*.28,yy);ctx.stroke();
  }
  ctx.globalAlpha=.9;ctx.fillStyle=c;ctx.font="bold 12px system-ui";ctx.fillText("AR",x-9,y-b.h*.35);
}

function drawSteam(x,y,b,c,t){
  ctx.globalAlpha=.65;
  for(let i=0;i<4;i++){
    ctx.beginPath();
    const sx=x+(i-1.5)*12;
    ctx.moveTo(sx,y-b.h*.2);
    ctx.bezierCurveTo(sx-10,y-b.h*.4,sx+12,y-b.h*.5,sx,y-b.h*.72-Math.sin(t+i)*8);
    ctx.stroke();
  }
}

function drawPulse(x,y,r,c,t){
  const p=(t%2)/2;
  ctx.globalAlpha=1-p;
  ctx.beginPath();ctx.arc(x,y,r*(.6+p*1.1),0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(x,y,r*.35,0,Math.PI*2);ctx.stroke();
}

function drawGrid(b,c,t){
  ctx.globalAlpha=.45;
  const step=18;
  for(let x=b.x;x<b.x+b.w;x+=step){
    ctx.beginPath();ctx.moveTo(x,b.y);ctx.lineTo(x,b.y+b.h);ctx.stroke();
  }
  for(let y=b.y;y<b.y+b.h;y+=step){
    ctx.beginPath();ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y);ctx.stroke();
  }
  ctx.globalAlpha=.9;
  ctx.beginPath();ctx.moveTo(b.x,b.y+b.h);ctx.lineTo(b.x+b.w,b.y+b.h);ctx.stroke();
}

$("startBtn").addEventListener("click", startCamera);
$("stopBtn").addEventListener("click", ()=>stopCamera(true));
$("freezeBtn").addEventListener("click", ()=>{
  state.frozen=!state.frozen;
  $("freezeBtn").textContent=state.frozen?"▶":"◉";
  toast(state.frozen?"AR view frozen":"Live AR resumed");
});
$("switchCameraBtn").addEventListener("click", async ()=>{
  state.facingMode = state.facingMode==="environment"?"user":"environment";
  await startCamera();
});
$("effectBtn").addEventListener("click", ()=>{
  if(state.lastDetection){
    const e=effects[normalizeName(state.lastDetection.class)];
    toast(`${e?.title || "Holo Highlight"} active`);
  }
});
$("infoBtn").addEventListener("click", ()=>toast("Move closer, keep the object centered, and use good lighting."));
$("helpBtn").addEventListener("click",()=>$("helpModal").classList.remove("hidden"));
$("closeHelp").addEventListener("click",()=>$("helpModal").classList.add("hidden"));
$("errorClose").addEventListener("click",()=>$("errorModal").classList.add("hidden"));
$("helpModal").addEventListener("click",e=>{if(e.target===$("helpModal"))$("helpModal").classList.add("hidden")});
$("errorModal").addEventListener("click",e=>{if(e.target===$("errorModal"))$("errorModal").classList.add("hidden")});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden && state.running) state.frozen=true;
});

window.addEventListener("beforeunload",()=>stopCamera(false));
