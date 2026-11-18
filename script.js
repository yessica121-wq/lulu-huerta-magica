(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const overlay=document.getElementById("overlay"),pausePanel=document.getElementById("pausePanel");
const message=document.getElementById("message"),missionLabel=document.getElementById("missionLabel"),seedLabel=document.getElementById("seedLabel");
const W=960,H=600;let screen="menu",mission=0,seeds=0,paused=false,musicOn=true,anim=0,items=[],picked=0,toastTimer=0,audio=null;
const missions=["¡Conozcamos a Lulú!","¡Descubramos los secretos de la huerta!","¡Manos a la tierra!","¡Cuidemos la vida de la huerta!","¡Llegó la gran cosecha!"];
const melody=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46,523.25,587.33,659.25,783.99,698.46,659.25,587.33,523.25];
let masterGain=null,musicTimer=null,noteIndex=0;
function ensureAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return false;
 if(!audio){audio=new AC();masterGain=audio.createGain();masterGain.gain.value=.72;masterGain.connect(audio.destination);}
 if(audio.state==="suspended")audio.resume();
 return true;
}
function playNote(freq,duration=.28,volume=.12,wave="sine"){
 if(!ensureAudio())return;
 const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
 osc.type=wave;osc.frequency.setValueAtTime(freq,now);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+duration+.03);
}
function startMusic(){
 if(!musicOn||!ensureAudio())return;
 if(musicTimer)clearInterval(musicTimer);
 masterGain.gain.setTargetAtTime(.72,audio.currentTime,.08);
 const tick=()=>{playNote(melody[noteIndex%melody.length],.30,.105,"triangle");if(noteIndex%4===0)playNote(melody[(noteIndex+4)%melody.length]/2,.42,.045,"sine");noteIndex++;};
 tick();musicTimer=setInterval(tick,360);
}
function stopMusic(){
 if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
 // Los efectos breves siguen disponibles aunque la música esté apagada.
}
function soundEffect(kind="pop"){
 const tones={pop:[660,.12],success:[880,.22],water:[740,.18],harvest:[1046.5,.25]};
 const [freq,duration]=tones[kind]||tones.pop;playNote(freq,duration,.20,"sine");
 if(kind==="success"||kind==="harvest")setTimeout(()=>playNote(freq*1.25,.22,.13,"triangle"),110);
}

function ellipse(x,y,rx,ry,fill,stroke="#30271f",lw=3){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke();}
function rounded(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle="#30271f";ctx.stroke();}
function text(t,x,y,size=24,color="#30271f"){ctx.fillStyle=color;ctx.font="900 "+size+"px Trebuchet MS,sans-serif";ctx.textAlign="center";ctx.fillText(t,x,y);}
function drawLulu(x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 // Lulú: lombriz larga amarilla, rayada, ojos grandes y corona lila.
 const pts=[];for(let i=0;i<=46;i++){const t=i/46;pts.push({x:-112+t*225,y:22*Math.sin(t*Math.PI*2.05)+8*Math.sin(t*Math.PI*4.1)-8});}
 ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=39;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#30271f";ctx.stroke();
 ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=34;ctx.strokeStyle="#ffd52f";ctx.stroke();
 for(let i=3;i<45;i+=2){const p=pts[i],a=pts[i+1],b=pts[i-1],dx=a.x-b.x,dy=a.y-b.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;ctx.beginPath();ctx.moveTo(p.x-nx*15,p.y-ny*15);ctx.lineTo(p.x+nx*15,p.y+ny*15);ctx.strokeStyle="#30271f";ctx.lineWidth=1.8;ctx.stroke();}
 const hx=-112,hy=14+Math.sin(anim/18)*2;ellipse(hx,hy,29,25,"#ffd52f");
 ellipse(hx-7,hy-7,4.5,7,"#fff0a0");ellipse(hx+7,hy-7,4.5,7,"#fff0a0");ellipse(hx-7,hy-7,1.7,3.7,"#30271f","#30271f",1);ellipse(hx+7,hy-7,1.7,3.7,"#30271f","#30271f",1);
 ctx.beginPath();ctx.arc(hx-1,hy+3,9,.15,Math.PI-.15);ctx.strokeStyle="#30271f";ctx.lineWidth=2.3;ctx.stroke();
 ctx.beginPath();ctx.moveTo(hx-18,hy-20);ctx.lineTo(hx-17,hy-39);ctx.lineTo(hx-7,hy-29);ctx.lineTo(hx+1,hy-43);ctx.lineTo(hx+9,hy-28);ctx.lineTo(hx+19,hy-37);ctx.lineTo(hx+18,hy-18);ctx.closePath();ctx.fillStyle="#b78bd8";ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle="#30271f";ctx.stroke();ctx.restore();
}
function background(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#91dcfa");g.addColorStop(.62,"#d9f5bd");g.addColorStop(1,"#b9df83");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ellipse(835,78,42,42,"#ffe16a");for(const [x,y] of [[130,80],[420,60],[680,130]]){ellipse(x,y,42,17,"#fffdf2","none",0);ellipse(x-25,y+3,25,16,"#fffdf2","none",0);ellipse(x+24,y+2,27,16,"#fffdf2","none",0);}ctx.fillStyle="#79c76a";ctx.beginPath();ctx.moveTo(0,345);ctx.quadraticCurveTo(230,285,450,350);ctx.quadraticCurveTo(690,405,960,320);ctx.lineTo(960,600);ctx.lineTo(0,600);ctx.fill();for(let i=0;i<10;i++){const x=35+i*100,y=520+(i%3)*18;for(let a=0;a<5;a++){const q=a*Math.PI*2/5;ellipse(x+Math.cos(q)*10,y+Math.sin(q)*10,7,7,i%2?"#ff8eaa":"#fff17b","none",0);}ellipse(x,y,5,5,"#f5a62b","none",0);}}
function toast(t){message.textContent=t;message.style.display="block";toastTimer=130;}
function labels(){missionLabel.textContent=missions[mission]||"¡Aventura completada!";seedLabel.textContent="Semillitas: "+seeds+" / 5";}
function init(){picked=0;items=[];if(mission===1)items=[["seed",230,260],["plant",470,220],["carrot",720,280],["rock",330,440],["shoe",620,450]];if(mission===2)items=[["seed",280,300],["seed",480,300],["seed",680,300]];if(mission===3)items=[["plant",300,280],["plant",480,280],["plant",660,280]];if(mission===4)items=[["strawberry",250,310],["carrot",480,300],["tomato",700,310],["corn",370,440]];items=items.map(a=>({type:a[0],x:a[1],y:a[2],done:false}));}
function drawItem(it){if(it.done)return;const {x,y,type}=it;if(type==="seed"){ellipse(x,y,24,15,"#b87b42");ellipse(x,y-3,9,5,"#f2c36b","none",0);}else if(type==="plant"){ctx.strokeStyle="#3a8b42";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,y+24);ctx.lineTo(x,y-23);ctx.stroke();ellipse(x-17,y-15,18,10,"#54b85b");ellipse(x+17,y-28,18,10,"#54b85b");}else if(type==="carrot"){ctx.beginPath();ctx.moveTo(x-20,y-15);ctx.lineTo(x+20,y-15);ctx.lineTo(x,y+38);ctx.closePath();ctx.fillStyle="#ff982f";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle="#328c47";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x-8,y-37);ctx.moveTo(x,y-15);ctx.lineTo(x+10,y-38);ctx.stroke();}else if(type==="rock")ellipse(x,y,27,20,"#858d8a");else if(type==="shoe")rounded(x-28,y-10,54,27,10,"#b66d55");else if(type==="strawberry"){ellipse(x,y,22,25,"#ef5362");text("✿",x,y-20,18,"#3a974c");}else if(type==="tomato"){ellipse(x,y,25,23,"#ed5b4c");text("✦",x,y-13,16,"#3a974c");}else if(type==="corn"){rounded(x-17,y-28,34,57,13,"#ffd64b");}}
function next(){seeds=Math.min(5,seeds+1);labels();soundEffect("success");toast("¡Muy bien! ¡Ganaste una semillita mágica! 🌟");setTimeout(()=>{if(mission<4){mission++;init();labels();toast(missions[mission]);}else{mission=5;screen="win";overlay.classList.remove("hidden");overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑🌻</div><p class="eyebrow">MISIÓN CUMPLIDA</p><h1>¡LO LOGRASTE!</h1><p class="intro">¡Gracias por ayudar a Lulú a recuperar la magia de la huerta!</p><button id="againBtn" class="primary">↻ VOLVER A JUGAR</button>';document.getElementById("againBtn").onclick=start;}},850);}
function start(){screen="play";mission=0;seeds=0;paused=false;init();overlay.classList.add("hidden");pausePanel.classList.add("hidden");labels();if(musicOn)startMusic();toast("¡Hola! Encuentra a Lulú.");}
function draw(){anim++;background();if(screen==="menu"){drawLulu(480,335,2);text("¡La huerta te necesita!",480,475,29,"#3d8744");return;}if(screen==="play"){rounded(22,18,916,65,18,"rgba(255,253,239,.94)");text(missions[mission],480,49,25,"#438d43");for(let i=0;i<5;i++)ellipse(405+i*38,68,10,10,i<seeds?"#ffd83e":"#fffdf2");if(mission===0){drawLulu(480,340,1.8);text("¡Tócame para encontrarme!",480,510,27);}else{const captions=["","","¡Lleva las semillitas a la tierra!","¡Dales agua a las plantitas!","¡Toca los alimentos para cosecharlos!"];text(mission===1?"Toca semillas, plantas y alimentos":captions[mission],480,135,22);items.forEach(drawItem);drawLulu(100,530,.8);if(mission===2)for(let i=0;i<3;i++){ellipse(280+i*200,455,55,22,"#8d542f");}}}if(screen==="win"){drawLulu(480,335,2);text("¡LO LOGRASTE!",480,170,48,"#438d43");text("¡Eres guardián de la huerta mágica!",480,220,25);}if(toastTimer>0&&--toastTimer===0)message.style.display="none";}
canvas.addEventListener("pointerdown",e=>{if(screen!=="play"||paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(mission===0){if(Math.hypot(x-480,y-340)<180)next();else toast("¡Busca a Lulú!");return;}const it=items.find(a=>!a.done&&Math.hypot(x-a.x,y-a.y)<62);if(!it){toast("¡Prueba tocando uno de los dibujos!");return;}if(mission===1&&!["seed","plant","carrot"].includes(it.type)){toast("¡Busca semillas, plantas o alimentos!");return;}it.done=true;picked++;soundEffect(mission===3?"water":mission===4?"harvest":"pop");toast(mission===2?"¡Semillita sembrada!":mission===3?"¡Agüita para crecer! 💦":"¡Muy bien!");if(picked===(mission===1?3:mission===4?4:3))next();});
document.getElementById("playBtn").onclick=start;document.getElementById("meetBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><h1>¡Hola, soy Lulú!</h1><p class="intro">Soy una lombriz amarilla con rayitas negras y una coronita lila. ¡Me encanta cuidar la huerta!</p><button id="backMenu" class="primary">VOLVER</button>';document.getElementById("backMenu").onclick=menu;};document.getElementById("howBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">👆🌱</div><h1>¿Cómo jugar?</h1><p class="intro">Lee la pista y toca los dibujos que indique Lulú. ¡Puedes volver a intentar!</p><button id="backMenu" class="primary">¡ENTENDIDO!</button>';document.getElementById("backMenu").onclick=menu;};
function menu(){screen="menu";overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><p class="eyebrow">UNA AVENTURA PARA CUIDAR, SEMBRAR Y DESCUBRIR</p><h1>Lulú y la<br>huerta mágica</h1><p class="intro">¡Hola, amiguito! Soy Lulú. ¿Me ayudas a recuperar la magia de nuestra huerta?</p><div class="menu-buttons"><button id="playBtn" class="primary">🌼 JUGAR AVENTURA</button><button id="meetBtn" class="secondary">💜 CONOCE A LULÚ</button><button id="howBtn" class="secondary">❔ CÓMO JUGAR</button></div><p class="tiny">Puedes jugar con el mouse o tocando la pantalla.</p>';overlay.classList.remove("hidden");document.getElementById("playBtn").onclick=start;document.getElementById("meetBtn").onclick=()=>{screen="meet";menu();};document.getElementById("howBtn").onclick=()=>{screen="how";menu();};}
document.getElementById("pauseBtn").onclick=()=>{if(screen==="play"){paused=true;pausePanel.classList.remove("hidden");}};document.getElementById("resumeBtn").onclick=()=>{paused=false;pausePanel.classList.add("hidden");};document.getElementById("restartBtn").onclick=start;document.getElementById("musicBtn").onclick=()=>{musicOn=!musicOn;document.getElementById("musicBtn").textContent="♫ Música: "+(musicOn?"sí":"no");if(musicOn){startMusic();soundEffect("success");}else stopMusic();};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screen==="play"){paused=true;pausePanel.classList.remove("hidden");}});
function loop(){if(!paused)draw();requestAnimationFrame(loop);}loop();
})();