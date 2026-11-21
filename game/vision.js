// Nightjar — sight: raycast line-of-sight, vision cones and light.
//
// A guard (or a camera) sees the player only when three things hold:
// the player is inside the cone's range and half-angle, and a ray from
// the watcher to the player crosses no wall, hedge or crate. Light
// bends the detection rate, never the geometry: lamplight x1.65, shadow
// x0.42, open floor x1.0.

function hasLineOfSight(floor, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / 7);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (isBlocked(floor, tx, ty)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when (tx,ty) lies inside a cone from (ox,oy) facing `angle`
// with the given half-angle and range, with a clear ray.
function inVisionCone(floor, ox, oy, angle, halfAngle, range, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 14) return true; // pressed against the watcher: seen
  const targetAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(targetAngle, angle)) > halfAngle) return false;
  return hasLineOfSight(floor, ox, oy, tx, ty);
}

// How bright the floor is under the player: shadow halves detection,
// lamplight nearly doubles it. Shadow wins where the two overlap.
function lightFactorAt(floor, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (isShadowTile(floor, tx, ty)) return 0.42;
  const lamps = lampTiles(floor);
  for (let i = 0; i < lamps.length; i++) {
    const c = tileCenter(lamps[i].x, lamps[i].y);
    if (Math.hypot(x - c.x, y - c.y) < 112) return 1.65;
  }
  return 1.0;
}

function nearestLampDist(floor, x, y) {
  const lamps = lampTiles(floor);
  let best = Infinity;
  for (let i = 0; i < lamps.length; i++) {
    const c = tileCenter(lamps[i].x, lamps[i].y);
    best = Math.min(best, Math.hypot(x - c.x, y - c.y));
  }
  return best;
}
