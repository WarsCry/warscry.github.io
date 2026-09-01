(() => {
  'use strict';

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  class XenoAirHockey {
    constructor(canvas, scene, camera, table, ui, callbacks = {}) {
      this.canvas = canvas;
      this.scene = scene;
      this.camera = camera;
      this.table = table;
      this.ui = ui;
      this.callbacks = callbacks;
      this.active = false;
      this.finished = false;
      this.playerScore = 0;
      this.cpuScore = 0;
      this.startedAt = 0;
      this.serveAt = 0;
      this.serveDirection = -1;
      this.cornerSince = 0;
      this.cornerReleaseAt = 0;
      this.lastPuckX = 0;
      this.lastPuckZ = 0;
      this.pointerId = null;
      this.keys = { left:false, right:false, up:false, down:false };
      this.player = { x:0, z:2.72, vx:0, vz:0, targetX:0, targetZ:2.72, mesh:table.player };
      this.cpu = { x:0, z:-2.72, vx:0, vz:0, mesh:table.cpu };
      this.puck = { x:0, z:0, vx:0, vz:0, mesh:table.puck, lastHit:0 };
      this.onPointerDown = event => {
        if (!this.active) return;
        event.preventDefault();
        this.pointerId = event.pointerId;
        this.canvas.setPointerCapture?.(event.pointerId);
        this.setPointerTarget();
      };
      this.onPointerMove = event => {
        if (!this.active || this.pointerId !== event.pointerId) return;
        event.preventDefault();
        this.setPointerTarget();
      };
      this.onPointerUp = event => {
        if (this.pointerId !== event.pointerId) return;
        event.preventDefault();
        this.pointerId = null;
      };
      canvas.addEventListener('pointerdown', this.onPointerDown, { passive:false });
      canvas.addEventListener('pointermove', this.onPointerMove, { passive:false });
      canvas.addEventListener('pointerup', this.onPointerUp, { passive:false });
      canvas.addEventListener('pointercancel', this.onPointerUp, { passive:false });
    }

    start() {
      this.active = true;
      this.restart();
    }

    restart() {
      this.finished = false;
      this.playerScore = 0;
      this.cpuScore = 0;
      this.startedAt = performance.now();
      this.player.x = this.player.targetX = 0;
      this.player.z = this.player.targetZ = 2.72;
      this.cpu.x = 0;
      this.cpu.z = -2.72;
      this.player.vx = this.player.vz = this.cpu.vx = this.cpu.vz = 0;
      this.cornerSince = 0;
      this.cornerReleaseAt = 0;
      this.lastPuckX = 0;
      this.lastPuckZ = 0;
      this.positionPaddles();
      this.updateScore();
      this.ui.status.textContent = 'FIRST TO 7';
      this.ui.prompt.textContent = 'DRAG YOUR PINK PADDLE · WASD / ARROWS';
      this.serve(-1, 1050);
    }

    stop() {
      this.active = false;
      this.pointerId = null;
      Object.keys(this.keys).forEach(key => this.keys[key] = false);
    }

    setKey(code, pressed) {
      if (!this.active) return;
      if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = pressed;
      if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = pressed;
      if (code === 'ArrowUp' || code === 'KeyW') this.keys.up = pressed;
      if (code === 'ArrowDown' || code === 'KeyS') this.keys.down = pressed;
    }

    setPointerTarget() {
      const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, BABYLON.Matrix.Identity(), this.camera, false);
      if (!ray || Math.abs(ray.direction.y) < .0001) return;
      const distance = (1.68 - ray.origin.y) / ray.direction.y;
      if (distance <= 0) return;
      const point = ray.origin.add(ray.direction.scale(distance));
      this.player.targetX = clamp(point.x - this.table.x, -1.82, 1.82);
      this.player.targetZ = clamp(point.z - this.table.z, .3, 2.88);
    }

    positionPaddles() {
      this.player.mesh.position.x = this.player.x;
      this.player.mesh.position.z = this.player.z;
      this.cpu.mesh.position.x = this.cpu.x;
      this.cpu.mesh.position.z = this.cpu.z;
    }

    moveBody(body, targetX, targetZ, speed, dt, xLimit, zMinimum, zMaximum) {
      const oldX = body.x, oldZ = body.z, dx = targetX - body.x, dz = targetZ - body.z, distance = Math.hypot(dx, dz);
      if (distance > .001) {
        const step = Math.min(distance, speed * dt);
        body.x += dx / distance * step;
        body.z += dz / distance * step;
      }
      body.x = clamp(body.x, -xLimit, xLimit);
      body.z = clamp(body.z, zMinimum, zMaximum);
      body.vx = dt ? (body.x - oldX) / dt : 0;
      body.vz = dt ? (body.z - oldZ) / dt : 0;
    }

    update(dt, now) {
      if (!this.active) return;
      const keyboardSpeed = 5.9;
      if (this.keys.left) this.player.targetX -= keyboardSpeed * dt;
      if (this.keys.right) this.player.targetX += keyboardSpeed * dt;
      if (this.keys.up) this.player.targetZ -= keyboardSpeed * dt;
      if (this.keys.down) this.player.targetZ += keyboardSpeed * dt;
      this.player.targetX = clamp(this.player.targetX, -1.82, 1.82);
      this.player.targetZ = clamp(this.player.targetZ, .3, 2.88);
      this.moveBody(this.player, this.player.targetX, this.player.targetZ, 11.5, dt, 1.82, .3, 2.88);

      let cpuTargetX = Math.sin(now * .0011) * .32, cpuTargetZ = -2.72;
      if (!this.finished && this.puck.z < .65) {
        cpuTargetX = clamp(this.puck.x + this.puck.vx * .1, -1.82, 1.82);
        cpuTargetZ = clamp(this.puck.z - .62, -2.88, -.3);
        if (this.puck.z < -2.45) {
          cpuTargetX = clamp(this.puck.x + (this.puck.x >= 0 ? -.7 : .7), -1.55, 1.55);
          cpuTargetZ = -2.05;
        }
        if (this.puck.vz > 1.2) cpuTargetZ = -1.5;
      }
      const cpuSpeed = 6.65 + Math.max(0, this.playerScore - this.cpuScore) * .22;
      this.moveBody(this.cpu, cpuTargetX, cpuTargetZ, cpuSpeed, dt, 1.82, -2.88, -.3);
      this.positionPaddles();

      if (this.finished) {
        this.puck.mesh.position.set(this.puck.x, 1.67, this.puck.z);
        return;
      }
      if (now < this.serveAt) {
        this.puck.mesh.position.set(this.puck.x, 1.67, this.puck.z);
        return;
      }
      if (!this.puck.vx && !this.puck.vz) {
        this.puck.vx = (Math.random() - .5) * 2.6;
        this.puck.vz = this.serveDirection * (4.8 + Math.random() * .7);
        this.ui.prompt.textContent = 'MATCH LIVE · DRAG TO STRIKE';
      }

      const speed = Math.hypot(this.puck.vx, this.puck.vz), steps = Math.max(1, Math.ceil(speed * dt / .15)), step = dt / steps;
      for (let index = 0; index < steps; index++) {
        this.puck.x += this.puck.vx * step;
        this.puck.z += this.puck.vz * step;
        const drag = Math.pow(.9975, step * 60);
        this.puck.vx *= drag;
        this.puck.vz *= drag;
        if (this.puck.x < -2.38) { this.puck.x = -2.38; this.puck.vx = Math.abs(this.puck.vx); this.callbacks.sound?.('hockeyRail'); }
        if (this.puck.x > 2.38) { this.puck.x = 2.38; this.puck.vx = -Math.abs(this.puck.vx); this.callbacks.sound?.('hockeyRail'); }
        this.hitPaddle(this.player, now);
        this.hitPaddle(this.cpu, now);
        if (this.puck.z > 3.5) {
          if (Math.abs(this.puck.x) < .91) { this.goal(false); break; }
          this.puck.z = 3.5; this.puck.vz = -Math.abs(this.puck.vz); this.callbacks.sound?.('hockeyRail');
        }
        if (this.puck.z < -3.5) {
          if (Math.abs(this.puck.x) < .91) { this.goal(true); break; }
          this.puck.z = -3.5; this.puck.vz = Math.abs(this.puck.vz); this.callbacks.sound?.('hockeyRail');
        }
      }
      const maximum = 12.5, currentSpeed = Math.hypot(this.puck.vx, this.puck.vz);
      if (currentSpeed > maximum) { this.puck.vx *= maximum / currentSpeed; this.puck.vz *= maximum / currentSpeed; }
      this.releaseCornerIfNeeded(now);
      this.puck.mesh.position.set(this.puck.x, 1.67, this.puck.z);
      this.puck.mesh.rotation.y += dt * Math.hypot(this.puck.vx, this.puck.vz) * .7;
    }

    releaseCornerIfNeeded(now) {
      const inCorner = Math.abs(this.puck.x) > 2.04 && Math.abs(this.puck.z) > 3.08;
      const defender = this.puck.z < 0 ? this.cpu : this.player;
      const endTrap = Math.abs(this.puck.z) > 2.95 && Math.hypot(this.puck.x - defender.x, this.puck.z - defender.z) < .92;
      const movement = Math.hypot(this.puck.x - this.lastPuckX, this.puck.z - this.lastPuckZ);
      const speed = Math.hypot(this.puck.vx, this.puck.vz);
      const stalled = movement < .012 || speed < .65;
      this.lastPuckX = this.puck.x;
      this.lastPuckZ = this.puck.z;
      if (!inCorner && !endTrap && !stalled) { this.cornerSince = 0; return; }
      if (!this.cornerSince) this.cornerSince = now;
      if (now - this.cornerSince < (inCorner || endTrap ? 360 : 720) || now - this.cornerReleaseAt < 900) return;
      const side = Math.abs(this.puck.x) > .45 ? Math.sign(this.puck.x) : (Math.random() < .5 ? -1 : 1);
      const end = Math.sign(this.puck.z) || 1;
      this.puck.x = clamp(this.puck.x - side * .3, -1.92, 1.92);
      this.puck.z = clamp(this.puck.z - end * .32, -2.96, 2.96);
      this.puck.vx = -side * (4.1 + Math.random() * 1.2);
      this.puck.vz = -end * (3.2 + Math.random() * 1.1);
      this.cornerSince = 0;
      this.cornerReleaseAt = now;
      this.lastPuckX = this.puck.x;
      this.lastPuckZ = this.puck.z;
      this.ui.prompt.textContent = inCorner ? 'CORNER RELEASE · PLAY ON' : 'PUCK RELEASE · PLAY ON';
      this.callbacks.sound?.('hockeyRail');
    }

    hitPaddle(paddle, now) {
      const dx = this.puck.x - paddle.x, dz = this.puck.z - paddle.z, distance = Math.hypot(dx, dz), minimum = .77;
      if (distance >= minimum) return;
      let nx = dx / (distance || 1), nz = dz / (distance || 1);
      if (paddle === this.cpu && this.puck.z < -2.5) nz = Math.max(.58, Math.abs(nz));
      if (paddle === this.player && this.puck.z > 2.5) nz = -Math.max(.58, Math.abs(nz));
      const normalLength = Math.hypot(nx, nz) || 1; nx /= normalLength; nz /= normalLength;
      const overlap = minimum - distance;
      this.puck.x += nx * overlap;
      this.puck.z += nz * overlap;
      const approach = this.puck.vx * nx + this.puck.vz * nz;
      const strike = Math.max(5.2, Math.hypot(this.puck.vx, this.puck.vz) - Math.min(0, approach) + Math.hypot(paddle.vx, paddle.vz) * .62);
      this.puck.vx = nx * strike + paddle.vx * .46;
      this.puck.vz = nz * strike + paddle.vz * .46;
      if (now - this.puck.lastHit > 55) { this.puck.lastHit = now; this.callbacks.sound?.('hockeyHit'); }
    }

    goal(playerScored) {
      if (this.finished || performance.now() < this.serveAt) return;
      if (playerScored) this.playerScore++; else this.cpuScore++;
      this.updateScore();
      this.callbacks.sound?.(playerScored ? 'hockeyGoal' : 'hockeyLost');
      if (this.playerScore >= 7 || this.cpuScore >= 7) {
        this.finished = true;
        this.puck.vx = this.puck.vz = 0;
        this.puck.x = 0; this.puck.z = 0;
        const playerWon = this.playerScore > this.cpuScore;
        this.ui.status.textContent = playerWon ? 'YOU WIN!' : 'CPU WINS';
        this.ui.prompt.textContent = playerWon ? 'EARTH-SIDE CHAMPION · PLAY AGAIN?' : 'THE ALIEN CALLS FOR A REMATCH';
        this.callbacks.finish?.(playerWon, this.playerScore, this.cpuScore, performance.now() - this.startedAt);
        return;
      }
      this.ui.status.textContent = playerScored ? 'GOAL — YOU!' : 'ALIEN CPU SCORES';
      this.ui.prompt.textContent = `NEXT FACE-OFF · ${this.playerScore}–${this.cpuScore}`;
      this.serve(playerScored ? 1 : -1, 1150);
    }

    serve(direction, delay) {
      this.serveDirection = direction;
      this.serveAt = performance.now() + delay;
      this.cornerSince = 0;
      this.lastPuckX = 0;
      this.lastPuckZ = 0;
      this.puck.x = 0; this.puck.z = 0; this.puck.vx = this.puck.vz = 0;
      this.puck.mesh.position.set(0, 1.67, 0);
    }

    updateScore() {
      this.ui.player.textContent = this.playerScore;
      this.ui.cpu.textContent = this.cpuScore;
    }
  }

  window.XenoAirHockey = XenoAirHockey;
})();
