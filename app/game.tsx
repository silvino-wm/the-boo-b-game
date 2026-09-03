"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type GameState = "levelIntro" | "playing" | "levelCleared" | "won" | "lost";
type Body = { x:number; y:number; vx:number; vy:number; w:number; h:number };
type Loaded = Record<string, HTMLImageElement>;
type ScoreEntry = { id:number; player_name:string; score:number; level_reached:number; created_at:string };

const W=960,H=540,ground=455;
const platforms=[{x:150,y:382,w:165},{x:365,y:327,w:135},{x:552,y:386,w:126},{x:726,y:315,w:100}];
const levelData=[
 {name:"Sunset Valley",story:"Oh no! The Big One is trying to steal our big, beautiful stars. Boo B, help me stop that rooster!",bg:"/backgrounds/sunset-valley-v1.png",interval:1250,count:1,minSpeed:220,maxSpeed:285,accent:"#91ec70",floor:"#2f215b"},
 {name:"Moonlit Forest",story:"He escaped into the Moonlit Forest! The stolen stars are making him faster. Boo A, light the way — we can't let him get away!",bg:"/backgrounds/moonlit-forest-v1.png",interval:900,count:2,minSpeed:270,maxSpeed:355,accent:"#52e3e5",floor:"#15265c"},
 {name:"Sky Temple",story:"The Big One has reached the Sky Temple with every star he stole. Boo B, this is our final chance — let's bring them home!",bg:"/backgrounds/sky-temple-v1.png",interval:630,count:3,minSpeed:330,maxSpeed:445,accent:"#d7a5ff",floor:"#372052"},
];

function rounded(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function fallbackKid(c:CanvasRenderingContext2D,p:Body,flash:boolean){c.save();c.translate(p.x+p.w/2,p.y+p.h/2);if(p.vx<0)c.scale(-1,1);if(flash)c.globalAlpha=.45;c.fillStyle="#303555";c.fillRect(-9,12,7,19);c.fillRect(3,12,7,19);c.fillStyle="#ffd641";rounded(c,-16,-9,32,29,9);c.fillStyle="#f2ae73";c.beginPath();c.arc(0,-17,14,0,Math.PI*2);c.fill();c.fillStyle="#3b2455";c.beginPath();c.arc(0,-21,15,Math.PI,Math.PI*2);c.fill();c.restore()}
function drawHero(c:CanvasRenderingContext2D,p:Body,img:HTMLImageElement,flash:boolean,now:number){const bob=Math.abs(p.vx)>18?Math.sin(now*.018)*2:0;c.save();c.translate(p.x+p.w/2,p.y+p.h);if(p.vx<0)c.scale(-1,1);if(flash)c.globalAlpha=.42;c.drawImage(img,-49,-82+bob,98,102);c.restore()}
function drawSprite(c:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,squeeze=0,alpha=1){c.save();c.translate(x,y);c.scale(1+squeeze*.16,1-squeeze*.2);c.globalAlpha=alpha;c.drawImage(img,-w/2,-h/2,w,h);c.restore()}
function drawPoweredBoo(c:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,squeeze:number,now:number,active:boolean){c.save();c.translate(x,y);if(active){c.rotate(now*.012);c.shadowColor=now%220<110?"#efff69":"#66f8ff";c.shadowBlur=28+Math.sin(now*.02)*8;c.globalAlpha=.92+.08*Math.sin(now*.028)}c.scale(1+squeeze*.16,1-squeeze*.2);c.drawImage(img,-41,-44,82,88);c.restore()}
function fallbackBoo(c:CanvasRenderingContext2D,x:number,y:number,s:number){c.save();c.translate(x,y);c.fillStyle="#fff";c.beginPath();c.ellipse(0,0,34*s,41*s,0,0,Math.PI*2);c.fill();c.fillStyle="#23314a";c.beginPath();c.arc(-10*s,-5*s,3*s,0,Math.PI*2);c.arc(10*s,-5*s,3*s,0,Math.PI*2);c.fill();c.restore()}
function fallbackBoss(c:CanvasRenderingContext2D,x:number,y:number,hit:boolean){c.save();c.translate(x,y);if(hit)c.globalAlpha=.45;c.fillStyle="#713397";c.beginPath();c.arc(0,0,53,0,Math.PI*2);c.fill();c.fillStyle="#ef3b5d";c.beginPath();c.arc(0,-53,22,0,Math.PI*2);c.fill();c.restore()}

function makeEngine(level:number,score:number){
 return {p:{x:68,y:390,vx:0,vy:0,w:34,h:55},boss:{x:857,y:386},flowers:[] as any[],enemyShots:[] as any[],bonus:{x:778,y:270,t:0,taken:false},eggplant:{x:210+Math.random()*480,y:245+Math.random()*110,t:0,spawnDelay:3500+Math.random()*6500,visible:false,taken:false},levelStarted:0,flowerStormUntil:0,hp:100+(level-1)*20,power:100,score,lives:3,last:0,lastShot:0,lastEnemy:0,hitUntil:0,bossHit:0,squeeze:0,camShake:0,finished:false};
}

export default function Game(){
 const canvasRef=useRef<HTMLCanvasElement>(null),images=useRef<Loaded>({}),keys=useRef<Record<string,boolean>>({}),engine=useRef<any>(null),scoreRef=useRef(0),runId=useRef("");
 const[state,setState]=useState<GameState>("levelIntro"),[level,setLevel]=useState(1),[score,setScore]=useState(0),[bossHp,setBossHp]=useState(100),[power,setPower]=useState(100),[lives,setLives]=useState(3),[boostMs,setBoostMs]=useState(0),[muted,setMuted]=useState(false);
 const[leaderboard,setLeaderboard]=useState<ScoreEntry[]>([]),[boardOpen,setBoardOpen]=useState(false),[playerName,setPlayerName]=useState(""),[submitStatus,setSubmitStatus]=useState<"idle"|"saving"|"saved"|"error">("idle"),[submitMessage,setSubmitMessage]=useState("");

 const loadScores=useCallback(async()=>{try{const response=await fetch("/api/scores",{cache:"no-store"});if(response.ok){const data=await response.json() as {scores:ScoreEntry[]};setLeaderboard(data.scores)}}catch{}},[]);
 const beginLevel=useCallback((next:number,fresh=false)=>{if(fresh){scoreRef.current=0;runId.current=crypto.randomUUID();setSubmitStatus("idle");setSubmitMessage("");setPlayerName("")}engine.current=makeEngine(next,scoreRef.current);setLevel(next);setState("levelIntro");setBossHp(100);setPower(100);setLives(3);setBoostMs(0);setScore(scoreRef.current)},[]);
 useEffect(()=>beginLevel(1,true),[beginLevel]);
 useEffect(()=>{loadScores()},[loadScores]);
 useEffect(()=>{const sources={hero:"/characters/hero-run-v1.png",booB:"/characters/boo-b-v1.png",booA:"/characters/boo-a-v1.png",boss:"/characters/the-big-one-v1.png",star:"/effects/boo-a-star-v1.png",flower:"/effects/boo-b-flower-v1.png",eggplant:"/effects/eggplant-powerup-v1.png",bg1:levelData[0].bg,bg2:levelData[1].bg,bg3:levelData[2].bg};for(const[name,src]of Object.entries(sources)){const img=new Image();img.src=src;img.onload=()=>{images.current[name]=img}}return()=>{images.current={}}},[]);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if(state==="levelIntro"){keys.current={};setState("playing");e.preventDefault();return}keys.current[e.code]=true;if(["ArrowLeft","ArrowRight","ArrowUp","Space","KeyE"].includes(e.code))e.preventDefault()},up=(e:KeyboardEvent)=>{keys.current[e.code]=false};addEventListener("keydown",down);addEventListener("keyup",up);return()=>{removeEventListener("keydown",down);removeEventListener("keyup",up)}},[state]);

 useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const c=canvas.getContext("2d");if(!c)return;let raf=0;
  const loop=(now:number)=>{const g=engine.current;if(!g){raf=requestAnimationFrame(loop);return}const dt=Math.min(.032,(now-g.last)/1000||.016);g.last=now;const cfg=levelData[level-1];
   if(state==="playing"){
    const p=g.p,left=keys.current.ArrowLeft||keys.current.KeyA,right=keys.current.ArrowRight||keys.current.KeyD;
    if(!g.levelStarted)g.levelStarted=now;g.eggplant.t+=dt;if(!g.eggplant.taken&&!g.eggplant.visible&&now-g.levelStarted>=g.eggplant.spawnDelay)g.eggplant.visible=true;
    p.vx+=((right?1:0)-(left?1:0))*1050*dt;p.vx*=Math.pow(.0025,dt);p.vx=Math.max(-250,Math.min(250,p.vx));
    const floorY=ground-p.h;let standing=p.y>=floorY-2;
    for(const q of platforms)if(p.x+p.w>q.x&&p.x<q.x+q.w&&p.y+p.h>=q.y-5&&p.y+p.h<=q.y+12&&p.vy>=0){p.y=q.y-p.h;p.vy=0;standing=true}
    if((keys.current.ArrowUp||keys.current.KeyW||keys.current.Space)&&standing){p.vy=-440;keys.current.ArrowUp=keys.current.KeyW=keys.current.Space=false}
    p.vy+=1050*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=Math.max(5,Math.min(W-p.w-5,p.x));if(p.y>floorY){p.y=floorY;p.vy=0}
    const flowerStorm=now<g.flowerStormUntil;
    if((keys.current.KeyE||keys.current.ShiftLeft)&&(flowerStorm||g.power>=28)&&now-g.lastShot>(flowerStorm?180:430)){g.lastShot=now;if(!flowerStorm)g.power-=28;g.squeeze=1;const angles=flowerStorm?[-250,-180,-110,-40,30]:[-110];for(const vy of angles)g.flowers.push({x:p.x+75,y:p.y+10,vx:flowerStorm?390+Math.random()*90:430,vy:vy+Math.random()*24-12,spin:Math.random()*5})}
    g.squeeze=Math.max(0,g.squeeze-dt*4);g.power=Math.min(100,g.power+dt*9);
    for(const f of g.flowers){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=340*dt;f.spin+=dt*8;if(Math.hypot(f.x-g.boss.x,f.y-g.boss.y)<64){f.dead=true;g.hp=Math.max(0,g.hp-12);g.score+=100*level;scoreRef.current=g.score;g.bossHit=now+140;g.camShake=7}}
    g.flowers=g.flowers.filter((f:any)=>!f.dead&&f.x<W+60&&f.y<H);
    if(now-g.lastEnemy>cfg.interval){g.lastEnemy=now;for(let i=0;i<cfg.count;i++){const speed=cfg.minSpeed+Math.random()*(cfg.maxSpeed-cfg.minSpeed),variance=(Math.random()-.5)*(100+level*45);g.enemyShots.push({x:824+Math.random()*25,y:370+Math.random()*55,vx:-speed,vy:-115-level*35+variance,r:8+Math.random()*4,hue:330+Math.random()*28})}}
    for(const s of g.enemyShots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=(360+level*35)*dt;if(now>g.hitUntil&&s.x>p.x-5&&s.x<p.x+p.w+5&&s.y>p.y&&s.y<p.y+p.h){s.dead=true;g.lives--;g.score=Math.max(0,g.score-50);scoreRef.current=g.score;g.hitUntil=now+900;g.camShake=10;setLives(g.lives);setScore(g.score);if(g.lives<=0)setState("lost")}}
    g.enemyShots=g.enemyShots.filter((s:any)=>!s.dead&&s.x>-30&&s.y<H+20);
    g.bonus.t+=dt;if(!g.bonus.taken&&Math.hypot(p.x-g.bonus.x,p.y-g.bonus.y)<62){g.bonus.taken=true;g.score+=250*level;scoreRef.current=g.score;g.power=100}
    if(g.eggplant.visible&&Math.hypot(p.x-g.eggplant.x,p.y-g.eggplant.y)<60){g.eggplant.visible=false;g.eggplant.taken=true;g.flowerStormUntil=now+5000;g.power=100}
    if(g.hp<=0&&!g.finished){g.finished=true;g.score+=500*level;scoreRef.current=g.score;setScore(g.score);setState(level<3?"levelCleared":"won")}
    g.camShake=Math.max(0,g.camShake-dt*30);setBoostMs(Math.max(0,g.flowerStormUntil-now));setScore(Math.floor(g.score));setBossHp(Math.max(0,Math.round(g.hp/(100+(level-1)*20)*100)));setPower(Math.round(g.power));
   }
   const shake=g.camShake?Math.sin(now*.08)*g.camShake:0;c.setTransform(1,0,0,1,shake,0);c.clearRect(-20,0,W+40,H);
   const bg=images.current["bg"+level];if(bg){const parallax=(g.p.x/W-.5)*10;c.drawImage(bg,-10-parallax,0,W+20,H)}else{c.fillStyle=level===2?"#193985":level===3?"#5b247d":"#cb69c9";c.fillRect(-20,0,W+40,H)}
   const veil=c.createLinearGradient(0,0,0,H);veil.addColorStop(0,"rgba(30,15,70,.03)");veil.addColorStop(.72,"rgba(25,14,60,.08)");veil.addColorStop(1,"rgba(18,10,42,.42)");c.fillStyle=veil;c.fillRect(-20,0,W+40,H);
   c.fillStyle=cfg.floor+"eb";c.fillRect(0,ground,W,H-ground);c.fillStyle=cfg.accent;c.fillRect(0,ground,W,12);
   for(const q of platforms){c.fillStyle=cfg.floor+"e8";rounded(c,q.x,q.y,q.w,18,9);c.fillStyle=cfg.accent;rounded(c,q.x,q.y,q.w,8,6)}
   for(const f of g.flowers){if(images.current.flower){c.save();c.translate(f.x,f.y);c.rotate(f.spin);c.drawImage(images.current.flower,-24,-18,48,36);c.restore()}else{c.fillStyle="#ff5fa1";c.beginPath();c.arc(f.x,f.y,10,0,Math.PI*2);c.fill()}}
   for(const s of g.enemyShots){const grad=c.createRadialGradient(s.x-3,s.y-4,1,s.x,s.y,s.r);grad.addColorStop(0,"#fff5d9");grad.addColorStop(.28,`hsl(${s.hue} 100% 72%)`);grad.addColorStop(1,`hsl(${s.hue} 80% 38%)`);c.fillStyle=grad;c.beginPath();c.arc(s.x,s.y,s.r,0,Math.PI*2);c.fill();c.strokeStyle="#ffcf47";c.lineWidth=2;c.stroke()}
   if(!g.bonus.taken){const by=g.bonus.y+Math.sin(g.bonus.t*4)*9;if(images.current.star){c.save();c.translate(g.bonus.x,by);c.rotate(g.bonus.t*.7);c.drawImage(images.current.star,-27,-27,54,54);c.restore()}if(images.current.booA)drawSprite(c,images.current.booA,g.bonus.x-47,by+7,54,58)}
   if(g.eggplant.visible&&images.current.eggplant){const ey=g.eggplant.y+Math.sin(g.eggplant.t*4)*10;c.save();c.translate(g.eggplant.x,ey);c.rotate(Math.sin(g.eggplant.t*3)*.16);c.shadowColor="#caff54";c.shadowBlur=18;c.drawImage(images.current.eggplant,-32,-32,64,64);c.restore()}
   if(images.current.booB)drawPoweredBoo(c,images.current.booB,g.p.x+77,g.p.y+3,g.squeeze,now,now<g.flowerStormUntil);else fallbackBoo(c,g.p.x+72,g.p.y+5,.62);
   if(images.current.hero)drawHero(c,g.p,images.current.hero,g.last<g.hitUntil,now);else fallbackKid(c,g.p,g.last<g.hitUntil);
   if(images.current.boss)drawSprite(c,images.current.boss,g.boss.x,g.boss.y+Math.sin(now*.004)*2,164,164,0,g.last<g.bossHit?0.42:1);else fallbackBoss(c,g.boss.x,g.boss.y,g.last<g.bossHit);
   c.setTransform(1,0,0,1,0,0);raf=requestAnimationFrame(loop);
  };raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)
 },[state,level]);

 const hold=(code:string,on:boolean)=>{keys.current[code]=on};
 const submitScore=async(e:FormEvent)=>{e.preventDefault();if(submitStatus==="saving"||submitStatus==="saved")return;setSubmitStatus("saving");setSubmitMessage("");try{const response=await fetch("/api/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:runId.current,playerName,score,levelReached:level})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"Could not save score");setSubmitStatus("saved");setSubmitMessage("Score saved!");await loadScores()}catch(error){setSubmitStatus("error");setSubmitMessage(error instanceof Error?error.message:"Could not save score")}};
 const title=state==="levelCleared"?"LEVEL COMPLETE":state==="won"?"THE BIG ONE DEFEATED":"TRY AGAIN";
 return <main className="game-shell"><section className="game-card" aria-label="Big Boo B game">
  <header className="hud"><div className="brand-wrap"><div className="brand"><span>BIG</span> BOO B</div><span className="version-badge">version 0.0.10</span></div><div className="boss-meter"><div className="boss-name">LEVEL {level} · {levelData[level-1].name.toUpperCase()}</div><div className="bar"><i style={{width:`${bossHp}%`}}/></div></div><div className="score"><span className="hearts">{"♥".repeat(lives)}{"♡".repeat(3-lives)}</span> ✦ {score.toString().padStart(4,"0")}</div></header>
  <div className="stage-wrap"><canvas ref={canvasRef} width={W} height={H} style={{width:"100%",aspectRatio:`${W}/${H}`}} aria-label={`Level ${level}: ${levelData[level-1].name}`}/>
   <div className="level-pips" aria-label={`Level ${level} of 3`}>{[1,2,3].map(n=><i key={n} className={n<=level?"active":""}/>)}</div>
   {state==="levelIntro"&&<div className="story-layer" onPointerDown={()=>setState("playing")}><section className="story-card"><small>CHAPTER {level} · {levelData[level-1].name.toUpperCase()}</small><div className="story-speaker">HERO</div><p>“{levelData[level-1].story}”</p><button onClick={()=>setState("playing")}>Press any key to begin</button></section></div>}
   {boostMs>0&&<div className="boost"><img src="/effects/eggplant-powerup-v1.png" alt=""/><div><b>FLOWER STORM</b><span><i style={{width:`${boostMs/50}%`}}/></span></div><strong>{(boostMs/1000).toFixed(1)}s</strong></div>}
   <div className="helper"><b>BOO B POWER</b><span>{boostMs>0?"Flower Storm active — press E for a flower burst!":level===1?"Squeeze Boo B to launch flower power.":level===2?"The Big One is faster — keep moving!":"Final level: expect a storm of attacks."}</span></div>
   <div className="power">BOO POWER <span><i style={{width:`${power}%`}}/></span></div>
   {state!=="playing"&&<div className="result"><div className="result-card"><small>{title}</small><h1>{state==="levelCleared"?`${levelData[level-1].name} cleared!`:state==="won"?"All three levels complete!":"The Big One got you!"}</h1><p>{state==="levelCleared"?`Next: ${levelData[level].name}. The attacks will be faster and less predictable.`:state==="won"?"Boo A, Boo B and their hero saved every realm.":"Dodge the glowing eggs and use the platforms."}</p>{state!=="levelCleared"&&submitStatus!=="saved"&&<form className="score-form" onSubmit={submitScore}><label htmlFor="player-name">Add your score to the leaderboard</label><div><input id="player-name" value={playerName} onChange={e=>setPlayerName(e.target.value)} minLength={2} maxLength={18} placeholder="Player name" required/><button type="submit" disabled={submitStatus==="saving"}>{submitStatus==="saving"?"Saving…":"Save score"}</button></div>{submitMessage&&<span className="form-message error">{submitMessage}</span>}</form>}{submitStatus==="saved"&&<p className="saved-score">✓ {submitMessage}</p>}<div className="result-actions"><button onClick={()=>state==="levelCleared"?beginLevel(level+1):beginLevel(1,true)}>{state==="levelCleared"?"Next level":"Play again"}</button>{state!=="levelCleared"&&<button className="secondary" onClick={()=>setBoardOpen(true)}>Leaderboard</button>}</div></div></div>}
   {boardOpen&&<div className="leaderboard-layer"><section className="leaderboard-card" aria-label="Global leaderboard"><button className="close-board" onClick={()=>setBoardOpen(false)} aria-label="Close leaderboard">×</button><small>GLOBAL TOP 10</small><h2>Leaderboard</h2>{leaderboard.length?<ol>{leaderboard.map((entry,index)=><li key={entry.id}><b>{index+1}</b><span>{entry.player_name}<small>Level {entry.level_reached}</small></span><strong>{entry.score.toLocaleString()}</strong></li>)}</ol>:<p>No scores yet. Be the first!</p>}</section></div>}
  </div>
  <footer className="controls"><div className="keys"><span><kbd>←</kbd><kbd>→</kbd> Move</span><span><kbd>Space</kbd> Jump</span><span><kbd>E</kbd> Squeeze Boo B</span></div><div className="footer-actions"><button className="sound" onClick={()=>{setBoardOpen(true);loadScores()}}>Leaderboard</button><button className="sound" onClick={()=>setMuted(!muted)} aria-label={muted?"Turn sound on":"Mute sound"}>{muted?"Sound off":"Sound on"}</button></div></footer>
  <div className="touch" aria-label="Touch controls"><button onPointerDown={()=>hold("ArrowLeft",true)} onPointerUp={()=>hold("ArrowLeft",false)} onPointerLeave={()=>hold("ArrowLeft",false)}>←</button><button onPointerDown={()=>hold("ArrowRight",true)} onPointerUp={()=>hold("ArrowRight",false)} onPointerLeave={()=>hold("ArrowRight",false)}>→</button><button onPointerDown={()=>hold("Space",true)}>↑</button><button className="squeeze" onPointerDown={()=>hold("KeyE",true)} onPointerUp={()=>hold("KeyE",false)}>SQUEEZE</button></div>
 </section></main>
}
