(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const overlay=document.getElementById("overlay"),pausePanel=document.getElementById("pausePanel");
const message=document.getElementById("message"),missionLabel=document.getElementById("missionLabel"),seedLabel=document.getElementById("seedLabel");
const W=960,H=600;let screen="menu",mission=0,seeds=0,stars=0,badges=[],paused=false,musicOn=true,anim=0,items=[],picked=0,toastTimer=0,audio=null,transitionTimer=null,dragging=null,plots=[],waterDrops=[],sparkles=[];
const missions=["¡Busca a Lulú!","¡Explora los tesoros de la huerta!","¡Siembra tus semillas!","¡Riega y haz crecer las plantas!","¡Cosecha los alimentos!"];
// Melodía original alegre en Sol mayor: frase juguetona, saltarina y fácil de recordar.
const melody=[783.99,987.77,1174.66,987.77,880,1046.5,1318.51,1174.66,783.99,880,987.77,1174.66,1318.51,1174.66,987.77,880];
let masterGain=null,musicTimer=null,noteIndex=0,luluX=480,luluY=340,luluVisible=true,waterStream=0,waterCan={x:845,y:220};
// Progreso persistente de los tres surcos: 0=tierra, 1=semilla sembrada, 2=planta regada y crecida.
let gardenStages=[0,0,0];
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
function playPercussion(kind){
 if(!ensureAudio())return;
 const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
 if(kind==="kick"){osc.type="sine";osc.frequency.setValueAtTime(125,now);osc.frequency.exponentialRampToValueAtTime(48,now+.13);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.15);osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+.17);}
 else if(kind==="bell"){osc.type="sine";osc.frequency.setValueAtTime(1568,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+.21);}
 else {osc.type="triangle";osc.frequency.setValueAtTime(420,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.025,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.07);osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+.08);}
}
function startMusic(){
 if(!musicOn||!ensureAudio())return;
 if(musicTimer)clearInterval(musicTimer);
 masterGain.gain.setTargetAtTime(.48,audio.currentTime,.18);
 const chords=[[392,493.88,587.33],[293.66,369.99,440],[329.63,392,493.88],[261.63,329.63,392]];
 const bass=[196,146.83,164.81,130.81],beatMs=210;
 const beat=()=>{
  const i=noteIndex%16,bar=Math.floor(i/4)%4,chord=chords[bar],step=i%4;
  // Melodía principal con ataque brillante y notas cortas.
  playNote(melody[i],.19,.095,"triangle");
  // Bajo saltarín y acordes ligeros para dar sensación de canción de aventura.
  if(step===0||step===2)playNote(bass[bar],.22,.055,"sine");
  if(step===0)chord.forEach((n,k)=>playNote(n,.25,k===0?.026:.018,"triangle"));
  if(step===1||step===3)playPercussion("hat");
  if(step===0||step===2)playPercussion("kick");
  if(i===7||i===15)playPercussion("bell");
  noteIndex++;
 };
 noteIndex=0;beat();musicTimer=setInterval(beat,beatMs);
}
function stopMusic(){
 if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
 // Silencia también cualquier nota que siga sonando al pausar.
 if(audio&&masterGain)masterGain.gain.setTargetAtTime(0,audio.currentTime,.04);
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
function handLine(points,color="#30271f",width=5){
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
}
function storyFlower(x,y,color="#ef5362",s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 handLine([[0,9],[-2,-12],[3,-25]],"#30271f",5);handLine([[0,8],[-2,-12],[3,-25]],"#318c4d",3);
 ctx.beginPath();ctx.ellipse(-8,-9,9,5,-.6,0,Math.PI*2);ctx.fillStyle="#55ad62";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=2;ctx.stroke();
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(Math.cos(a)*10,-29+Math.sin(a)*9,7,10,a,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=2.4;ctx.stroke();}
 ellipse(0,-29,5,5,"#ffd943","#30271f",2);ctx.restore();
}
function storyCloud(x,y,s=1){
 ctx.save();ctx.translate(x+Math.sin(anim/70+x)*8,y);ctx.scale(s,s);
 ctx.beginPath();ctx.moveTo(-40,8);ctx.quadraticCurveTo(-50,-10,-29,-17);ctx.quadraticCurveTo(-20,-42,4,-27);ctx.quadraticCurveTo(24,-43,35,-17);ctx.quadraticCurveTo(55,-13,43,8);ctx.closePath();ctx.fillStyle="#fffdf4";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=3;ctx.stroke();ctx.restore();
}
function storyBush(x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ctx.fillStyle="#55a94f";ctx.strokeStyle="#30271f";ctx.lineWidth=4;
 for(const a of [[-34,0,31,25],[0,-12,38,34],[34,2,31,25]]){ctx.beginPath();ctx.ellipse(a[0],a[1],a[2],a[3],0,0,Math.PI*2);ctx.fill();ctx.stroke();}
 ctx.restore();
}
function storyVegetable(x,y,type){
 ctx.save();ctx.translate(x,y);
 if(type==="carrot"){ctx.beginPath();ctx.moveTo(-17,-20);ctx.quadraticCurveTo(0,-29,17,-18);ctx.lineTo(2,36);ctx.quadraticCurveTo(-3,43,-7,34);ctx.closePath();ctx.fillStyle="#f47c32";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=4;ctx.stroke();handLine([[-3,-20],[-13,-43],[-18,-27],[0,-22],[8,-45],[10,-22]],"#30271f",3);ctx.strokeStyle="#31914d";ctx.lineWidth=6;ctx.stroke();}
 else if(type==="strawberry"){ctx.beginPath();ctx.moveTo(-21,-15);ctx.quadraticCurveTo(-22,8,0,32);ctx.quadraticCurveTo(22,8,21,-15);ctx.quadraticCurveTo(0,-29,-21,-15);ctx.fillStyle="#ef3f45";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=4;ctx.stroke();handLine([[-18,-17],[-7,-27],[0,-18],[9,-28],[20,-16]],"#30271f",3);ctx.fillStyle="#318c4d";ctx.beginPath();ctx.ellipse(-8,-23,10,5,-.5,0,Math.PI*2);ctx.ellipse(8,-23,10,5,.5,0,Math.PI*2);ctx.fill();for(const a of [[-9,-5],[7,-2],[-3,9],[10,14],[-12,16]])ellipse(a[0],a[1],1.8,2.5,"#30271f","none",0);}
 else if(type==="tomato"){ellipse(0,0,23,22,"#ef4148","#30271f",4);handLine([[0,-17],[-7,-27],[-15,-19],[-4,-19],[2,-29],[7,-18],[17,-20],[7,-13]],"#30271f",3);ctx.fillStyle="#31914d";ctx.beginPath();ctx.arc(0,-18,12,Math.PI,Math.PI*2);ctx.fill();}
 else if(type==="cilantro"){for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI/2.5;ctx.beginPath();ctx.ellipse(Math.cos(a)*11,-15+Math.sin(a)*11,10,15,a,0,Math.PI*2);ctx.fillStyle="#48a85a";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=3;ctx.stroke();}handLine([[0,-5],[0,29]],"#30271f",3);handLine([[0,29],[-8,40],[7,40]],"#30271f",3);}
 ctx.restore();
}
function drawFence(y=345){
 ctx.save();ctx.strokeStyle="#30271f";ctx.lineWidth=5;ctx.lineCap="round";
 for(let x=18;x<960;x+=82){ctx.beginPath();ctx.moveTo(x,y+35);ctx.lineTo(x,y-25);ctx.lineTo(x+12,y-38);ctx.lineTo(x+24,y-25);ctx.lineTo(x+24,y+35);ctx.stroke();}
 ctx.strokeStyle="#a56c3d";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,y-2);ctx.lineTo(960,y-2);ctx.moveTo(0,y+22);ctx.lineTo(960,y+22);ctx.stroke();ctx.restore();
}
function background(){
 const stage=Math.max(0,Math.min(4,mission));
 // La página conserva el azul celeste del cuento original.
 ctx.fillStyle="#80c5e8";ctx.fillRect(0,0,W,H);
 storyCloud(145,85,.8);storyCloud(495,105,.62);
 ellipse(840,78,37,37,"#ffdf43","#30271f",3);
 // Colinas dibujadas con contorno, como las grafías del libro.
 ctx.beginPath();ctx.moveTo(0,345);ctx.quadraticCurveTo(190,270,380,345);ctx.quadraticCurveTo(650,420,960,320);ctx.lineTo(960,600);ctx.lineTo(0,600);ctx.closePath();ctx.fillStyle=stage===0?"#7cbd62":"#6dbb65";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=4;ctx.stroke();
 ctx.beginPath();ctx.moveTo(0,425);ctx.quadraticCurveTo(250,365,480,430);ctx.quadraticCurveTo(700,485,960,410);ctx.lineTo(960,600);ctx.lineTo(0,600);ctx.closePath();ctx.fillStyle=stage===4?"#e7bd67":"#9bce70";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=3;ctx.stroke();
 if(stage===0){
  // La huerta está triste y casi vacía; Lulú se esconde entre la tierra.
  ctx.fillStyle="#b8794a";ctx.beginPath();ctx.ellipse(480,492,405,88,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=4;ctx.stroke();
  for(const x of [105,320,640,850])storyBush(x,422,.95);
  for(let i=0;i<5;i++)storyFlower(75+i*190,545,i%2?"#f1d23d":"#e94d55",.7);
 }else if(stage===1){
  // Cajones y restos vegetales: los tesoros que alimentan la tierra.
  drawFence(330);
  for(let i=0;i<4;i++){const x=80+i*220;rounded(x,410,155,92,9,"#a96a3f");ctx.strokeStyle="#30271f";ctx.lineWidth=4;ctx.strokeRect(x+8,420,139,65);}
  // Los alimentos interactivos se muestran únicamente en primer plano, con una señal clara.
  for(let i=0;i<6;i++)storyFlower(45+i*170,548,i%2?"#e94d55":"#f5d33d",.6);
 }else if(stage===2){
  // Tierra seca preparada en surcos para zanahoria, tomate, cilantro y fresa.
  ctx.fillStyle="#a96f45";ctx.beginPath();ctx.ellipse(480,465,465,135,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle="#d49a61";ctx.lineWidth=8;for(let i=0;i<5;i++){ctx.beginPath();ctx.quadraticCurveTo(200,430+i*22,760,435+i*22);ctx.stroke();}
  storyVegetable(105,535,"carrot");storyVegetable(835,530,"strawberry");
 }else if(stage===3){
  // Las plantas crecen gracias al agua y al compost.
  drawFence(330);
  for(let i=0;i<7;i++){const x=40+i*145;storyFlower(x,545,["#ef5362","#f4d23e","#b28bd2"][i%3],.85);}
  for(const x of [110,850])storyBush(x,435,1.05);
 }else{
  // La huerta florecida y la cosecha final del cuento.
  drawFence(320);
  for(const x of [90,870])storyBush(x,420,1.15);
  // En la zona de cosecha no dibujamos frutas decorativas: solo aparecen los alimentos que se pueden recoger.
  for(let i=0;i<8;i++)storyFlower(35+i*128,550,["#ef5362","#f4d23e","#b28bd2"][i%3],.82);
  // Guirnalda sencilla para celebrar la cosecha.
  handLine([[0,255],[220,285],[480,300],[730,280],[960,250]],"#30271f",3);
  for(let i=0;i<10;i++){const x=35+i*98,y=260+Math.sin(i/9*Math.PI)*35;ctx.beginPath();ctx.moveTo(x-8,y-6);ctx.lineTo(x+8,y-6);ctx.lineTo(x,y+13);ctx.closePath();ctx.fillStyle=["#ef5362","#f4d23e","#b28bd2","#54a965"][i%4];ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=2;ctx.stroke();}
 }
 if(stage!==2){drawButterfly(185+Math.sin(anim/55)*35,205,"#ef5362",0);drawButterfly(735+Math.cos(anim/60)*24,250,"#b28bd2",2);}
 if(stage>=1)drawBee(360+Math.sin(anim/34)*22,190,1);
 if(stage>=3){drawLadybug(770,470,3);drawBee(550,300,5);}
 for(let i=0;i<7;i++){const x=(i*137+anim*.22)%960,y=150+(i*61)%230+Math.sin(anim/24+i)*5;ctx.globalAlpha=.35+.2*Math.sin(anim/18+i);ctx.fillStyle="#fff5b5";ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}
 ctx.globalAlpha=1;
}
function toast(t){message.textContent=t;message.style.display="block";toastTimer=130;}
function labels(){missionLabel.textContent=missions[mission]||"¡Aventura completada!";seedLabel.textContent="Misiones: "+stars+" / 5   ⭐ "+stars+"/5";}
function init(){picked=0;items=[];dragging=null;waterDrops=[];sparkles=[];plots=[];if(mission===1)items=[["seed",150,245],["seed",340,300],["plant",520,230],["plant",790,290],["carrot",230,430],["strawberry",430,430],["tomato",640,420],["corn",810,445],["flower",120,390],["lettuce",350,180],["pumpkin",610,190],["rock",900,450]];if(mission===2){items=[["seed",230,255],["seed",480,255],["seed",730,255]];plots=[{x:280,y:455,done:gardenStages[0]===1||gardenStages[0]===2,index:0},{x:480,y:455,done:gardenStages[1]===1||gardenStages[1]===2,index:1},{x:680,y:455,done:gardenStages[2]===1||gardenStages[2]===2,index:2}];}if(mission===3){items=[["plant",230,355],["plant",480,355],["plant",730,355]].map((a,i)=>({...{type:a[0],x:a[1],y:a[2],done:gardenStages[i]===2,growth:gardenStages[i]} ,plotIndex:i}));waterCan={x:845,y:220};}if(mission===4)items=[["strawberry",150,310],["carrot",310,300],["tomato",470,310],["corn",640,300],["pumpkin",810,315],["lettuce",250,450],["flower",500,455],["strawberry",740,455]];items=items.map(a=>Array.isArray(a)?({type:a[0],x:a[1],y:a[2],done:false,growth:0}):a);}
function drawGardenGrowth(x,baseY,stage){
 // El mismo surco evoluciona: brote pequeño al sembrar, planta frondosa al regar.
 ctx.save();ctx.lineCap="round";
 ctx.strokeStyle="#328b45";ctx.lineWidth=stage===1?6:10;ctx.beginPath();ctx.moveTo(x,baseY);ctx.quadraticCurveTo(x-4,baseY-20,x,baseY-(stage===1?31:65));ctx.stroke();
 const leaf=stage===1?13:23;
 ellipse(x-leaf,baseY-(stage===1?20:42),leaf,stage===1?7:12,"#62b85b","#286d3b",2);
 ellipse(x+leaf,baseY-(stage===1?28:55),leaf,stage===1?7:12,"#78c96a","#286d3b",2);
 if(stage===2){ellipse(x,baseY-76,13,13,"#ffd84b","#286d3b",2);for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(x-23+k*23,baseY-5,3,0,Math.PI*2);ctx.fillStyle="#a8db72";ctx.fill();}}
 ctx.restore();
}
function drawWaterCan(){const x=waterCan.x,y=waterCan.y;ctx.save();ctx.translate(x,y);ctx.fillStyle="#e7a83f";ctx.strokeStyle="#684321";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-24,-13,43,34,8);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(17,-7);ctx.lineTo(39,-18);ctx.lineTo(44,-11);ctx.lineTo(21,3);ctx.stroke();ctx.beginPath();ctx.arc(-27,0,19,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.fillStyle="#74d5f4";ctx.beginPath();ctx.ellipse(0,-15,21,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawBasket(){const x=480,y=520;ctx.save();if(dragging&&dragging.kind==="crop"){ctx.beginPath();ctx.ellipse(x,y-5,112,82,0,0,Math.PI*2);ctx.fillStyle="rgba(255,224,112,.30)";ctx.fill();ctx.strokeStyle="#f4c65e";ctx.lineWidth=7;ctx.setLineDash([10,8]);ctx.stroke();ctx.setLineDash([]);text("¡SUELTA AQUÍ!",x,y-91,17,"#315d43");}ctx.fillStyle="#b87543";ctx.strokeStyle="#70452c";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-75,y-28);ctx.lineTo(x+75,y-28);ctx.lineTo(x+58,y+34);ctx.lineTo(x-58,y+34);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(x,y-26,58,Math.PI,0);ctx.stroke();for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(x+k*19,y-22);ctx.lineTo(x+k*15,y+29);ctx.stroke();}text("¡CANASTA!",x,y+59,15,"#70452c");ctx.restore();}
function drawTargetHint(x,y){
 const pulse=1+Math.sin(anim/12)*.07;
 ctx.save();ctx.setLineDash([7,6]);ctx.lineWidth=4;ctx.strokeStyle="rgba(255,220,70,.98)";
 ctx.beginPath();ctx.ellipse(x,y+5,39*pulse,34*pulse,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle="#fff4a8";ctx.beginPath();ctx.arc(x+29,y-27,5,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function drawItem(it){if(it.done&&mission!==3)return;const {x,y,type}=it;
 const isTarget=(mission===1&&["seed","plant","carrot","strawberry","tomato","corn","flower","lettuce","pumpkin"].includes(type))||(mission===2&&type==="seed")||(mission===3&&type==="plant")||(mission===4&&type!=="flower");
 if(isTarget&&!it.done)drawTargetHint(x,y);if(type==="seed"){ellipse(x,y,24,15,"#b87b42");ellipse(x,y-3,9,5,"#f2c36b","none",0);}else if(type==="plant"){const grow=it.growth||0;ctx.strokeStyle="#287b3b";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(x,y+34);ctx.lineTo(x,y-42-grow*18);ctx.stroke();ellipse(x-30-grow*5,y-25-grow*13,29+grow*5,16+grow*3,"#55b85b");ellipse(x+30+grow*5,y-43-grow*13,29+grow*5,16+grow*3,"#65c95e");ellipse(x-12,y-58-grow*15,23,13,"#78d96a");if(it.done){for(let k=0;k<6;k++){const a=k*Math.PI/3;ellipse(x+Math.cos(a)*20,y-75-grow*15+Math.sin(a)*14,12,10,"#ff91bd","none",0);}ellipse(x,y-75-grow*15,8,8,"#ffd84d","none",0);text("✓",x+48,y-42,24,"#277b3b");}}else if(type==="carrot"){ctx.beginPath();ctx.moveTo(x-20,y-15);ctx.lineTo(x+20,y-15);ctx.lineTo(x,y+38);ctx.closePath();ctx.fillStyle="#ff982f";ctx.fill();ctx.strokeStyle="#30271f";ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle="#328c47";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x-8,y-37);ctx.moveTo(x,y-15);ctx.lineTo(x+10,y-38);ctx.stroke();}else if(type==="rock")ellipse(x,y,27,20,"#858d8a");else if(type==="shoe")rounded(x-28,y-10,54,27,10,"#b66d55");else if(type==="flower"){for(let k=0;k<6;k++){const a=k*Math.PI/3;ellipse(x+Math.cos(a)*13,y+Math.sin(a)*13,9,9,"#ff91bd","none",0);}ellipse(x,y,7,7,"#ffd84d","none",0);}else if(type==="lettuce"){ellipse(x,y,28,20,"#55b85b");ellipse(x-13,y-5,15,14,"#7bd66e");ellipse(x+13,y-5,15,14,"#7bd66e");}else if(type==="pumpkin"){ellipse(x,y,28,24,"#f58c32");ellipse(x-12,y,13,22,"#ffad48","none",0);ellipse(x+12,y,13,22,"#ffad48","none",0);}else if(type==="strawberry"){ellipse(x,y,22,25,"#ef5362");text("✿",x,y-20,18,"#3a974c");}else if(type==="tomato"){ellipse(x,y,25,23,"#ed5b4c");text("✦",x,y-13,16,"#3a974c");}else if(type==="corn"){rounded(x-17,y-28,34,57,13,"#ffd64b");}}
function next(){
 seeds=Math.min(5,seeds+1);stars=Math.min(5,stars+1);
 const earned=["Explorador de la huerta","Detective de semillas","Maestro sembrador","Amigo del agua","Gran cosechador"][mission];
 badges.push(earned);labels();soundEffect("success");
 for(let i=0;i<72;i++){
  sparkles.push({x:480+(Math.random()-.5)*520,y:285+(Math.random()-.5)*250,life:75,vx:(Math.random()-.5)*5,vy:-2-Math.random()*4,hue:Math.floor(Math.random()*360)});
 }
 toast("¡Insignia desbloqueada: "+earned+"! ⭐");
 transitionTimer=setTimeout(()=>{
  transitionTimer=null;
  if(mission<4){mission++;init();labels();toast(missions[mission]);}
  else{
   mission=5;screen="win";overlay.classList.remove("hidden");
   overlay.querySelector(".panel").innerHTML='<div class="win-screen"><div class="win-garland">🌼 🌷 🌻 🌷 🌼</div><div class="win-hero"><span class="win-sun"></span><span class="win-cloud cloud-a"></span><span class="win-cloud cloud-b"></span><div class="win-lulu">🐛👑</div><div class="win-hills"></div><div class="win-garden">🥕 🍓 🌻 🍅 🌱</div></div><p class="win-kicker">¡MISIÓN CUMPLIDA!</p><h1>¡LO LOGRASTE!</h1><p class="win-message">¡Eres cuidador de la Huerta Mágica de las niñas y los niños!</p><div class="win-stars">⭐ ⭐ ⭐ ⭐ ⭐</div><p class="win-thanks">Lulú celebra contigo 💚</p><button id="againBtn" class="primary">🌱 VOLVER A JUGAR</button></div>';
   document.getElementById("againBtn").onclick=start;
  }
 },850);
}
function start(){if(transitionTimer){clearTimeout(transitionTimer);transitionTimer=null;}screen="play";mission=0;seeds=0;stars=0;badges=[];gardenStages=[0,0,0];paused=false;init();overlay.classList.add("hidden");pausePanel.classList.add("hidden");labels();if(musicOn)startMusic();toast("¡Hola! Encuentra a Lulú.");}
function draw(){anim++;background();if(screen==="menu"){drawLulu(480,335,2);text("¡La huerta te necesita!",480,475,29,"#3d8744");return;}if(screen==="play"){rounded(22,18,916,65,18,"rgba(255,253,239,.94)");text(missions[mission],480,49,25,"#438d43");for(let i=0;i<5;i++)ellipse(405+i*38,68,10,10,i<seeds?"#ffd83e":"#fffdf2");if(mission===0){luluVisible=Math.floor(anim/95)%3!==1;luluX=480+Math.sin(anim/42)*245;luluY=355+Math.sin(anim/27)*34;if(luluVisible)drawLulu(luluX,luluY,1.35,"surprised");for(let b=0;b<4;b++){const bx=120+b*235;ellipse(bx,430,78,34,"#398d4b","none",0);ellipse(bx-35,414,38,29,"#55ad55","none",0);ellipse(bx+35,414,38,29,"#55ad55","none",0);}rounded(190,475,580,91,20,"rgba(255,253,242,.96)");text("¡BUSCA A LULÚ!",480,512,25,"#315d43");text("Explora detrás de los arbustos y encuéntrala",480,545,18,"#64816a");}else{const captions=["","","SIEMBRA: arrastra cada semilla hasta la tierra","RIEGA: acerca la regadera a cada planta","COSECHA: lleva cada alimento hasta la canasta"];rounded(105,96,750,58,16,"#fffdf0");text(mission===1?"👆 EXPLORA: toca los tesoros señalados":mission===2?"🌱 "+captions[mission]:mission===3?"💧 "+captions[mission]:"🧺 "+captions[mission],480,133,mission===1?22:20,"#315f35");if(mission===2){plots.forEach(p=>{ellipse(p.x,p.y,58,23,p.done?"#70452c":"#8d542f");if(p.done){drawGardenGrowth(p.x,p.y-4,1);text("🌱",p.x,p.y-55,18);}});items.forEach(drawItem);if(dragging){ellipse(dragging.x,dragging.y,15,11,"#e8bd78");text("🌱",dragging.x,dragging.y-17,23);}}else{if(mission===4){for(let i=0;i<3;i++){const gx=245+i*235;drawGardenGrowth(gx,465,2);}drawBasket();}items.forEach(drawItem);if(dragging&&dragging.kind==="crop"){ctx.save();ctx.globalAlpha=.22;ellipse(dragging.x,dragging.y+34,36,12,"#315d43","none",0);ctx.restore();}}drawLulu(100,530,.8);if(mission===3){items.forEach(p=>{rounded(p.x-65,p.y+24,130,82,22,"#b87543");rounded(p.x-59,p.y+30,118,68,18,"#75452e");for(let q=0;q<5;q++)ellipse(p.x-42+q*21,p.y+54,3,3,"#d9a36b","none",0);if(gardenStages[p.plotIndex]>0)drawGardenGrowth(p.x,p.y+20,gardenStages[p.plotIndex]);});items.forEach(drawItem);waterDrops.forEach(d=>{ctx.strokeStyle="#45b9ed";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-4,d.y+17);ctx.stroke();ellipse(d.x,d.y+20,5,7,"#7bd9ff","none",0);});if(waterStream>0){ctx.strokeStyle="#55c9ff";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(845,238);ctx.quadraticCurveTo(790,300,waterStream,375);ctx.stroke();waterStream=0;}drawWaterCan();}}}if(screen==="win"){drawLulu(480,335,2,"happy");text("¡LO LOGRASTE!",480,170,48,"#438d43");text("¡Eres guardián de la huerta mágica!",480,220,25);text("DIPLOMA DE GUARDIÁN DE LA HUERTA",480,275,22,"#8a55b5");text("⭐ ⭐ ⭐ ⭐ ⭐",480,325,32,"#d99c24");text("¡Lulú y sus amigos te dan las gracias!",480,370,21,"#315f35");}sparkles.forEach(p=>{ctx.save();ctx.globalAlpha=Math.max(.15,p.life/75);ctx.fillStyle="hsl("+((p.hue||40)+anim)%360+" 85% 58%)";ctx.beginPath();ctx.arc(p.x,p.y,4+(p.life%4),0,Math.PI*2);ctx.fill();ctx.restore();p.x+=(p.vx||0);p.y+=(p.vy||-.8);p.vy=(p.vy||-.8)+.09;});if(toastTimer>0&&--toastTimer===0)message.style.display="none";}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
canvas.addEventListener("pointerdown",e=>{if(screen!=="play"||paused)return;e.preventDefault();const {x,y}=canvasPoint(e);
 if(mission===0){if(luluVisible&&Math.hypot(x-luluX,y-luluY)<155){luluVisible=false;soundEffect("success");for(let i=0;i<16;i++)sparkles.push({x:luluX+(Math.random()-.5)*110,y:luluY+(Math.random()-.5)*90,life:35});toast("¡ME ENCONTRASTE! ¡Qué ojos tan atentos! 🐛👑");next();}else toast("¡Sigue buscando detrás de los arbustos! 👀");return;}
 if(mission===2){const seed=items.find(a=>a.type==="seed"&&!a.done&&Math.hypot(x-a.x,y-a.y)<55);if(seed){dragging={item:seed,x,y};canvas.setPointerCapture(e.pointerId);toast("¡Arrastra la semillita hasta un montículo de tierra!");return;}}
 if(mission===3){if(Math.hypot(x-waterCan.x,y-waterCan.y)<75){dragging={kind:"can",x,y};canvas.setPointerCapture(e.pointerId);toast("¡Lleva la regadera hasta una planta y suelta! 💦");return;}toast("¡Primero toma la regadera amarilla!");return;}
 if(mission===4){const crop=items.find(a=>!a.done&&a.type!=="flower"&&Math.hypot(x-a.x,y-a.y)<65);if(crop){dragging={kind:"crop",item:crop,x,y:y-34,fromX:crop.x,fromY:crop.y,offsetY:-34};canvas.setPointerCapture(e.pointerId);toast("¡Recoge el alimento y llévalo hasta la canasta! 🧺");return;}toast("¡Toca y arrastra un alimento hasta la canasta!");return;}
 const it=items.find(a=>!a.done&&Math.hypot(x-a.x,y-a.y)<62);if(!it){toast("¡Prueba tocando uno de los dibujos!");return;}if(mission===1&&!["seed","plant","carrot","strawberry","tomato","corn","flower","lettuce","pumpkin"].includes(it.type)){toast("¡Busca semillas, plantas o alimentos!");return;}it.done=true;picked++;soundEffect(mission===4?"harvest":"pop");toast(mission===4?"¡Cosecha deliciosa! 🍓":"¡Muy bien!");if(picked===(mission===1?11:mission===4?7:3))next();
});
canvas.addEventListener("pointermove",e=>{if(dragging){const p=canvasPoint(e);dragging.x=p.x;dragging.y=p.y;if(dragging.kind==="can"){waterCan.x=p.x;waterCan.y=p.y;}if(dragging.kind==="crop"){dragging.item.x=p.x;dragging.item.y=p.y+(dragging.offsetY||-34);}}});
canvas.addEventListener("pointerup",e=>{if(!dragging)return;const p=canvasPoint(e);if(dragging.kind==="can"){waterCan.x=p.x;waterCan.y=p.y;const plant=items.find(a=>a.type==="plant"&&!a.done&&gardenStages[a.plotIndex]===1&&Math.hypot(p.x-a.x,p.y-(a.y-25))<105);if(plant){plant.done=true;plant.growth=2;gardenStages[plant.plotIndex]=2;soundEffect("water");for(let i=0;i<24;i++)waterDrops.push({x:plant.x+(Math.random()-.5)*75,y:plant.y-105-Math.random()*75});for(let i=0;i<12;i++)sparkles.push({x:plant.x+(Math.random()-.5)*65,y:plant.y-60-Math.random()*40,life:35});picked++;toast("¡CHORRO DE AGUA! ¡Tu planta está creciendo! 💦🌼");if(picked===3)next();}else{toast("¡Acerca la regadera a una plantita y vuelve a intentarlo!");}waterCan={x:845,y:220};dragging=null;return;}if(dragging.kind==="crop"){const crop=dragging.item;if(Math.hypot((p.x-480)/1.18,(p.y-510)/1.12)<155){crop.done=true;picked++;soundEffect("harvest");for(let i=0;i<12;i++)sparkles.push({x:480+(Math.random()-.5)*100,y:500+(Math.random()-.5)*45,life:32});toast("¡A la canasta! ¡Qué buena cosecha! 🍓🧺");if(picked===7)next();}else{crop.x=dragging.fromX;crop.y=dragging.fromY;toast("¡Acércalo a la canasta iluminada y suelta!");}dragging=null;return;}const plot=plots.find(a=>!a.done&&Math.hypot(p.x-a.x,p.y-a.y)<75);if(plot){plot.done=true;gardenStages[plot.index]=1;dragging.item.done=true;picked++;soundEffect("success");toast("¡Semilla sembrada! ¡Mira, ya nació un brotecito! 🌱");if(picked===3)next();}else{toast("¡Llévala hasta uno de los montículos de tierra!");}dragging=null;});

canvas.addEventListener("pointercancel",()=>{if(!dragging)return;if(dragging.kind==="crop"){dragging.item.x=dragging.fromX;dragging.item.y=dragging.fromY;}if(dragging.kind==="can")waterCan={x:845,y:220};dragging=null;});
document.getElementById("playBtn").onclick=start;document.getElementById("meetBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><p class="eyebrow">TU NUEVA AMIGA EN LA HUERTA</p><h1>¡Hola, soy Lulú!</h1><p class="intro">Soy una lombriz curiosa y alegre. Mi coronita lila me recuerda que cada pequeño ser tiene algo especial. Me encanta cuidar la tierra, descubrir semillas y ver crecer las plantas. ¿Jugamos?</p><button id="backMenu" class="primary">VOLVER AL INICIO</button>';document.getElementById("backMenu").onclick=menu;};document.getElementById("howBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">👆🌱</div><h1>¿Cómo jugar?</h1><p class="intro">Sigue cada pista de Lulú: toca los tesoros para explorar, arrastra las semillas hasta la tierra, lleva la regadera a las plantas y arrastra los alimentos hasta la canasta. ¡Si te equivocas, puedes intentarlo otra vez!</p><button id="backMenu" class="primary">¡ENTENDIDO!</button>';document.getElementById("backMenu").onclick=menu;};
function menu(){screen="menu";overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><p class="eyebrow">UNA AVENTURA PARA CUIDAR, SEMBRAR Y DESCUBRIR</p><h1>Lulú y la<br>huerta mágica</h1><p class="intro">¡Hola, amiguito! Soy Lulú. ¿Me ayudas a recuperar la magia de nuestra huerta?</p><div class="menu-buttons"><button id="playBtn" class="primary">🌼 JUGAR AVENTURA</button><button id="meetBtn" class="secondary">💜 CONOCE A LULÚ</button><button id="howBtn" class="secondary">❔ CÓMO JUGAR</button></div><p class="tiny">Puedes jugar con el mouse o tocando la pantalla.</p>';overlay.classList.remove("hidden");document.getElementById("playBtn").onclick=start;document.getElementById("meetBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">🐛👑</div><h1>¡Hola, soy Lulú!</h1><p class="intro">Soy una lombriz amarilla con rayitas negras y una coronita lila. ¡Me encanta cuidar la huerta!</p><button id="backMenu" class="primary">VOLVER</button>';document.getElementById("backMenu").onclick=menu;};document.getElementById("howBtn").onclick=()=>{overlay.querySelector(".panel").innerHTML='<div class="worm-emoji">👆🌱</div><h1>¿Cómo jugar?</h1><p class="intro">Sigue cada pista de Lulú: toca los tesoros para explorar, arrastra las semillas hasta la tierra, lleva la regadera a las plantas y arrastra los alimentos hasta la canasta. ¡Si te equivocas, puedes intentarlo otra vez!</p><button id="backMenu" class="primary">¡ENTENDIDO!</button>';document.getElementById("backMenu").onclick=menu;};}
document.getElementById("pauseBtn").onclick=()=>{if(screen==="play"){paused=true;stopMusic();pausePanel.classList.remove("hidden");}};document.getElementById("resumeBtn").onclick=()=>{paused=false;pausePanel.classList.add("hidden");if(musicOn)startMusic();};document.getElementById("restartBtn").onclick=start;document.getElementById("musicBtn").onclick=()=>{musicOn=!musicOn;document.getElementById("musicBtn").textContent="♫ Música: "+(musicOn?"sí":"no");if(musicOn){startMusic();soundEffect("success");}else stopMusic();};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&screen==="play"){paused=true;stopMusic();pausePanel.classList.remove("hidden");}});
function loop(){if(!paused){draw();waterDrops.forEach(d=>d.y+=3);waterDrops=waterDrops.filter(d=>d.y<560);sparkles.forEach(p=>p.life--);sparkles=sparkles.filter(p=>p.life>0);}requestAnimationFrame(loop);}loop();
})();