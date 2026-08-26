(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const themes = [
    { name: 'HIVE CORE', accent: '#70ffe1', secondary: '#caff62', hot: '#ff4f9a', label: 'QUEEN REACTOR' },
    { name: 'NEBULA RUN', accent: '#a26fff', secondary: '#ff4f9a', hot: '#70ffe1', label: 'HYPERSPACE RELAY' },
    { name: 'TEMPLE ZERO', accent: '#ffd66c', secondary: '#70ffe1', hot: '#caff62', label: 'STAR GUARDIAN' },
  ];

  class XenoPinball2D {
    constructor(canvas, callbacks = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.callbacks = callbacks;
      this.width = 760;
      this.height = 1120;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.texture = new Image();
      this.texture.src = 'assets/textures/alien-circuit-v1.webp';
      this.active = false;
      this.accumulator = 0;
      this.balls = [];
      this.particles = [];
      this.pulses = [];
      this.shake = 0;
      this.charge = 0;
      this.charging = false;
      this.chargeStarted = 0;
      this.coreHits = 0;
      this.targetBank = 0;
      this.lastFrame = performance.now();
      this.configure(0, {});
    }

    configure(index, profile) {
      this.machineIndex = index;
      this.theme = themes[index] || themes[0];
      this.profile = profile || {};
      const layouts = [
        { bumpers: [[380,290,58],[245,405,48],[515,405,48]], targets: [[205,555],[295,525],[465,525],[555,555]], portal: [380,195] },
        { bumpers: [[270,315,48],[490,315,48],[380,445,58]], targets: [[190,555],[315,530],[445,530],[570,555]], portal: [380,190] },
        { bumpers: [[380,315,62],[245,430,45],[515,430,45],[380,520,38]], targets: [[220,590],[380,565],[540,590]], portal: [380,190] },
      ];
      const layout = layouts[index] || layouts[0];
      this.bumpers = layout.bumpers.map((b, i) => ({ x:b[0], y:b[1], r:b[2], index:i, flash:0, last:0 }));
      this.targets = layout.targets.map((t, i) => ({ x:t[0], y:t[1], r:23, index:i, lit:false, flash:0, last:0 }));
      this.portal = layout.portal;
      this.walls = [
        [68,1034,68,205],[68,205,126,90],[126,90,603,90],[603,90,708,172],[708,172,708,1034],
        [630,255,630,875],[68,715,215,925],[708,715,535,925],[132,736,252,886],[628,736,508,886],
        [118,630,118,760],[642,630,642,760],[118,630,178,585],[642,630,582,585],
      ].map((s, i) => ({ ax:s[0], ay:s[1], bx:s[2], by:s[3], width:i < 5 ? 8 : 6 }));
      this.slings = [{ x:216,y:820,r:39,index:20,last:0 },{ x:544,y:820,r:39,index:21,last:0 }];
      this.flippers = [
        { side:'left', x:272, y:966, length:132, radius:18, rest:.27, active:-.62, angle:.27, previous:.27, angular:0, pressed:false },
        { side:'right', x:488, y:966, length:132, radius:18, rest:Math.PI-.27, active:Math.PI+.62, angle:Math.PI-.27, previous:Math.PI-.27, angular:0, pressed:false },
      ];
    }

    start(index, profile) {
      this.configure(index, profile);
      this.active = true;
      this.accumulator = 0;
      this.balls = [];
      this.particles = [];
      this.pulses = [];
      this.coreHits = 0;
      this.targetBank = 0;
      this.charge = 0;
      this.charging = false;
      this.lastFrame = performance.now();
      this.serveBall();
      this.draw(this.lastFrame);
    }

    stop() {
      this.active = false;
      this.charging = false;
      this.balls = [];
      this.particles = [];
      this.pulses = [];
    }

    serveBall() {
      if (!this.active) return;
      this.balls.push({ x:674, y:988, vx:0, vy:0, r:13, ready:true, alive:true, entered:false, trail:[], lastRail:0, lastRamp:0, lastLane:0 });
      this.callbacks.onReady?.();
    }

    beginLaunch() {
      const ball = this.balls.find((item) => item.ready && item.alive);
      if (!this.active || !ball || this.charging) return false;
      this.charging = true;
      this.chargeStarted = performance.now();
      this.charge = 0;
      this.callbacks.onCharge?.(0);
      return true;
    }

    releaseLaunch() {
      if (!this.active || !this.charging) return false;
      const ball = this.balls.find((item) => item.ready && item.alive);
      this.charging = false;
      if (!ball) return false;
      this.charge = clamp((performance.now() - this.chargeStarted) / 1050, .22, 1);
      ball.ready = false;
      ball.vx = -35 - this.charge * 45;
      ball.vy = -(920 + this.charge * 520);
      this.callbacks.onCharge?.(null);
      this.callbacks.onLaunch?.(Math.round(this.charge * 100));
      this.burst(ball.x, ball.y, this.theme.accent, 22, 1.35);
      this.shake = 7;
      return true;
    }

    setFlipper(side, pressed) {
      const flipper = this.flippers.find((item) => item.side === side);
      if (!this.active || !flipper || flipper.pressed === pressed) return false;
      flipper.pressed = pressed;
      if (pressed) this.callbacks.onFlipper?.();
      return true;
    }

    addMultiball() {
      if (!this.active) return;
      this.balls.push(this.makeLiveBall(320,245,310,-180));
      this.balls.push(this.makeLiveBall(440,245,-310,-180));
      this.pulses.push({ x:380,y:280,r:20,life:1,color:this.theme.hot });
      this.burst(380,280,this.theme.hot,46,2.2);
      this.shake = 16;
    }

    makeLiveBall(x,y,vx,vy) {
      return { x,y,vx,vy,r:13,ready:false,alive:true,entered:true,trail:[],lastRail:0,lastRamp:0,lastLane:0 };
    }

    update(frame, now) {
      if (!this.active) return;
      if (this.charging) {
        this.charge = clamp((now - this.chargeStarted) / 1050, 0, 1);
        this.callbacks.onCharge?.(Math.round(this.charge * 100));
      }
      this.accumulator += Math.min(.035, frame);
      while (this.accumulator >= 1/180) {
        this.step(1/180, now);
        this.accumulator -= 1/180;
      }
      this.updateEffects(frame);
      this.draw(now);
    }

    step(dt, now) {
      for (const flipper of this.flippers) {
        flipper.previous = flipper.angle;
        const target = flipper.pressed ? flipper.active : flipper.rest;
        const max = 18.5 * dt;
        flipper.angle += clamp(target - flipper.angle, -max, max);
        flipper.angular = (flipper.angle - flipper.previous) / dt;
      }
      for (const ball of [...this.balls]) {
        if (!ball.alive || ball.ready) continue;
        ball.trail.unshift({x:ball.x,y:ball.y});
        if (ball.trail.length > 13) ball.trail.pop();
        ball.vy += (315 + this.machineIndex * 18) * dt;
        const drag = Math.pow(.9982, dt * 60);
        ball.vx *= drag; ball.vy *= drag;
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > 1550) { ball.vx *= 1550/speed; ball.vy *= 1550/speed; }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;

        let railHit = false;
        for (const wall of this.walls) if (this.collideSegment(ball, wall, .78)) railHit = true;
        if (!ball.entered && ball.x > 615 && ball.y < 245) {
          ball.entered = true;
          ball.x = Math.min(ball.x, 625);
          ball.vx = -360 - this.charge * 90;
          ball.vy = Math.max(150, Math.abs(ball.vy) * .32);
          this.callbacks.onRamp?.('ORBITAL ENTRY');
          this.pulses.push({x:628,y:195,r:22,life:1,color:this.theme.accent});
        }
        if (railHit && now - ball.lastRail > 90) { ball.lastRail = now; this.callbacks.onRail?.(); }
        for (const bumper of this.bumpers) this.collideCircle(ball, bumper, now, false);
        for (const sling of this.slings) this.collideCircle(ball, sling, now, true);
        for (const target of this.targets) this.collideTarget(ball, target, now);
        for (const flipper of this.flippers) this.collideFlipper(ball, flipper);

        if (ball.y < 205 && ball.entered && now - ball.lastLane > 900) {
          ball.lastLane = now;
          this.callbacks.onScore?.(450, 'STAR LANE');
        }
        if (ball.y < 640 && ball.y > 500 && (ball.x < 155 || ball.x > 605) && now - ball.lastRamp > 850) {
          ball.lastRamp = now;
          this.callbacks.onRamp?.(ball.x < 380 ? 'LEFT WORMHOLE' : 'RIGHT WORMHOLE');
        }
        if (ball.x < 46) { ball.x = 46; ball.vx = Math.abs(ball.vx) * .82; }
        if (ball.x > 724) { ball.x = 724; ball.vx = -Math.abs(ball.vx) * .82; }
        if (ball.y < 48) { ball.y = 48; ball.vy = Math.abs(ball.vy) * .8; }
        if (ball.y > 1100) this.drain(ball);
      }
    }

    collideSegment(ball, segment, restitution) {
      const dx = segment.bx-segment.ax, dy = segment.by-segment.ay;
      const length2 = dx*dx+dy*dy;
      const t = length2 ? clamp(((ball.x-segment.ax)*dx+(ball.y-segment.ay)*dy)/length2,0,1) : 0;
      const px = segment.ax+t*dx, py = segment.ay+t*dy;
      const ox = ball.x-px, oy = ball.y-py, distance = Math.hypot(ox,oy), limit = ball.r+segment.width;
      if (distance >= limit) return false;
      const nx = distance > .001 ? ox/distance : -dy/Math.sqrt(length2||1);
      const ny = distance > .001 ? oy/distance : dx/Math.sqrt(length2||1);
      const push = limit-distance; ball.x += nx*push; ball.y += ny*push;
      const dot = ball.vx*nx+ball.vy*ny;
      if (dot < 0) { ball.vx -= (1+restitution)*dot*nx; ball.vy -= (1+restitution)*dot*ny; }
      return true;
    }

    collideCircle(ball, object, now, sling) {
      const dx=ball.x-object.x,dy=ball.y-object.y,distance=Math.hypot(dx,dy),limit=ball.r+object.r;
      if (distance >= limit) return;
      const nx=distance>.001?dx/distance:0,ny=distance>.001?dy/distance:-1,push=limit-distance;
      ball.x+=nx*push;ball.y+=ny*push;
      const dot=ball.vx*nx+ball.vy*ny;
      if(dot<0){ball.vx-=1.9*dot*nx;ball.vy-=1.9*dot*ny}
      const kick=sling?430:505;ball.vx+=nx*kick;ball.vy+=ny*kick;
      if(now-object.last>150){object.last=now;object.flash=1;this.callbacks.onBumper?.(sling);this.callbacks.onScore?.(sling?650:1000,sling?'PLASMA SLING':'BIO BUMPER');this.burst(object.x,object.y,object.index%2?this.theme.secondary:this.theme.accent,sling?16:24,sling?1.1:1.5);this.pulses.push({x:object.x,y:object.y,r:object.r,life:1,color:object.index%2?this.theme.secondary:this.theme.accent});this.shake=Math.max(this.shake,sling?4:8);if(!sling&&++this.coreHits>=8){this.coreHits=0;this.callbacks.onCoreCharged?.()}}
    }

    collideTarget(ball,target,now){
      const dx=ball.x-target.x,dy=ball.y-target.y,distance=Math.hypot(dx,dy),limit=ball.r+target.r;
      if(distance>=limit)return;
      const nx=distance>.001?dx/distance:0,ny=distance>.001?dy/distance:-1,push=limit-distance;ball.x+=nx*push;ball.y+=ny*push;
      const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=1.72*dot*nx;ball.vy-=1.72*dot*ny}ball.vx+=nx*125;ball.vy+=ny*125;
      if(now-target.last>320){target.last=now;target.flash=1;this.callbacks.onTarget?.();if(!target.lit){target.lit=true;this.targetBank++;this.callbacks.onScore?.(800,'ALIEN SEAL');this.burst(target.x,target.y,this.theme.hot,14,1.1);if(this.targetBank>=this.targets.length){this.targetBank=0;this.callbacks.onBankComplete?.();setTimeout(()=>this.targets.forEach(item=>item.lit=false),760)}}}
    }

    collideFlipper(ball,flipper){
      const dx=Math.cos(flipper.angle),dy=Math.sin(flipper.angle),bx=flipper.x+dx*flipper.length,by=flipper.y+dy*flipper.length;
      const segment={ax:flipper.x,ay:flipper.y,bx,by,width:flipper.radius};
      const sx=segment.bx-segment.ax,sy=segment.by-segment.ay,length2=sx*sx+sy*sy,t=clamp(((ball.x-segment.ax)*sx+(ball.y-segment.ay)*sy)/length2,0,1),px=segment.ax+t*sx,py=segment.ay+t*sy,ox=ball.x-px,oy=ball.y-py,distance=Math.hypot(ox,oy),limit=ball.r+flipper.radius;
      if(distance>=limit)return;
      const nx=distance>.001?ox/distance:0,ny=distance>.001?oy/distance:-1,push=limit-distance;ball.x+=nx*push;ball.y+=ny*push;
      const rx=px-flipper.x,ry=py-flipper.y,svx=-flipper.angular*ry,svy=flipper.angular*rx,rvx=ball.vx-svx,rvy=ball.vy-svy,dot=rvx*nx+rvy*ny;
      if(dot<0){ball.vx=rvx-1.88*dot*nx+svx;ball.vy=rvy-1.88*dot*ny+svy}
      if(flipper.pressed){ball.vy-=260;ball.vx+=flipper.side==='left'?85:-85}
    }

    drain(ball){
      if(!ball.alive)return;ball.alive=false;this.burst(ball.x,1065,this.theme.hot,20,1.4);this.balls=this.balls.filter(item=>item.alive);this.callbacks.onDrain?.(this.balls.length);
    }

    burst(x,y,color,count=18,power=1){
      for(let i=0;i<count;i++){const angle=Math.random()*TAU,speed=(70+Math.random()*260)*power;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.45+Math.random()*.55,max:1,size:2+Math.random()*5,color})}
    }

    updateEffects(dt){
      this.shake=Math.max(0,this.shake-dt*34);
      for(const item of [...this.particles]){item.life-=dt;item.x+=item.vx*dt;item.y+=item.vy*dt;item.vx*=Math.pow(.985,dt*60);item.vy*=Math.pow(.985,dt*60);if(item.life<=0)this.particles.splice(this.particles.indexOf(item),1)}
      for(const pulse of [...this.pulses]){pulse.life-=dt;pulse.r+=dt*145;if(pulse.life<=0)this.pulses.splice(this.pulses.indexOf(pulse),1)}
      [...this.bumpers,...this.targets].forEach(item=>item.flash=Math.max(0,item.flash-dt*4.8));
    }

    roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

    glowStroke(color,width=4,blur=18){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.shadowColor=color;c.shadowBlur=blur}

    draw(now){
      const c=this.ctx,t=now*.001,shakeX=(Math.random()-.5)*this.shake,shakeY=(Math.random()-.5)*this.shake;
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.width,this.height);c.save();c.translate(shakeX,shakeY);
      const bg=c.createLinearGradient(0,0,0,this.height);bg.addColorStop(0,'#10142c');bg.addColorStop(.45,'#071b22');bg.addColorStop(1,'#03070e');c.fillStyle=bg;c.fillRect(0,0,this.width,this.height);
      if(this.texture.complete&&this.texture.naturalWidth){c.globalAlpha=.32;c.drawImage(this.texture,0,0,this.width,this.height);c.globalAlpha=1;c.fillStyle='rgba(2,9,16,.42)';c.fillRect(0,0,this.width,this.height)}
      c.fillStyle='#040812';this.roundRect(c,20,15,720,1090,48);c.fill();this.glowStroke(this.theme.accent,5,26);c.stroke();
      const glass=c.createLinearGradient(0,70,0,1060);glass.addColorStop(0,'rgba(17,30,49,.9)');glass.addColorStop(.5,'rgba(5,23,27,.82)');glass.addColorStop(1,'rgba(8,9,24,.94)');c.fillStyle=glass;this.roundRect(c,42,42,676,1035,38);c.fill();

      c.save();this.roundRect(c,42,42,676,1035,38);c.clip();
      c.strokeStyle='rgba(112,255,225,.08)';c.lineWidth=1;for(let y=80;y<1060;y+=42){c.beginPath();c.moveTo(58,y);c.lineTo(704,y+Math.sin(y*.05+t)*4);c.stroke()}for(let x=60;x<710;x+=54){c.beginPath();c.moveTo(x,60);c.lineTo(x+Math.sin(x*.04+t)*8,1055);c.stroke()}
      const scanY=65+(t*95%980);const scan=c.createLinearGradient(0,scanY-20,0,scanY+20);scan.addColorStop(0,'transparent');scan.addColorStop(.5,this.theme.accent+'55');scan.addColorStop(1,'transparent');c.fillStyle=scan;c.fillRect(45,scanY-20,670,40);

      c.textAlign='center';c.fillStyle='#eaffff';c.font='900 26px Segoe UI, sans-serif';c.letterSpacing='5px';c.fillText(this.theme.name,380,78);c.font='700 12px Segoe UI, sans-serif';c.fillStyle=this.theme.secondary;c.fillText(this.theme.label+' // DANPC ORIGINAL',380,101);

      this.drawThemeArt(c,t);
      this.drawRamps(c,t);
      this.drawRails(c);
      this.drawTargets(c,t);
      this.drawBumpers(c,t);
      this.drawSlings(c,t);
      this.drawFlippers(c);
      this.drawLauncher(c,t);
      this.drawBalls(c);
      this.drawEffects(c);
      c.restore();

      c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=2;this.roundRect(c,31,26,698,1068,42);c.stroke();
      c.restore();
    }

    drawThemeArt(c,t){
      const [px,py]=this.portal;
      if(this.machineIndex===0){
        c.save();c.translate(px,py);c.rotate(Math.sin(t*.7)*.04);c.fillStyle='#173b38';c.shadowColor=this.theme.accent;c.shadowBlur=22;c.beginPath();c.ellipse(0,0,100,65,0,0,TAU);c.fill();c.fillStyle='#07100f';c.beginPath();c.ellipse(-38,-3,30,16,-.14,0,TAU);c.ellipse(38,-3,30,16,.14,0,TAU);c.fill();c.fillStyle=this.theme.hot;c.beginPath();c.ellipse(-38,-3,7,14,0,0,TAU);c.ellipse(38,-3,7,14,0,0,TAU);c.fill();c.restore();
      }else if(this.machineIndex===1){
        for(let i=0;i<4;i++){c.beginPath();c.strokeStyle=i%2?this.theme.secondary:this.theme.accent;c.globalAlpha=.2+i*.16;c.lineWidth=4;c.arc(px,py,38+i*19,t*(i%2?-.7:.55)+i,TAU*.72+t*(i%2?-.7:.55)+i);c.stroke()}c.globalAlpha=1;
      }else{
        c.save();c.translate(px,py+28);for(let i=0;i<4;i++){c.fillStyle=i%2?'#253528':'#4a3a22';c.strokeStyle=i%2?this.theme.secondary:this.theme.accent;c.lineWidth=3;c.beginPath();c.moveTo(-105+i*22,45-i*25);c.lineTo(105-i*22,45-i*25);c.lineTo(70-i*18,15-i*25);c.lineTo(-70+i*18,15-i*25);c.closePath();c.fill();c.stroke()}c.restore();
      }
    }

    drawRamps(c,t){
      const drawRamp=(left,color)=>{c.save();c.beginPath();const x=left?118:642;c.moveTo(x,640);c.bezierCurveTo(left?70:690,480,left?120:640,300,left?205:555,205);this.glowStroke(color,12,16);c.globalAlpha=.38;c.stroke();c.lineWidth=3;c.globalAlpha=.85;c.stroke();for(let i=0;i<7;i++){const y=650-i*64;c.fillStyle=i%2?color:this.theme.hot;c.globalAlpha=.45+.35*Math.sin(t*3+i);c.fillRect(left?91:655,y,22,5)}c.restore()};drawRamp(true,this.theme.accent);drawRamp(false,this.theme.secondary);
    }

    drawRails(c){
      c.lineCap='round';for(const wall of this.walls){c.beginPath();c.moveTo(wall.ax,wall.ay);c.lineTo(wall.bx,wall.by);this.glowStroke(wall===this.walls[4]?this.theme.secondary:this.theme.accent,wall.width,12);c.globalAlpha=.62;c.stroke()}c.globalAlpha=1;c.lineCap='butt';
    }

    drawTargets(c,t){
      for(const target of this.targets){c.save();c.translate(target.x,target.y);const pulse=1+target.flash*.24;c.scale(pulse,pulse);c.fillStyle=target.lit?'#fff7bd':'#10192a';c.strokeStyle=target.lit?this.theme.hot:this.theme.accent;c.shadowColor=target.lit?this.theme.hot:this.theme.accent;c.shadowBlur=target.lit?25:9;c.lineWidth=4;this.roundRect(c,-20,-27,40,54,8);c.fill();c.stroke();c.fillStyle=target.lit?this.theme.hot:'#6f8d92';c.font='900 16px monospace';c.textAlign='center';c.fillText(String(target.index+1),0,6);c.restore()}
    }

    drawBumpers(c,t){
      for(const bumper of this.bumpers){c.save();c.translate(bumper.x,bumper.y);const scale=1+bumper.flash*.2;c.scale(scale,scale);const g=c.createRadialGradient(-bumper.r*.28,-bumper.r*.32,5,0,0,bumper.r);g.addColorStop(0,'#fff');g.addColorStop(.2,bumper.index%2?this.theme.secondary:this.theme.accent);g.addColorStop(.57,'#183a42');g.addColorStop(1,'#050812');c.fillStyle=g;c.shadowColor=bumper.index%2?this.theme.secondary:this.theme.accent;c.shadowBlur=20+bumper.flash*30;c.beginPath();c.arc(0,0,bumper.r,0,TAU);c.fill();c.lineWidth=6;c.strokeStyle=bumper.index%2?this.theme.secondary:this.theme.accent;c.stroke();c.rotate(t*(bumper.index%2?-.9:.7));c.setLineDash([14,10]);c.lineWidth=3;c.beginPath();c.arc(0,0,bumper.r+12,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle='#020407';c.beginPath();c.ellipse(0,2,bumper.r*.45,bumper.r*.22,0,0,TAU);c.fill();c.fillStyle=this.theme.hot;c.beginPath();c.ellipse(0,2,bumper.r*.1,bumper.r*.21,0,0,TAU);c.fill();c.restore()}
    }

    drawSlings(c,t){for(const sling of this.slings){c.save();c.translate(sling.x,sling.y);c.rotate(sling.index===20?-.25:.25);c.fillStyle='rgba(112,255,225,.18)';c.strokeStyle=sling.index===20?this.theme.accent:this.theme.secondary;c.shadowColor=c.strokeStyle;c.shadowBlur=18;c.lineWidth=5;c.beginPath();c.moveTo(sling.index===20?-42:42,-46);c.lineTo(sling.index===20?48:-48,15);c.lineTo(sling.index===20?-15:15,49);c.closePath();c.fill();c.stroke();c.restore()}}

    drawFlippers(c){
      for(const flipper of this.flippers){c.save();c.translate(flipper.x,flipper.y);c.rotate(flipper.angle);const gradient=c.createLinearGradient(0,-18,flipper.length,18);gradient.addColorStop(0,'#f3ffff');gradient.addColorStop(.22,flipper.side==='left'?this.theme.accent:this.theme.secondary);gradient.addColorStop(1,'#302060');c.fillStyle=gradient;c.shadowColor=flipper.side==='left'?this.theme.accent:this.theme.secondary;c.shadowBlur=20;c.beginPath();c.moveTo(0,-flipper.radius);c.lineTo(flipper.length-flipper.radius,-12);c.arc(flipper.length-flipper.radius,0,12,-Math.PI/2,Math.PI/2);c.lineTo(0,flipper.radius);c.arc(0,0,flipper.radius,Math.PI/2,Math.PI*1.5);c.fill();c.strokeStyle='#dffff7';c.lineWidth=3;c.stroke();c.restore()}
    }

    drawLauncher(c,t){
      c.save();c.fillStyle='rgba(5,10,20,.7)';c.strokeStyle=this.theme.secondary;c.lineWidth=3;this.roundRect(c,640,850,66,190,28);c.fill();c.stroke();const pull=this.charging?this.charge*92:0;c.strokeStyle=this.theme.accent;c.lineWidth=5;c.beginPath();for(let y=0;y<8;y++){const yy=913+y*12+pull*.45;c.lineTo(672+(y%2?15:-15),yy)}c.stroke();c.fillStyle=this.theme.secondary;c.shadowColor=this.theme.secondary;c.shadowBlur=18;c.beginPath();c.arc(672,1010+pull*.18,18,0,TAU);c.fill();c.fillStyle='#cfeae8';c.font='900 10px monospace';c.textAlign='center';c.fillText(this.charging?`${Math.round(this.charge*100)}%`:'PLASMA',672,892);c.restore();
    }

    drawBalls(c){
      for(const ball of this.balls){for(let i=ball.trail.length-1;i>=0;i--){const point=ball.trail[i],alpha=(1-i/ball.trail.length)*.18;c.fillStyle=this.theme.accent;c.globalAlpha=alpha;c.beginPath();c.arc(point.x,point.y,ball.r*(1-i/ball.trail.length)*.7,0,TAU);c.fill()}c.globalAlpha=1;const g=c.createRadialGradient(ball.x-5,ball.y-6,2,ball.x,ball.y,ball.r);g.addColorStop(0,'#fff');g.addColorStop(.28,'#d8ffff');g.addColorStop(.62,'#7c9eaa');g.addColorStop(1,'#172431');c.fillStyle=g;c.shadowColor=this.theme.accent;c.shadowBlur=ball.ready?22:12;c.beginPath();c.arc(ball.x,ball.y,ball.r,0,TAU);c.fill();c.strokeStyle='#eaffff';c.lineWidth=1.5;c.stroke()}
    }

    drawEffects(c){for(const pulse of this.pulses){c.globalAlpha=pulse.life;c.strokeStyle=pulse.color;c.lineWidth=4;c.shadowColor=pulse.color;c.shadowBlur=18;c.beginPath();c.arc(pulse.x,pulse.y,pulse.r,0,TAU);c.stroke()}for(const p of this.particles){c.globalAlpha=clamp(p.life,0,1);c.fillStyle=p.color;c.shadowColor=p.color;c.shadowBlur=10;c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)}c.globalAlpha=1;c.shadowBlur=0}
  }

  window.XenoPinball2D = XenoPinball2D;
})();
