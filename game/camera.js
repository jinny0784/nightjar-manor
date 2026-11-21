// Nightjar — the security camera. It mounts on a wall and sweeps its
// red cone back and forth. While the player stands in the cone the
// house alarm climbs; when the alarm fills, every guard in the manor
// is sent to hunt the player. Step out of the light and it drains.

class SecurityCamera {
  constructor(def, mount) {
    this.x = mount.x;
    this.y = mount.y;
    this.baseAngle = def.angle;
    this.sweep = def.sweep || 1.1;
    this.range = def.range || 300;
    this.speed = def.speed || 0.45;
    this.half = 0.42;
    this.angle = this.baseAngle;
    this.phase = Math.random() * Math.PI * 2;
    this.time = 0;
    this.seeingPlayer = false;
    this.beepTimer = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.angle = this.baseAngle + Math.sin(this.time * this.speed + this.phase) * this.sweep;
    const player = game.player;
    this.seeingPlayer = inVisionCone(
      game.floor, this.x, this.y, this.angle, this.half, this.range,
      player.x, player.y,
    );
    if (this.seeingPlayer) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const light = lightFactorAt(game.floor, player.x, player.y);
      const sneak = player.sneaking ? 0.6 : 1;
      game.alarm = Math.min(100, game.alarm + 30 * (1.5 - dist / this.range) * light * sneak * dt);
      this.beepTimer -= dt;
      if (this.beepTimer <= 0) {
        this.beepTimer = 0.55;
        SoundSynth.cameraBeep();
      }
      if (game.alarm >= 100 && !game.alarmTripped) {
        game.triggerHouseAlarm();
      }
    }
  }
}
