// Nightjar — the renderer. One canvas, top-down, drawn tile by tile.
//
// Vision cones are real raycasts: each cone is a polygon built from
// short rays that stop at the first wall, hedge or crate they hit, so
// a cone wraps around cover exactly the way sight does. Lamplight is
// a warm glow; shadow floor is drawn cold and dark, so the player can
// read at a glance where it is safe to stand.

const Renderer = {
  // March a ray from (ox,oy) along `angle` until it hits a solid tile
  // or travels `range`. Returns the distance travelled.
  castRay(floor, ox, oy, angle, range) {
    const step = 8;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let d = step; d <= range; d += step) {
      const tx = Math.floor((ox + dx * d) / TILE);
      const ty = Math.floor((oy + dy * d) / TILE);
      if (isBlocked(floor, tx, ty)) return d - step / 2;
    }
    return range;
  },

  // Fill a vision cone as a raycast-clipped polygon.
  drawCone(ctx, floor, ox, oy, angle, half, range, color) {
    const rays = 26;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let i = 0; i <= rays; i++) {
      const a = angle - half + (2 * half * i) / rays;
      const d = this.castRay(floor, ox, oy, a, range);
      ctx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  },

  drawTile(ctx, floor, tx, ty, ch, time) {
    const x = tx * TILE;
    const y = ty * TILE;
    if (ch === '#') {
      ctx.fillStyle = '#2e2a24';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#3d382e';
      ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = '#211d18';
      ctx.fillRect(x, y + TILE - 4, TILE, 4);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      return;
    }
    // Wooden floor: parquet tones alternate by tile.
    const warm = (tx + ty) % 2 === 0;
    ctx.fillStyle = warm ? '#6b4e2e' : '#5f4527';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.fillStyle = 'rgba(255,220,150,.05)';
    ctx.fillRect(x + 4, y + 4, TILE - 8, 2);
    if (ch === ',') {
      // Shadow floor: cold, dark, safe.
      ctx.fillStyle = 'rgba(10,14,34,.55)';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(120,150,255,.06)';
      ctx.fillRect(x, y, TILE, TILE);
    } else if (ch === '*') {
      // Lamp floor: warm pool of light.
      ctx.fillStyle = 'rgba(255,196,90,.16)';
      ctx.fillRect(x, y, TILE, TILE);
    } else if (ch === 'H') {
      ctx.fillStyle = '#1d3a1e';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#2c5429';
      ctx.beginPath();
      ctx.arc(x + 10, y + 12, 9, 0, Math.PI * 2);
      ctx.arc(x + 22, y + 20, 10, 0, Math.PI * 2);
      ctx.arc(x + 20, y + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a6b33';
      ctx.beginPath();
      ctx.arc(x + 12, y + 10, 4, 0, Math.PI * 2);
      ctx.arc(x + 24, y + 18, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (ch === 'B') {
      ctx.fillStyle = '#7a5a30';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = '#4a3416';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + TILE - 2, y + TILE - 2);
      ctx.moveTo(x + TILE - 2, y + 2);
      ctx.lineTo(x + 2, y + TILE - 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  },

  drawLampGlow(ctx, floor, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const lamp of lampTiles(floor)) {
      const c = tileCenter(lamp.x, lamp.y);
      const flicker = 0.85 + Math.sin(time * 3 + lamp.x * 2.1 + lamp.y) * 0.06;
      const g = ctx.createRadialGradient(c.x, c.y, 6, c.x, c.y, 120 * flicker);
      g.addColorStop(0, 'rgba(255,205,110,.34)');
      g.addColorStop(0.55, 'rgba(255,190,90,.12)');
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 120 * flicker, 0, Math.PI * 2);
      ctx.fill();
      // The lamp post itself.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#1c1712';
      ctx.fillRect(c.x - 2, c.y - 9, 4, 18);
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(c.x, c.y - 11, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.restore();
  },

  drawLedger(ctx, floor, game) {
    const lp = ledgerPos(floor);
    const bob = Math.sin(game.time * 2) * 2;
    ctx.fillStyle = '#3a2a16';
    ctx.fillRect(lp.x - 22, lp.y - 15, 44, 30);
    ctx.fillStyle = '#54401f';
    ctx.fillRect(lp.x - 22, lp.y - 15, 44, 5);
    // The open ledger: cream pages, gold seal.
    ctx.fillStyle = '#f0e3c0';
    ctx.fillRect(lp.x - 14, lp.y - 8, 28, 16);
    ctx.strokeStyle = '#8a6d3b';
    ctx.strokeRect(lp.x - 14, lp.y - 8, 28, 16);
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y - 8);
    ctx.lineTo(lp.x, lp.y + 8);
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(lp.x + 7, lp.y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (!game.photoDone) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LEDGER — press E', lp.x, lp.y - 24 + bob);
    } else {
      ctx.fillStyle = '#8fd18a';
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ PHOTOGRAPHED', lp.x, lp.y - 24 + bob);
    }
  },

  drawExit(ctx, floor, game) {
    const ep = exitPos(floor);
    const open = game.photoDone;
    const pulse = 0.6 + Math.sin(game.time * 3) * 0.4;
    ctx.fillStyle = open ? `rgba(90,200,110,${0.5 + pulse * 0.3})` : 'rgba(70,90,70,.55)';
    ctx.fillRect(ep.x - 16, ep.y - 16, 32, 32);
    ctx.strokeStyle = open ? '#8fd18a' : '#5a6b52';
    ctx.lineWidth = 2;
    ctx.strokeRect(ep.x - 16, ep.y - 16, 32, 32);
    ctx.lineWidth = 1;
    ctx.fillStyle = open ? '#dff5d8' : '#aab89e';
    ctx.font = 'bold 11px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ep.x, ep.y - 22);
    if (open) {
      ctx.strokeStyle = `rgba(143,209,138,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ep.x - 22, ep.y - 22, 44, 44);
      ctx.lineWidth = 1;
    }
  },

  drawCoin(ctx, coin) {
    const wobble = Math.sin(coin.spin) * 0.4;
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y, 7, 7 * (0.6 + Math.abs(wobble) * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d3b';
    ctx.stroke();
    ctx.fillStyle = '#8a6d3b';
    ctx.font = 'bold 8px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', coin.x, coin.y + 3);
  },

  drawPlayer(ctx, player, game) {
    const p = player;
    // Sneak = low crouch; walking = upright.
    const r = p.sneaking ? 11 : 13;
    // Soft shadow under the figure.
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8, r + 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded cloak.
    ctx.fillStyle = '#232030';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f2b42';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, r - 4, 0, Math.PI * 2);
    ctx.fill();
    // Face in shadow, eyes catching the light.
    ctx.fillStyle = '#0d0b12';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.facing) * 3, p.y + Math.sin(p.facing) * 3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    const ex = Math.cos(p.facing);
    const ey = Math.sin(p.facing);
    const px = -ey;
    const py = ex;
    ctx.beginPath();
    ctx.arc(p.x + ex * 4 + px * 2.4, p.y + ey * 4 + py * 2.4, 1.1, 0, Math.PI * 2);
    ctx.arc(p.x + ex * 4 - px * 2.4, p.y + ey * 4 - py * 2.4, 1.1, 0, Math.PI * 2);
    ctx.fill();
    // Photograph progress ring.
    if (p.photoTimer > 0) {
      const frac = 1 - p.photoTimer / 0.9;
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PHOTOGRAPHING…', p.x, p.y - 28);
    }
  },

  drawGuard(ctx, guard, game) {
    const g = guard;
    // Vision cone, coloured by mood.
    let coneColor;
    if (g.state === 'chase') coneColor = 'rgba(216,74,53,.34)';
    else if (g.state === 'suspicious' || g.state === 'investigate') coneColor = 'rgba(242,150,60,.30)';
    else coneColor = 'rgba(242,193,78,.20)';
    this.drawCone(ctx, game.floor, g.x, g.y, g.angle, g.coneHalf, g.coneRange, coneColor);
    // Body: navy uniform, brass buttons, helmet.
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 8, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e63';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2b47';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(g.x, g.y + 2, 1.6, 0, Math.PI * 2);
    ctx.arc(g.x, g.y + 6, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // Helmet brim points where he looks.
    ctx.fillStyle = '#22314f';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 5, g.y + Math.sin(g.angle) * 5, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Detection mark: "?" while suspicious, "!" while chasing or nearly seen.
    if (g.detection >= 0.35 || g.state === 'chase') {
      const mark = g.state === 'chase' ? '!' : '?';
      const col = g.state === 'chase' ? '#ff5a3c' : '#ffd27a';
      ctx.fillStyle = col;
      ctx.font = 'bold 20px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mark, g.x, g.y - 22);
      // Detection meter arc.
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + g.detection * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  },

  drawCamera(ctx, cam, game) {
    // Sweeping red cone.
    this.drawCone(ctx, game.floor, cam.x, cam.y, cam.angle, cam.half, cam.range, 'rgba(216,74,53,.16)');
    // Mount: small dark box with a red lens eye.
    ctx.fillStyle = '#1c1712';
    ctx.fillRect(cam.x - 7, cam.y - 7, 14, 14);
    ctx.fillStyle = cam.seeingPlayer ? '#ff3b2e' : '#d84a35';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 4, cam.y + Math.sin(cam.angle) * 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (cam.seeingPlayer) {
      ctx.fillStyle = '#ff6a52';
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('REC ●', cam.x, cam.y - 14);
    }
  },

  draw(ctx, game) {
    const floor = game.floor;
    ctx.clearRect(0, 0, 1280, 800);
    // Backdrop beyond the map.
    ctx.fillStyle = '#0d0b09';
    ctx.fillRect(0, 0, 1280, 800);
    for (let ty = 0; ty < floor.map.length; ty++) {
      for (let tx = 0; tx < floor.map[ty].length; tx++) {
        this.drawTile(ctx, floor, tx, ty, floor.map[ty][tx], game.time);
      }
    }
    this.drawLedger(ctx, floor, game);
    this.drawExit(ctx, floor, game);
    for (const coin of game.player.thrownCoins) this.drawCoin(ctx, coin);
    this.drawLampGlow(ctx, floor, game.time);
    for (const cam of game.cameras) this.drawCamera(ctx, cam, game);
    for (const g of game.guards) this.drawGuard(ctx, g, game);
    this.drawPlayer(ctx, game.player, game);
    // Alarm vignette: the manor itself turns red.
    if (game.alarm > 55) {
      const a = ((game.alarm - 55) / 45) * (0.25 + Math.sin(game.time * 6) * 0.08);
      const grad = ctx.createRadialGradient(640, 400, 300, 640, 400, 720);
      grad.addColorStop(0, 'rgba(216,40,20,0)');
      grad.addColorStop(1, `rgba(216,40,20,${a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 800);
    }
    // Camera flash after a photograph.
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,250,230,${game.flash})`;
      ctx.fillRect(0, 0, 1280, 800);
    }
  },
};
