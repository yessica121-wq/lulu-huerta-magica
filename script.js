(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const overlay=document.getElementById("overlay"),pausePanel=document.getElementById("pausePanel");
const message=document.getElementById("message"),missionLabel=document.getElementById("missionLabel"),seedLabel=document.getElementById("seedLabel");
const W=960,H=600;let screen="menu",mission=0,seeds=0,stars=0,badges=[],paused=false,musicOn=true,anim=0,items=[],picked=0,toastTimer=0,audio=null,transitionTimer=null,dragging=null,plots=[],waterDrops=[],sparkles=[];
const missions=["¡Conozcamos a Lulú!","¡Descubramos los secretos de la huerta!","¡Manos a la tierra!","¡Cuidemos la vida de la huerta!","¡Llegó la gran cosecha!"];
const melody=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46,523.25,587.33,659.25,783.99,698.46,659.25,587.33,523.25];
let masterGain=null,musicTimer=null,noteIndex=0,luluX=480,luluY=340,luluVisible=true,waterStream=0,waterCan={x:845,y:220};
function ensureAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return false;
 if(!audio){audio=new AC();masterGain=audio.createGain();masterGain.gain.value=.34;masterGain.connect(audio.destination);}
 if(audio.state==="suspended")audio.resume();
 return true;
}
function playNote(freq,duration=.32,volume=.08,wave="triangle"){
 if(!ensureAudio())return;
 const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
 osc.type=wave;osc.frequency.setValueAtTime(freq,now);filter.type="lowpass";filter.frequency.value=2600;
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(filter);filter.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+duration+.035);
}
function playPercussion(kind){if(!ensureAudio())return;const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type="sine";osc.frequency.setValueAtTime(kind==="kick"?105:kind==="bell"?1320:330,now);if(kind==="kick")osc.frequency.exponentialRampToValueAtTime(62,now+.16);gain.gain.setValueAtTime(kind==="bell"?.025:.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+(kind==="bell"?.22:.16));osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+.24);}
function startMusic(){
 if(!musicOn||!ensureAudio())return;
 if(musicTimer)clearInterval(musicTimer);
 masterGain.gain.setTargetAtTime(.34,audio.currentTime,.25);
 const chords=[[261.63,329.63,392],[196,246.94,293.66],[220,261.63,329.63],[174.61,220,261.63]];
 const beat=()=>{
  const i=noteIndex%16,bar=Math.floor(noteIndex/4)%4,chord=chords[bar];
  playNote(melody[i],.29,.075,"triangle");
  if(i%4===0){playNote(chord[0]/2,.55,.045,"sine");playNote(chord[1],.42,.025,"sine");}
  if(i%2===1)playNote(chord[(i+1)%3]*2,.16,.018,"sine");
  if(i%4===0)playPercussion("kick");
  if(i%8===7)playPercussion("bell");
  noteIndex++;
 };
 noteIndex=0;beat();musicTimer=setInterval(beat,285);
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
function drawLulu(x,y,s=1,mood="happy"){
 ctx.save();ctx.translate(x,y+Math.sin(anim/7)*2);ctx.scale(s,s);
 // Lulú: lombriz larga amarilla, rayada, ojos grandes y corona lila.
 const pts=[];for(let i=0;i<=46;i++){const t=i/46;pts.push({x:-112+t*225,y:22*Math.sin(t*Math.PI*2.05)+8*Math.sin(t*Math.PI*4.1)-8});}
 ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=39;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#30271f";ctx.stroke();
 ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=34;ctx.strokeStyle="#ffd52f";ctx.stroke();
 for(let i=3;i<45;i+=2){const p=pts[i],a=pts[i+1],b=pts[i-1],dx=a.x-b.x,dy=a.y-b.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;ctx.beginPath();ctx.moveTo(p.x-nx*15,p.y-ny*15);ctx.lineTo(p.x+nx*15,p.y+ny*15);ctx.strokeStyle="#30271f";ctx.lineWidth=1.8;ctx.stroke();}
 const hx=-112,hy=14+Math.sin(anim/18)*2;ellipse(hx,hy,29,25,"#ffd52f");
 ellipse(hx-7,hy-7,4.5,7,"#fff0a0");ellipse(hx+7,hy-7,4.5,7,"#fff0a0");ellipse(hx-7,hy-7,1.7,3.7,"#30271f","#30271f",1);ellipse(hx+7,hy-7,1.7,3.7,"#30271f","#30271f",1);
 ctx.beginPath();ctx.arc(hx-1,hy+(mood==="surprised"?7:3),mood==="surprised"?5:9,.15,Math.PI-.15);ctx.strokeStyle="#30271f";ctx.lineWidth=2.3;ctx.stroke();if(mood==="surprised")ellipse(hx,hy+7,4,6,"#30271f","none",0);if(Math.floor(anim/90)%8===0){ellipse(hx-7,hy-7,4.5,7,"#ffd52f","none",0);ellipse(hx+7,hy-7,4.5,7,"#ffd52f","none",0);}
 ctx.beginPath();ctx.moveTo(hx-18,hy-20);ctx.lineTo(hx-17,hy-39);ctx.lineTo(hx-7,hy-29);ctx.lineTo(hx+1,hy-43);ctx.lineTo(hx+9,hy-28);ctx.lineTo(hx+19,hy-37);ctx.lineTo(hx+18,hy-18);ctx.closePath();ctx.fillStyle="#b78bd8";ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle="#30271f";ctx.stroke();ctx.restore();
}
function drawButterfly(x,y,color,phase){ctx.save();ctx.translate(x+Math.sin(anim/24+phase)*12,y+Math.cos(anim/18+phase)*7);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(-8,0,8,12,Math.sin(anim/5)*.6,0,Math.PI*2);ctx.ellipse(8,0,8,12,-Math.sin(anim/5)*.6,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#59442f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(0,8);ctx.stroke();ctx.restore();}
function drawBee(x,y,phase){ctx.save();ctx.translate(x+Math.sin(anim/17+phase)*10,y+Math.cos(anim/13+phase)*8);ellipse(0,0,12,8,"#ffd84b","#5b4828",2);ctx.strokeStyle="#5b4828";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-7);ctx.lineTo(-4,7);ctx.moveTo(4,-7);ctx.lineTo(4,7);ctx.stroke();ellipse(-5,-11,6,4,"#fffdf2","none",0);ellipse(5,-11,6,4,"#fffdf2","none",0);ctx.restore();}
function drawLadybug(x,y,phase){const xx=x+Math.sin(anim/30+phase)*8,yy=y+Math.cos(anim/21+phase)*5;ellipse(xx,yy,10,8,"#e94f52","#49352c",2);ctx.strokeStyle="#49352c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx,yy-7);ctx.lineTo(xx,yy+7);ctx.stroke();ellipse(xx-4,yy-2,1.7,1.7,"#30271f","none",0);ellipse(xx+4,yy+2,1.7,1.7,"#30271f","none",0);}
function drawCloud(x,y,s=1){
 ctx.save();ctx.translate(x+Math.sin(anim/90+x)*9,y);ctx.scale(s,s);
 ctx.fillStyle="rgba(255,255,246,.88)";ctx.beginPath();ctx.ellipse(0,5,43,15,0,0,Math.PI*2);ctx.ellipse(-22,0,20,18,0,0,Math.PI*2);ctx.ellipse(2,-10,24,23,0,0,Math.PI*2);ctx.ellipse(26,1,20,16,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawFlower(x,y,color="#f6a4bd",scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle="#4d9656";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,10);ctx.quadraticCurveTo(-3,-8,0,-25);ctx.stroke();
 ctx.fillStyle="#65b96b";ctx.beginPath();ctx.ellipse(-9,-8,10,5,-.5,0,Math.PI*2);ctx.ellipse(9,-14,9,5,.5,0,Math.PI*2);ctx.fill();
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(Math.cos(a)*10,-29+Math.sin(a)*10,7,10,a,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
 ctx.beginPath();ctx.arc(0,-29,6,0,Math.PI*2);ctx.fillStyle="#f8d66d";ctx.fill();ctx.restore();
}
function drawFence(y=345){
 ctx.save();ctx.strokeStyle="#a97950";ctx.lineWidth=8;ctx.lineCap="round";
 for(let x=18;x<960;x+=82){ctx.beginPath();ctx.moveTo(x,y+35);ctx.lineTo(x,y-25);ctx.lineTo(x+12,y-38);ctx.lineTo(x+24,y-25);ctx.lineTo(x+24,y+35);ctx.stroke();}
 ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,y-2);ctx.lineTo(960,y-2);ctx.moveTo(0,y+22);ctx.lineTo(960,y+22);ctx.stroke();ctx.restore();
}
function drawLeafVine(x,y,flip=1){
 ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.strokeStyle="#4b9657";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(35,-20,25,-65,72,-76);ctx.stroke();
 for(let i=0;i<4;i++){const yy=-13-i*17,xx=13+i*13;ctx.fillStyle=i%2?"#79bd70":"#5ba963";ctx.beginPath();ctx.ellipse(xx,yy,15,7,-.55,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function background(){
 const stage=Math.max(0,Math.min(4,mission));
 const palettes=[
  ["#91d9f3","#d9f1d0","#8bc878","#b7d98c"],
  ["#a8ddf0","#e9efc7","#91c879","#b2d58b"],
  ["#b6e5f1","#e4edc8","#8cbd70","#a87550"],
  ["#9ddcf0","#d9f0c9","#68b875","#8cbd72"],
  ["#f5d7a0","#f7e6bd","#a5bd72","#c78c55"]
 ];
 const p=palettes[stage],sky=ctx.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,p[0]);sky.addColorStop(.67,p[1]);sky.addColorStop(1,p[3]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // Sol, nubes y pequeñas motas de luz: el mismo lenguaje de cuento en todas las páginas.
 const sunX=stage===4?790:835,sunY=stage===4?95:78;
 const glow=ctx.createRadialGradient(sunX,sunY,8,sunX,sunY,105);glow.addColorStop(0,"rgba(255,239,166,.52)");glow.addColorStop(1,"rgba(255,239,166,0)");
 ctx.fillStyle=glow;ctx.fillRect(sunX-110,sunY-110,220,220);ctx.beginPath();ctx.arc(sunX,sunY,stage===4?34:39,0,Math.PI*2);ctx.fillStyle=stage===4?"#ffd58a":"#ffe69a";ctx.fill();
 drawCloud(170,82,.8);drawCloud(500,120,.62);
 // Colinas en capas para dar profundidad al paisaje.
 ctx.fillStyle=stage===4?"#b5c77d":"#83c982";ctx.beginPath();ctx.moveTo(0,315);ctx.quadraticCurveTo(155,235,335,310);ctx.quadraticCurveTo(525,375,710,286);ctx.quadraticCurveTo(850,245,960,300);ctx.lineTo(960,600);ctx.lineTo(0,600);ctx.fill();
 ctx.fillStyle=stage===0?"#78bd78":stage===4?"#91b96c":"#70b879";ctx.beginPath();ctx.moveTo(0,365);ctx.quadraticCurveTo(220,300,430,375);ctx.quadraticCurveTo(675,435,960,340);ctx.lineTo(960,600);ctx.lineTo(0,600);ctx.fill();
 // Cada misión descubre una zona distinta del mismo mundo.
 if(stage===0){
  drawFence(354);drawLeafVine(45,370,1);drawLeafVine(920,375,-1);
  for(let i=0;i<8;i++)drawFlower(65+i*118,493+(i%2)*24,["#f3a3bd","#f5d36e","#bba0df"][i%3],.8+(i%3)*.08);
  // Arbustos secretos para jugar a encontrar a Lulú.
  for(const x of [105,320,640,850]){ctx.fillStyle="#438f58";ctx.beginPath();ctx.ellipse(x,430,76,36,0,0,Math.PI*2);ctx.ellipse(x-32,410,37,32,0,0,Math.PI*2);ctx.ellipse(x+34,411,40,31,0,0,Math.PI*2);ctx.fill();}
 }else if(stage===1){
  drawFence(325);drawLeafVine(38,365,1);drawLeafVine(925,365,-1);
  // Cajones de cultivo y tesoros asomándose entre las hojas.
  for(let i=0;i<4;i++){const x=105+i*220;ctx.fillStyle="#b77b4d";ctx.beginPath();ctx.roundRect(x,405,155,88,13);ctx.fill();ctx.strokeStyle="#805333";ctx.lineWidth=5;ctx.stroke();ctx.fillStyle="#8b5739";ctx.fillRect(x+7,412,141,13);for(let j=0;j<3;j++){ctx.fillStyle=["#6caf63","#e8a24d","#d96e65"][j];ctx.beginPath();ctx.ellipse(x+34+j*43,407,22,12,-.2,Math.PI,Math.PI*2);ctx.fill();}}
  for(let i=0;i<7;i++)drawFlower(45+i*145,535+(i%2)*10,["#e99dbb","#f4d16c","#bba0df"][i%3],.62);
 }else if(stage===2){
  // Zona de siembra: tierra mullida, surcos y pequeñas herramientas.
  ctx.fillStyle="#a97853";ctx.beginPath();ctx.ellipse(480,470,470,135,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(246,207,151,.5)";ctx.lineWidth=7;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(480,444+i*18,350-i*18,32,0,0,Math.PI*2);ctx.stroke();}
  drawFence(325);for(let i=0;i<6;i++)drawFlower(40+i*175,545+(i%2)*8,"#f1b0a5",.58);
 }else if(stage===3){
  drawFence(330);drawLeafVine(25,405,1);drawLeafVine(935,410,-1);
  // Jardín frondoso: hojas grandes y flores que enmarcan las plantas.
  for(let i=0;i<7;i++){const x=35+i*145;ctx.fillStyle=i%2?"#4d9e61":"#5caf68";ctx.beginPath();ctx.ellipse(x,470,38,70,-.35,0,Math.PI*2);ctx.ellipse(x+28,485,34,57,.45,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<8;i++)drawFlower(55+i*120,550,["#f3a4c0","#f6d477","#c4a7df"][i%3],.82);
 }else{
  // Fiesta de cosecha: luz dorada, guirnaldas y árboles cargados de frutos.
  ctx.strokeStyle="#9b744d";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,255);ctx.quadraticCurveTo(480,345,960,250);ctx.stroke();
  for(let i=0;i<11;i++){const x=35+i*89,y=270+Math.sin(i/10*Math.PI)*40;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fillStyle=["#f4a1ae","#f6d477","#bda1dc","#9bcf9a"][i%4];ctx.fill();}
  for(const x of [105,855]){ctx.fillStyle="#8a704b";ctx.fillRect(x-9,345,18,115);ctx.fillStyle="#75a968";ctx.beginPath();ctx.arc(x,330,65,0,Math.PI*2);ctx.arc(x-38,350,42,0,Math.PI*2);ctx.arc(x+38,350,42,0,Math.PI*2);ctx.fill();for(let j=0;j<5;j++){ctx.beginPath();ctx.arc(x-35+j*17,320+(j%2)*25,8,0,Math.PI*2);ctx.fillStyle="#e87962";ctx.fill();}}
  for(let i=0;i<7;i++)drawFlower(55+i*145,545,["#f0a0b6","#f6d477","#bda1dc"][i%3],.72);
 }
 // Pequeños detalles animados, discretos y siempre detrás de los objetos del juego.
 if(stage!==2){drawButterfly(185+Math.sin(anim/55)*35,205,"#efa5c5",0);drawButterfly(735+Math.cos(anim/60)*24,250,"#b79cde",2);}
 if(stage>=1)drawBee(360+Math.sin(anim/34)*22,190,1);
 if(stage>=3){drawLadybug(770,470,3);drawBee(550,300,5);}
 // Brillitos suaves del mundo mágico.
 for(let i=0;i<9;i++){const x=(i*137+anim*.22)%960,y=145+(i*61)%245+Math.sin(anim/24+i)*5;ctx.globalAlpha=.22+.16*Math.sin(anim/18+i);ctx.fillStyle="#fff8cf";ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}
 ctx.globalAlpha=1;
}
function toast(t){message.textContent=t;message.style.display="block";toastTimer=130;}
function labels(){missionLabel.textContent=missions[mission]||"¡Aventura completada!";seedLabel.textContent="Semillitas: "+seeds+" / 5   ⭐ "+stars+"/5";}
function init(){picked=0;items=[];dragging=null;waterDrops=[];sparkles=[];plots=[];if(mission===1)items=[["seed",150,245],["seed",340,300],["plant",520,230],["plant",790,290],["carrot",230,430],["strawberry",430,430],["tomato",640,420],["corn",810,445],["flower",120,390],["lettuce",350,180],["pumpkin",610,190],["rock",900,450]];if(mission===2){items=[["seed",230,255],["seed",480,255],["seed",730,255]];plots=[{x:280,y:455,done:false},{x:480,y:455,done:false},{x:680,y:455,done:false}];}if(mission===3){items=[["plant",230,355],["plant",480,355],["plant",730,355]];waterCan={x:845,y:220};}if(mission===4)items=[["strawberry",150,310],["carrot",310,300],["tomato",470,310],["corn",640,300],["pumpkin",810,315],["lettuce",250,450],["flower",500,455],["strawberry",740,455]];items=items.map(a=>({type:a[0],x:a[1],y:a[2],done:false,growth:0}));}
function drawWaterCan(){const x=waterCan.x,y=waterCan.y;ctx.save();ctx.translate(x,y);ctx.fillStyle="#e7a83f";ctx.strokeStyle="#684321";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-24,-13,43,34,8);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(17,-7);ctx.lineTo(39,-18);ctx.lineTo(44,-11);ctx.lineTo(21,3);ctx.stroke();ctx.beginPath();ctx.arc(-27,0,19,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.fillStyle="#74d5f4";ctx.beginPath();ctx.ellipse(0,-15,21,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawBasket(){const x=480,y=520;ctx.save();if(dragging&&dragging.kind==="crop"){ctx.beginPath();ctx.ellipse(x,y-5,112,82,0,0,Math.PI*2);ctx.fillStyle="rgba(255,224,112,.30)";ctx.fill();ctx.strokeStyle="#f4c65e";ctx.lineWidth=7;ctx.setLineDash([10,8]);ctx.stroke();ctx.setLineDash([]);text("¡SUELTA AQUÍ!",x,y-91,17,"#315d43");}ctx.fillStyle="#b87543";ctx.strokeStyle="#70452c";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-75,y-28);ctx.lineTo(x+75,y-28);ctx.lineTo(x+58,y+34);ctx.lineTo(x-58,y+34);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(x,y-26,58,Math.PI,0);ctx.stroke();for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(x+k*19,y-22);ctx.lineTo(x+k*15,y+29);ctx.stroke();}text("¡CANASTA!",x,y+59,15,"#70452c");ctx.restore();}
function drawItem(it){if(it.done&&mission!==3)return;const {x,y,type}=it;if(type==="seed"){ellipse(x,y,24,15,"#b87b42");ellipse(x,y-3,9,5,"#f2c36b","none",0);}else if(type==="plant"){const grow=it.growth||0;ctx.strokeStyle="#287b3b";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(x,y+34);ctx.lineTo(x,y-42-grow*18);ctx.stroke();ellipse(x-30-grow*5,y-25-grow*13,29+grow*5,16+grow*3,"#55b85b");ellipse(x+30+grow*5,y-43-grow*13,29+grow*5,16+grow*3,"#65c95e");ellipse(x-12,y-58-grow*15,23,13,"#78d96a");if(it.done){for(let k=0;k<6;k++){const a=k*Math.PI/3;ellipse(x+Math.cos(a)*20,y-75-grow*15+Math.sin(a)*14,12,10,"#ff91bd","none",0);}ellipse(x,y-75-grow*15,8,8,"#ffd84d","none",0);text("✓",x+48,y-42,24,"#277b3b");}}else if(type==="carrot"){ctx.beginPath();ctx.moveTo(x-20,y-15);ctx.lineTo(x+20,y-15);ctx.lineTo(x,y+38);ctx.closePath();ctx.fillStyle="#ff982f";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle="#328c47";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x-8,y-37);ctx.moveTo(x,y-15);ctx.lineTo(x+10,y-38);ctx.stroke();}else if(type==="rock")ellipse(x,y,27,20,"#858d8a");else if(type==="shoe")rounded(x-28,y-10,54,27,10,"#b66d55");else if(type==="flower"){for(let k=0;k<6;k++){const a=k*Math.PI/3;ellipse(x+Math.cos(a)*13,y+Math.sin(a)*13,9,9,"#ff91bd","none",0);}ellipse(x,y,7,7,"#ffd84d","none",0);}else if(type==="lettuce"){ellipse(x,y,28,20,"#55b85b");ellipse(x-13,y-5,15,14,"#7bd66e");ellipse(x+13,y-5,15,14,"#7bd66e");}else if(type==="pumpkin"){ellipse(x,y,28,24,"#f58c32");ellipse(x-12,y,13,22,"#ffad48","none",0);ellipse(x+12,y,13,22,"#ffad48","none",0);}else if(type==="strawberry"){ellipse(x,y,22,25,"#ef5362");text("✿",x,y-20,18,"#3a974c");}else if(type==="tomato"){ellipse(x,y,25,23,"#ed5b4c");text("✦",x,y-13,16,"#3a974c");}else if(type==="corn"){rounded(x-17,y-28,34,57,13,"#ffd64b");}}
function next(){seeds=Math.min(5,seeds+1);stars=Math.min(5,stars+1);const earned=["Explorador de la huerta","Detective de semillas","Maestro sembrador","Amigo del agua","Gran cosechador"][mission];badges.push(earned);labels();soundEffect("success");for(let i=0;i<26;i++)sparkles.push({x:480+(Math.random()-.5)*360,y:280+(Math.random()-.5)*180,life:55});toast("¡Insignia desbloqueada: "+earned+"! ⭐");transitionTimer=setTimeout(()=>{transitionTimer=null;if(mission<4){mission++;init();labels();toast(missions[mission]);}else{mission=5;screen="win";overlay.classList.remove("hidden");overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑🌻</div><p class="eyebrow">MISIÓN CUMPLIDA</p><h1>¡LO LOGRASTE!</h1><p class="intro">¡Eres Guardián de la Huerta Mágica!</p><div style="font-size:26px;color:#d99c24">⭐ ⭐ ⭐ ⭐ ⭐</div><p class="intro">Insignias ganadas: '+badges.join(" · ")+'</p><p class="tiny">Lulú y sus amigos te agradecen por cuidar la huerta.</p><button id="againBtn" class="primary">↻ VOLVER A JUGAR</button>';document.getElementById("againBtn").onclick=start;}},850);}
function start(){if(transitionTimer){clearTimeout(transitionTimer);transitionTimer=null;}screen="play";mission=0;seeds=0;stars=0;badges=[];paused=false;init();overlay.classList.add("hidden");pausePanel.classList.add("hidden");labels();if(musicOn)startMusic();toast("¡Hola! Encuentra a Lulú.");}
function draw(){anim++;background();if(screen==="menu"){drawLulu(480,335,2);text("¡La huerta te necesita!",480,475,29,"#3d8744");return;}if(screen==="play"){rounded(22,18,916,65,18,"rgba(255,253,239,.94)");text(missions[mission],480,49,25,"#438d43");for(let i=0;i<5;i++)ellipse(405+i*38,68,10,10,i<seeds?"#ffd83e":"#fffdf2");if(mission===0){luluVisible=Math.floor(anim/95)%3!==1;luluX=480+Math.sin(anim/42)*245;luluY=355+Math.sin(anim/27)*34;if(luluVisible)drawLulu(luluX,luluY,1.35,"surprised");for(let b=0;b<4;b++){const bx=120+b*235;ellipse(bx,430,78,34,"#398d4b","none",0);ellipse(bx-35,414,38,29,"#55ad55","none",0);ellipse(bx+35,414,38,29,"#55ad55","none",0);}rounded(190,475,580,91,20,"rgba(255,253,242,.96)");text("¡Lulú se está escondiendo! ¡Encuéntrala!",480,512,23,"#315d43");text("Pista: mira detrás de los arbustos",480,545,17,"#64816a");}else{const captions=["","","¡Lleva las semillitas a la tierra!","¡Dales agua a las plantitas!","¡Toca los alimentos para cosecharlos!"];rounded(105,96,750,58,16,"#fffdf0");text(mission===1?"Toca semillas, plantas y alimentos":mission===3?"¡Arrastra la regadera hasta cada plantita!":mission===4?"¡Arrastra los frutos hasta la canasta!":captions[mission],480,133,22,"#315f35");if(mission===2){plots.forEach(p=>{ellipse(p.x,p.y,58,23,p.done?"#70452c":"#8d542f");if(p.done){ctx.strokeStyle="#3a8b42";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(p.x,p.y-4);ctx.lineTo(p.x,p.y-38);ctx.stroke();ellipse(p.x-13,p.y-31,14,8,"#55b85b");ellipse(p.x+13,p.y-39,14,8,"#55b85b");text("✨",p.x,p.y-55,18);}});items.forEach(drawItem);if(dragging){ellipse(dragging.x,dragging.y,15,11,"#e8bd78");text("🌱",dragging.x,dragging.y-17,23);}}else{if(mission===4)drawBasket();items.forEach(drawItem);if(dragging&&dragging.kind==="crop"){ctx.save();ctx.globalAlpha=.22;ellipse(dragging.x,dragging.y+34,36,12,"#315d43","none",0);ctx.restore();}}drawLulu(100,530,.8);if(mission===3){items.forEach(p=>{rounded(p.x-65,p.y+24,130,82,22,"#b87543");rounded(p.x-59,p.y+30,118,68,18,"#75452e");for(let q=0;q<5;q++)ellipse(p.x-42+q*21,p.y+54,3,3,"#d9a36b","none",0);});items.forEach(drawItem);waterDrops.forEach(d=>{ctx.strokeStyle="#45b9ed";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-4,d.y+17);ctx.stroke();ellipse(d.x,d.y+20,5,7,"#7bd9ff","none",0);});if(waterStream>0){ctx.strokeStyle="#55c9ff";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(845,238);ctx.quadraticCurveTo(790,300,waterStream,375);ctx.stroke();waterStream=0;}drawWaterCan();}}}if(screen==="win"){drawLulu(480,335,2,"happy");text("¡LO LOGRASTE!",480,170,48,"#438d43");text("¡Eres guardián de la huerta mágica!",480,220,25);text("DIPLOMA DE GUARDIÁN DE LA HUERTA",480,275,22,"#8a55b5");text("⭐ ⭐ ⭐ ⭐ ⭐",480,325,32,"#d99c24");text("¡Lulú y sus amigos te dan las gracias!",480,370,21,"#315f35");}sparkles.forEach(p=>{text("✨",p.x,p.y,18);});if(toastTimer>0&&--toastTimer===0)message.style.display="none";}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
canvas.addEventListener("pointerdown",e=>{if(screen!=="play"||paused)return;e.preventDefault();const {x,y}=canvasPoint(e);
 if(mission===0){if(luluVisible&&Math.hypot(x-luluX,y-luluY)<155){luluVisible=false;soundEffect("success");for(let i=0;i<16;i++)sparkles.push({x:luluX+(Math.random()-.5)*110,y:luluY+(Math.random()-.5)*90,life:35});toast("¡ME ENCONTRASTE! ¡Qué ojos tan atentos! 🐛👑");next();}else toast("¡Sigue buscando detrás de los arbustos! 👀");return;}
 if(mission===2){const seed=items.find(a=>a.type==="seed"&&!a.done&&Math.hypot(x-a.x,y-a.y)<55);if(seed){dragging={item:seed,x,y};canvas.setPointerCapture(e.pointerId);toast("¡Arrastra la semillita hasta un montículo de tierra!");return;}}
 if(mission===3){if(Math.hypot(x-waterCan.x,y-waterCan.y)<75){dragging={kind:"can",x,y};canvas.setPointerCapture(e.pointerId);toast("¡Lleva la regadera hasta una planta y suelta! 💦");return;}toast("¡Primero toma la regadera amarilla!");return;}
 if(mission===4){const crop=items.find(a=>!a.done&&a.type!=="flower"&&Math.hypot(x-a.x,y-a.y)<65);if(crop){dragging={kind:"crop",item:crop,x,y:y-34,fromX:crop.x,fromY:crop.y,offsetY:-34};canvas.setPointerCapture(e.pointerId);toast("¡Recoge el alimento y llévalo hasta la canasta! 🧺");return;}toast("¡Toca y arrastra un alimento hasta la canasta!");return;}
 const it=items.find(a=>!a.done&&Math.hypot(x-a.x,y-a.y)<62);if(!it){toast("¡Prueba tocando uno de los dibujos!");return;}if(mission===1&&!["seed","plant","carrot","strawberry","tomato","corn","flower","lettuce","pumpkin"].includes(it.type)){toast("¡Busca semillas, plantas o alimentos!");return;}it.done=true;picked++;soundEffect(mission===4?"harvest":"pop");toast(mission===4?"¡Cosecha deliciosa! 🍓":"¡Muy bien!");if(picked===(mission===1?7:mission===4?8:3))next();
});
canvas.addEventListener("pointermove",e=>{if(dragging){const p=canvasPoint(e);dragging.x=p.x;dragging.y=p.y;if(dragging.kind==="can"){waterCan.x=p.x;waterCan.y=p.y;}if(dragging.kind==="crop"){dragging.item.x=p.x;dragging.item.y=p.y+(dragging.offsetY||-34);}}});
canvas.addEventListener("pointerup",e=>{if(!dragging)return;const p=canvasPoint(e);if(dragging.kind==="can"){waterCan.x=p.x;waterCan.y=p.y;const plant=items.find(a=>a.type==="plant"&&!a.done&&Math.hypot(p.x-a.x,p.y-(a.y-25))<105);if(plant){plant.done=true;plant.growth=2;soundEffect("water");for(let i=0;i<24;i++)waterDrops.push({x:plant.x+(Math.random()-.5)*75,y:plant.y-105-Math.random()*75});for(let i=0;i<12;i++)sparkles.push({x:plant.x+(Math.random()-.5)*65,y:plant.y-60-Math.random()*40,life:35});picked++;toast("¡CHORRO DE AGUA! ¡Tu planta está creciendo! 💦🌼");if(picked===3)next();}else{toast("¡Acerca la regadera a una plantita y vuelve a intentarlo!");}waterCan={x:845,y:220};dragging=null;return;}if(dragging.kind==="crop"){const crop=dragging.item;if(Math.hypot((p.x-480)/1.18,(p.y-510)/1.12)<155){crop.done=true;picked++;soundEffect("harvest");for(let i=0;i<12;i++)sparkles.push({x:480+(Math.random()-.5)*100,y:500+(Math.random()-.5)*45,life:32});toast("¡A la canasta! ¡Qué buena cosecha! 🍓🧺");if(picked===7)next();}else{crop.x=dragging.fromX;crop.y=dragging.fromY;toast("¡Acércalo a la canasta iluminada y suelta!");}dragging=null;return;}const plot=plots.find(a=>!a.done&&Math.hypot(p.x-a.x,p.y-a.y)<75);if(plot){plot.done=true;dragging.item.done=true;picked++;soundEffect("success");toast("¡Semilla sembrada! ¡Muy buen trabajo! 🌱");if(picked===3)next();}else{toast("¡Llévala hasta uno de los montículos de tierra!");}dragging=null;});

canvas.addEventListener("pointercancel",()=>{if(!dragging)return;if(dragging.kind==="crop"){dragging.item.x=dragging.fromX;dragging.item.y=dragging.fromY;}if(dragging.kind==="can")waterCan={x:845,y:220};dragging=null;});
document.getElementById("playBtn").onclick=start;document.getElementById("meetBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><p class="eyebrow">TU NUEVA AMIGA EN LA HUERTA</p><h1>¡Hola, soy Lulú!</h1><p class="intro">Soy una lombriz curiosa y alegre. Mi coronita lila me recuerda que cada pequeño ser tiene algo especial. Me encanta cuidar la tierra, descubrir semillas y ver crecer las plantas. ¿Jugamos?</p><button id="backMenu" class="primary">VOLVER AL INICIO</button>';document.getElementById("backMenu").onclick=menu;};document.getElementById("howBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">👆🌱</div><h1>¿Cómo jugar?</h1><p class="intro">Lee la pista y toca los dibujos que indique Lulú. ¡Puedes volver a intentar!</p><button id="backMenu" class="primary">¡ENTENDIDO!</button>';document.getElementById("backMenu").onclick=menu;};
function menu(){screen="menu";overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><p class="eyebrow">UNA AVENTURA PARA CUIDAR, SEMBRAR Y DESCUBRIR</p><h1>Lulú y la<br>huerta mágica</h1><p class="intro">¡Hola, amiguito! Soy Lulú. ¿Me ayudas a recuperar la magia de nuestra huerta?</p><div class="menu-buttons"><button id="playBtn" class="primary">🌼 JUGAR AVENTURA</button><button id="meetBtn" class="secondary">💜 CONOCE A LULÚ</button><button id="howBtn" class="secondary">❔ CÓMO JUGAR</button></div><p class="tiny">Puedes jugar con el mouse o tocando la pantalla.</p>';overlay.classList.remove("hidden");document.getElementById("playBtn").onclick=start;document.getElementById("meetBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><h1>¡Hola, soy Lulú!</h1><p class="intro">Soy una lombriz amarilla con rayitas negras y una coronita lila. ¡Me encanta cuidar la huerta!</p><button id="backMenu" class="primary">VOLVER</button>';document.getElementById("backMenu").onclick=menu;};document.getElementById("howBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">👆🌱</div><h1>¿Cómo jugar?</h1><p class="intro">Lee la pista y toca los dibujos que indique Lulú. ¡Puedes volver a intentar!</p><button id="backMenu" class="primary">¡ENTENDIDO!</button>';document.getElementById("backMenu").onclick=menu;};}
document.getElementById("pauseBtn").onclick=()=>{if(screen==="play"){paused=true;pausePanel.classList.remove("hidden");}};document.getElementById("resumeBtn").onclick=()=>{paused=false;pausePanel.classList.add("hidden");};document.getElementById("restartBtn").onclick=start;document.getElementById("musicBtn").onclick=()=>{musicOn=!musicOn;document.getElementById("musicBtn").textContent="♫ Música: "+(musicOn?"sí":"no");if(musicOn){startMusic();soundEffect("success");}else stopMusic();};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screen==="play"){paused=true;pausePanel.classList.remove("hidden");}});
function loop(){if(!paused){draw();waterDrops.forEach(d=>d.y+=3);waterDrops=waterDrops.filter(d=>d.y<560);sparkles.forEach(p=>p.life--);sparkles=sparkles.filter(p=>p.life>0);}requestAnimationFrame(loop);}loop();
})();