// Nightjar — the player. A hooded figure, quick on their feet and
// quieter still when they sneak. Footsteps are a real signal: walking
// feet carry to nearby guards, sneaking feet barely do. Coins are the
// other tool — three a floor, tossed with a click, and every guard in
// earshot leaves their route to check the clink.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.walkSpeed = 168;
    this.sneakSpeed = 96;
    this.sneaking = false;
    this.moving = false;
    this.facing = -Math.PI / 2;
    this.stepTimer = 0;
    this.stepDistance = 0;
    this.coins = 3;
    this.thrownCoins = [];
    this.photoTimer = 0; // counts down while the shutter is held open
    this.photoDone = false;
  }

  // keys: {up, down, left, right, sneak} — booleans set by game.js.
  update(dt, game) {
    let mx = 0;
    let my = 0;
    if (game.keys.up) my -= 1;
    if (game.keys.down) my += 1;
    if (game.keys.left) mx -= 1;
    if (game.keys.right) mx += 1;
    this.sneaking = !!game.keys.sneak;
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.facing = Math.atan2(my, mx);
      const speed = this.sneaking ? this.sneakSpeed : this.walkSpeed;
      slideMove(game.floor, this, mx * speed * dt, my * speed * dt, this.radius);
      // Footsteps: the noise a guard hears.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.5 : 0.34;
        const dist = 0; // the player hears their own feet at full volume
        SoundSynth.footstep(this.sneaking, dist);
        const noiseRadius = this.sneaking ? 30 : 100;
        for (const g of game.guards) {
          g.hearNoise(this.x, this.y, noiseRadius);
        }
      }
    }
    // Thrown coins ring out once, then sit and glint.
    for (const coin of this.thrownCoins) {
      coin.spin += dt * 9;
      if (!coin.rang) {
        coin.rang = true;
        SoundSynth.coinClink();
        for (const g of game.guards) g.hearNoise(coin.x, coin.y, 215);
      }
    }
  }

  // A click tosses a coin toward (wx, wy), at most 260px away.
  throwCoin(wx, wy, floor) {
    if (this.coins <= 0) return false;
    const dx = wx - this.x;
    const dy = wy - this.y;
    const d = Math.hypot(dx, dy);
    const range = Math.min(d, 260);
    const nx = this.x + (d > 0 ? (dx / d) * range : 0);
    const ny = this.y + (d > 0 ? (dy / d) * range : 0);
    // The coin must land on open floor, not inside a wall.
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(ny / TILE);
    if (isBlocked(floor, tx, ty)) return false;
    this.coins -= 1;
    this.thrownCoins.push({ x: nx, y: ny, spin: 0, rang: false });
    SoundSynth.coinThrow();
    return true;
  }

  nearLedger(game) {
    const lp = ledgerPos(game.floor);
    return Math.hypot(this.x - lp.x, this.y - lp.y) < 52;
  }

  nearExit(game) {
    const ep = exitPos(game.floor);
    return Math.hypot(this.x - ep.x, this.y - ep.y) < 40;
  }
}
