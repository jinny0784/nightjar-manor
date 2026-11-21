// Nightjar — the guard. One state machine, four moods:
//
//   patrol      walk the waypoints, pausing at each, cone sweeping ahead
//   suspicious  something caught the eye — stop, stare, detection climbing
//   investigate walk to a noise (or a last-seen spot) and look around
//   chase       the player is made — run them down, call it out
//
// Detection is a meter, not a switch: it fills while the player stands
// in the cone (faster up close, faster in lamplight, slower in shadow
// and while sneaking) and drains when the player slips out of sight.

// Move a circle (entity e with x, y) by (dx, dy) with axis-separated
// sliding against solid tiles. Shared by guards and the player.
function slideMove(floor, e, dx, dy, r) {
  const nx = e.x + dx;
  if (!circleHitsWall(floor, nx, e.y, r)) e.x = nx;
  const ny = e.y + dy;
  if (!circleHitsWall(floor, e.x, ny, r)) e.y = ny;
}

function circleHitsWall(floor, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isBlocked(floor, tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
    }
  }
  return false;
}

class Guard {
  constructor(def, id) {
    this.id = id;
    this.waypoints = def.waypoints.map((w) => tileCenter(w[0], w[1]));
    this.pause = def.pause || 1.2;
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.angle = Math.PI / 2;
    this.state = 'patrol';
    this.detection = 0;
    this.waypointIndex = 1 % this.waypoints.length;
    this.pauseTimer = 0;
    this.lookTimer = 0;
    this.loseTimer = 0;
    this.investigateTarget = null;
    this.lastSeen = null;
    this.stepTimer = 0;
    this.speed = 78;
    this.chaseSpeed = 205;
    this.coneRange = 272;
    this.coneHalf = 0.62;
    this.wasSpotted = false;
  }

  seesPlayer(floor, player) {
    return inVisionCone(
      floor, this.x, this.y, this.angle, this.coneHalf, this.coneRange,
      player.x, player.y,
    );
  }

  hearNoise(x, y, radius) {
    if (this.state === 'chase') return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d > radius) return;
    if (this.state === 'investigate' && this.investigateTarget) {
      const old = Math.hypot(this.investigateTarget.x - this.x, this.investigateTarget.y - this.y);
      if (old < d) return; // already chasing a nearer sound
    }
    this.investigateTarget = { x, y };
    if (this.state !== 'investigate') {
      this.state = 'investigate';
      this.lookTimer = 0;
    }
    if (this.detection < 0.35) this.detection = 0.35;
  }

  update(dt, game) {
    const floor = game.floor;
    const player = game.player;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const sees = this.seesPlayer(floor, player);

    // ---- detection meter ----
    if (sees) {
      const distFactor = 1.7 - dist / this.coneRange;
      const light = lightFactorAt(floor, player.x, player.y);
      const sneak = player.sneaking ? 0.55 : 1;
      this.detection += 1.15 * Math.max(0.35, distFactor) * light * sneak * dt;
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
    } else {
      this.detection = Math.max(0, this.detection - 0.45 * dt);
      if (this.state === 'chase') this.loseTimer += dt;
    }
    if (this.detection > 1) this.detection = 1;

    // ---- state transitions ----
    if (this.state === 'patrol' || this.state === 'return') {
      if (this.detection >= 1) {
        this.enterChase(game);
      } else if (this.detection >= 0.35 && sees) {
        this.state = 'suspicious';
        this.lookTimer = 0.8;
        SoundSynth.suspicious();
      }
    } else if (this.state === 'suspicious') {
      this.faceToward(player.x, player.y, dt, 6);
      this.lookTimer -= dt;
      if (this.detection >= 1) {
        this.enterChase(game);
      } else if (this.lookTimer <= 0) {
        if (this.detection >= 0.5 && this.lastSeen) {
          this.state = 'investigate';
          this.investigateTarget = { x: this.lastSeen.x, y: this.lastSeen.y };
        } else {
          this.state = 'patrol';
        }
      }
    } else if (this.state === 'chase') {
      if (this.detection >= 1 && sees) this.lastSeen = { x: player.x, y: player.y };
      if (dist < 26) {
        game.onCaught(this);
        return;
      }
      if (this.loseTimer > 3.5 && this.lastSeen) {
        this.state = 'investigate';
        this.investigateTarget = { x: this.lastSeen.x, y: this.lastSeen.y };
        this.loseTimer = 0;
      }
    } else if (this.state === 'investigate') {
      if (this.detection >= 1) this.enterChase(game);
    }

    // ---- movement ----
    if (this.state === 'patrol' || this.state === 'return') {
      this.patrolStep(dt, floor);
    } else if (this.state === 'investigate' && this.investigateTarget) {
      const arrived = this.moveToward(this.investigateTarget.x, this.investigateTarget.y, this.speed * 1.35, dt, floor);
      if (arrived) {
        this.lookTimer += dt;
        this.angle += dt * 1.6; // scan the room
        if (this.lookTimer > 2.2) {
          this.state = 'return';
          this.investigateTarget = null;
          this.lookTimer = 0;
        }
      }
    } else if (this.state === 'chase' && this.lastSeen) {
      this.moveToward(player.x, player.y, this.chaseSpeed, dt, floor);
    }

    // ---- footsteps: a guard you can hear is a guard you can avoid ----
    if (this.state === 'patrol' || this.state === 'investigate' || this.state === 'chase') {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.state === 'chase' ? 0.3 : 0.55;
        SoundSynth.guardStep(dist);
      }
    }
  }

  enterChase(game) {
    if (this.state !== 'chase') {
      this.state = 'chase';
      this.loseTimer = 0;
      SoundSynth.spotted();
      game.onSpotted(this);
    }
  }

  patrolStep(dt, floor) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }
    const target = this.waypoints[this.waypointIndex];
    const arrived = this.moveToward(target.x, target.y, this.speed, dt, floor);
    if (arrived) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      this.pauseTimer = this.pause;
      this.lookTimer = 0;
    }
  }

  // Returns true when the target is reached.
  moveToward(tx, ty, speed, dt, floor) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) return true;
    const targetAngle = Math.atan2(dy, dx);
    this.faceToward(tx, ty, dt, 8);
    const step = Math.min(d, speed * dt);
    slideMove(floor, this, (dx / d) * step, (dy / d) * step, 13);
    return d - step < 6;
  }

  faceToward(tx, ty, dt, rate) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    const diff = angleDiff(want, this.angle);
    const maxTurn = rate * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }
}
