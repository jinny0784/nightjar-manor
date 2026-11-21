// Nightjar — the game itself: loop, input, objectives, floors, rating.
//
// One floor is won by standing by the ledger and holding E to
// photograph it, then reaching the EXIT. Get caught and the floor
// resets. Finish all three floors and the campaign rates you:
// GHOST if no guard ever made you and no camera ever filled the alarm.

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.keys = { up: false, down: false, left: false, right: false, sneak: false, photo: false };
    this.state = 'title';
    this.floorIndex = 0;
    this.floor = FLOORS[0];
    this.player = null;
    this.guards = [];
    this.cameras = [];
    this.alarm = 0;
    this.alarmTripped = false;
    this.photoDone = false;
    this.flash = 0;
    this.time = 0;
    this.playTime = 0;
    this.timesSpotted = 0;
    this.timesCaught = 0;
    this.alarmTrips = 0;
    this.coinsUsed = 0;
    this.ghost = true;
    this.lastTime = 0;
    this.toastTimer = null;
    this.photoKeyHeld = false;
    this.bindInput();
    this.loadFloor(0);
    this.state = 'title';
    this.showOverlay('overlay-title');
    this.updateHud();
  }

  loadFloor(index) {
    this.floorIndex = index;
    this.floor = FLOORS[index];
    const start = playerStart(this.floor);
    this.player = new Player(start.x, start.y);
    this.guards = this.floor.guards.map((def, i) => new Guard(def, i));
    const mounts = findMarkers(this.floor, 'K');
    this.cameras = this.floor.cameras.map((def, i) => {
      const m = mounts[i] || { x: 2, y: 2 };
      return new SecurityCamera(def, tileCenter(m.x, m.y));
    });
    this.alarm = 0;
    this.alarmTripped = false;
    this.photoDone = false;
    this.flash = 0;
    this.player.photoTimer = 0;
    document.getElementById('floor-name').textContent = this.floor.name;
    document.getElementById('floor-sub').textContent = this.floor.sub;
    this.updateObjective();
    this.updateHud();
  }

  start() {
    SoundSynth.ensure();
    SoundSynth.startDrone();
    this.hideOverlays();
    document.getElementById('hud').classList.remove('hidden');
    this.state = 'playing';
    this.toast(this.floor.intro, 3600);
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0.016);
    this.lastTime = t;
    if (this.state === 'playing') {
      this.update(dt);
      Renderer.draw(this.ctx, this);
    }
    if (this.state === 'playing' || this.state === 'floorclear' || this.state === 'caught' || this.state === 'complete') {
      requestAnimationFrame((t2) => this.loop(t2));
    }
  }

  update(dt) {
    this.time += dt;
    this.playTime += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.6);
    this.player.update(dt, this);
    for (const g of this.guards) g.update(dt, this);
    for (const cam of this.cameras) cam.update(dt, this);
    // The alarm drains when no camera is watching.
    if (!this.cameras.some((c) => c.seeingPlayer)) {
      this.alarm = Math.max(0, this.alarm - 8 * dt);
    }
    if (this.alarm < 50) this.alarmTripped = false;
    SoundSynth.alarmLoop(this.alarm >= 100);
    // Photograph: hold E, still, beside the ledger.
    if (this.keys.photo && this.player.nearLedger(this) && !this.photoDone) {
      if (!this.player.moving) {
        this.player.photoTimer += dt;
        if (this.player.photoTimer >= 0.9) this.takePhoto();
      } else {
        this.player.photoTimer = 0;
      }
    } else {
      this.player.photoTimer = 0;
    }
    // Exit: only once the ledger is photographed.
    if (this.photoDone && this.player.nearExit(this)) {
      this.floorClear();
      return;
    }
    this.updateHud();
  }

  takePhoto() {
    this.photoDone = true;
    this.player.photoDone = true;
    this.player.photoTimer = 0;
    this.flash = 0.9;
    SoundSynth.shutter();
    this.toast('LEDGER PHOTOGRAPHED — now reach the EXIT.', 3200);
    this.updateObjective();
  }

  floorClear() {
    this.state = 'floorclear';
    SoundSynth.floorClear();
    const el = document.getElementById('floor-clear-text');
    el.textContent = this.timesSpotted === 0
      ? 'You slipped out unseen. The next floor is waiting.'
      : 'You got out — but the manor saw you. GHOST is gone for this run.';
    document.getElementById('floor-clear-kicker').textContent =
      this.floorIndex + 1 >= FLOORS.length ? 'THE LAST LEDGER' : 'FLOOR CLEAR';
    document.getElementById('floor-clear-title').textContent =
      this.floorIndex + 1 >= FLOORS.length ? 'All three ledgers photographed.' : 'Ledger photographed.';
    document.getElementById('btn-next-floor').textContent =
      this.floorIndex + 1 >= FLOORS.length ? 'SEE YOUR RATING' : 'NEXT FLOOR';
    this.showOverlay('overlay-floor');
    this.updateHud();
  }

  nextFloor() {
    this.hideOverlays();
    if (this.floorIndex + 1 >= FLOORS.length) {
      this.campaignComplete();
      return;
    }
    this.loadFloor(this.floorIndex + 1);
    this.state = 'playing';
    this.toast(this.floor.intro, 3600);
  }

  campaignComplete() {
    this.state = 'complete';
    SoundSynth.stopDrone();
    SoundSynth.floorClear();
    let rating;
    let text;
    if (this.timesSpotted === 0 && this.alarmTrips === 0) {
      rating = 'GHOST';
      text = 'Three ledgers photographed. Never seen, never heard. The manor never knew you were there.';
    } else if (this.timesSpotted === 0) {
      rating = 'SHADOW';
      text = 'No guard ever laid eyes on you — but the cameras knew something was wrong.';
    } else if (this.timesSpotted <= 2) {
      rating = 'SEEN';
      text = 'You got the ledgers, but the manor knows your face now.';
    } else {
      rating = 'BURNED';
      text = 'They saw you everywhere. The ledgers are yours, but so is the wanted poster.';
    }
    document.getElementById('complete-rating').textContent = rating;
    document.getElementById('complete-text').textContent = text;
    const mins = Math.floor(this.playTime / 60);
    const secs = Math.floor(this.playTime % 60);
    document.getElementById('complete-stats').innerHTML =
      `Time <b>${mins}:${String(secs).padStart(2, '0')}</b> · Times spotted <b>${this.timesSpotted}</b> · ` +
      `Times caught <b>${this.timesCaught}</b> · House alarms <b>${this.alarmTrips}</b> · Coins tossed <b>${this.coinsUsed}</b>`;
    this.showOverlay('overlay-complete');
  }

  onSpotted(guard) {
    this.timesSpotted += 1;
    this.ghost = false;
    this.toast('SPOTTED! Break line of sight!', 2200);
  }

  onCaught(guard) {
    this.timesCaught += 1;
    this.ghost = false;
    this.state = 'caught';
    SoundSynth.caught();
    SoundSynth.alarmLoop(false);
    this.showOverlay('overlay-caught');
  }

  retryFloor() {
    this.hideOverlays();
    this.loadFloor(this.floorIndex);
    this.state = 'playing';
    this.toast(this.floor.intro, 3000);
  }

  triggerHouseAlarm() {
    this.alarmTripped = true;
    this.alarmTrips += 1;
    this.ghost = false;
    for (const g of this.guards) {
      g.state = 'chase';
      g.detection = 1;
      g.lastSeen = { x: this.player.x, y: this.player.y };
      g.loseTimer = 0;
    }
    this.toast('HOUSE ALARM — every guard is hunting you!', 3200);
  }

  // ---- HUD ----

  updateObjective() {
    const el = document.getElementById('objective-text');
    if (this.photoDone) {
      el.textContent = 'Ledger photographed — reach the EXIT.';
      el.classList.add('done');
    } else {
      el.textContent = 'Photograph the ledger, then reach the EXIT.';
      el.classList.remove('done');
    }
  }

  updateHud() {
    document.getElementById('coins-left').textContent = this.player ? this.player.coins : 3;
    document.getElementById('alarm-fill').style.width = `${this.alarm}%`;
    const statusEl = document.getElementById('hud-status');
    const statusText = document.getElementById('status-text');
    const worst = this.guards.length ? Math.max(...this.guards.map((g) => g.detection)) : 0;
    const chasing = this.guards.some((g) => g.state === 'chase');
    const cameraSees = this.cameras.some((c) => c.seeingPlayer);
    statusEl.classList.remove('warn', 'danger');
    if (chasing || this.alarm >= 100) {
      statusText.textContent = 'SPOTTED — RUN';
      statusEl.classList.add('danger');
    } else if (cameraSees) {
      statusText.textContent = 'ON CAMERA';
      statusEl.classList.add('danger');
    } else if (worst >= 0.35) {
      statusText.textContent = 'SUSPICIOUS…';
      statusEl.classList.add('warn');
    } else if (worst > 0.05) {
      statusText.textContent = 'GLIMPSED';
      statusEl.classList.add('warn');
    } else {
      statusText.textContent = 'HIDDEN';
    }
    document.getElementById('rating-text').textContent =
      `RATING: ${this.ghost ? 'GHOST' : this.timesSpotted === 0 ? 'SHADOW' : 'SEEN'}`;
  }

  toast(msg, ms) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2600);
  }

  showOverlay(id) {
    for (const oid of ['overlay-title', 'overlay-floor', 'overlay-caught', 'overlay-complete']) {
      document.getElementById(oid).classList.toggle('hidden', oid !== id);
    }
  }

  hideOverlays() {
    for (const oid of ['overlay-title', 'overlay-floor', 'overlay-caught', 'overlay-complete']) {
      document.getElementById(oid).classList.add('hidden');
    }
  }

  // ---- input ----

  bindInput() {
    const keyMap = {
      KeyW: 'up', ArrowUp: 'up',
      KeyS: 'down', ArrowDown: 'down',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'sneak', ShiftRight: 'sneak',
      KeyE: 'photo',
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const muted = SoundSynth.toggleMute();
        this.toast(muted ? 'Sound off' : 'Sound on', 1200);
        return;
      }
      const name = keyMap[e.code];
      if (name) {
        this.keys[name] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const name = keyMap[e.code];
      if (name) this.keys[name] = false;
    });
    this.canvas.addEventListener('click', (e) => {
      if (this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const wx = (e.clientX - rect.left) * (1280 / rect.width);
      const wy = (e.clientY - rect.top) * (800 / rect.height);
      const ok = this.player.throwCoin(wx, wy, this.floor);
      if (ok) {
        this.coinsUsed += 1;
        this.updateHud();
      } else if (this.player.coins <= 0) {
        this.toast('No coins left on this floor.', 1600);
      }
    });
    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-next-floor').addEventListener('click', () => this.nextFloor());
    document.getElementById('btn-retry').addEventListener('click', () => this.retryFloor());
    document.getElementById('btn-again').addEventListener('click', () => {
      this.timesSpotted = 0;
      this.timesCaught = 0;
      this.alarmTrips = 0;
      this.coinsUsed = 0;
      this.playTime = 0;
      this.ghost = true;
      this.hideOverlays();
      this.loadFloor(0);
      this.state = 'playing';
    });
    window.addEventListener('blur', () => {
      for (const k of Object.keys(this.keys)) this.keys[k] = false;
    });
  }

  // ---- scripted staging for screenshots (?shot=...) ----

  stageShot(kind) {
    this.hideOverlays();
    document.getElementById('hud').classList.remove('hidden');
    this.state = 'playing';
    if (kind === 'cover') {
      // Floor 1, mid-gallery: a guard's cone sweeps past the player.
      this.player.x = 592;
      this.player.y = 400;
      this.player.facing = Math.PI;
    } else if (kind === 'patrol') {
      // Floor 2, sneaking through the library in shadow.
      this.loadFloor(1);
      this.state = 'playing';
      this.player.x = 400;
      this.player.y = 112;
      this.player.sneaking = true;
      this.keys.sneak = true;
    } else if (kind === 'chase') {
      // Floor 1, caught in the lamplight: a guard is on the hunt.
      const g = this.guards[0];
      this.player.x = g.x;
      this.player.y = g.y + 110;
      g.state = 'chase';
      g.detection = 1;
      g.lastSeen = { x: this.player.x, y: this.player.y };
      this.timesSpotted = 1;
      this.ghost = false;
    } else if (kind === 'photo') {
      // Floor 1, ledger photographed, EXIT open, flash fading.
      const lp = ledgerPos(this.floor);
      this.player.x = lp.x + 44;
      this.player.y = lp.y;
      this.player.facing = Math.PI;
      this.photoDone = true;
      this.player.photoDone = true;
      this.flash = 0.45;
      this.updateObjective();
    }
    this.updateHud();
    this.lastTime = performance.now();
    const step = (t) => {
      const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0.016);
      this.lastTime = t;
      if (this.state === 'playing') {
        this.update(dt);
        Renderer.draw(this.ctx, this);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---- self-test (?autotest=1): scripted scenarios, real game code ----

  runAutotest() {
    const lines = [];
    const results = [];
    const check = (name, cond, detail) => {
      results.push({ name, pass: !!cond });
      lines.push(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
    };
    const step = (seconds) => {
      const n = Math.ceil(seconds * 60);
      for (let i = 0; i < n; i++) this.update(1 / 60);
    };
    const resetKeys = () => {
      for (const k of Object.keys(this.keys)) this.keys[k] = false;
    };
    const reload = () => {
      resetKeys();
      this.loadFloor(this.floorIndex);
      this.state = 'playing';
    };
    try {
      // 1. Movement: holding D walks the player right.
      reload();
      const x0 = this.player.x;
      this.keys.right = true;
      step(0.5);
      this.keys.right = false;
      check('movement', this.player.x - x0 > 20, `dx=${Math.round(this.player.x - x0)}px`);

      // 2. Detection -> chase: stand in a guard's cone, in the open.
      reload();
      const g0 = this.guards[0];
      this.player.x = g0.x;
      this.player.y = g0.y + 90;
      step(3);
      check('detection-to-chase', g0.state === 'chase', `state=${g0.state} detection=${g0.detection.toFixed(2)}`);

      // 3. Coin -> investigate: toss a coin near a patrolling guard.
      reload();
      const g1 = this.guards[0];
      this.player.x = g1.x;
      this.player.y = g1.y + 260;
      const coinOk = this.player.throwCoin(g1.x + 120, g1.y + 120, this.floor);
      step(1.5);
      const investigating = this.guards.some((g) => g.state === 'investigate');
      check('coin-to-investigate', coinOk && investigating, `thrown=${coinOk} states=${this.guards.map((g) => g.state).join(',')}`);

      // 4. Photograph: stand at the ledger, hold E.
      reload();
      const lp = ledgerPos(this.floor);
      this.player.x = lp.x;
      this.player.y = lp.y - 20;
      this.keys.photo = true;
      step(1.2);
      this.keys.photo = false;
      check('photograph', this.photoDone === true, `photoDone=${this.photoDone}`);

      // 5. Exit -> floor clear, once the ledger is photographed.
      const ep = exitPos(this.floor);
      this.player.x = ep.x;
      this.player.y = ep.y;
      step(0.5);
      check('exit-to-floor-clear', this.state === 'floorclear', `state=${this.state}`);

      // 6. Shadow slows detection: in a shadow tile the meter crawls.
      reload();
      const g2 = this.guards[0];
      g2.pauseTimer = 99;
      g2.state = 'patrol';
      this.player.x = 464;
      this.player.y = 144;
      g2.angle = Math.atan2(this.player.y - g2.y, this.player.x - g2.x);
      step(0.5);
      check('shadow-slows-detection', g2.detection > 0.05 && g2.detection < 0.7 && g2.state !== 'chase',
        `detection=${g2.detection.toFixed(2)} state=${g2.state}`);

      // 7. Camera feeds the alarm.
      reload();
      const cam = this.cameras[0];
      cam.phase = 0;
      cam.time = 0;
      const alarm0 = this.alarm;
      this.player.x = cam.x - 120;
      this.player.y = cam.y;
      step(2);
      check('camera-feeds-alarm', this.alarm > alarm0 + 10, `alarm=${this.alarm.toFixed(1)}`);
    } catch (err) {
      lines.push(`ERROR ${err.message}`);
      results.push({ name: 'exception', pass: false });
    }
    const passed = results.filter((r) => r.pass).length;
    const summary = `AUTOTEST ${passed}/${results.length} ${passed === results.length ? 'PASS' : 'FAIL'}`;
    lines.unshift(summary);
    const el = document.getElementById('autotest');
    el.textContent = lines.join('\n');
    el.classList.add('show');
    document.title = summary;
    window.__autotest = { passed, total: results.length, lines };
    Renderer.draw(this.ctx, this);
  }
}

// ---- boot ----
const game = new Game();
window.NIGHTJAR = game;

const params = new URLSearchParams(location.search);
if (params.has('autotest')) {
  document.getElementById('hud').classList.remove('hidden');
  game.hideOverlays();
  game.state = 'playing';
  game.runAutotest();
} else if (params.has('shot')) {
  game.stageShot(params.get('shot') || 'cover');
}
