# nightjar-manor

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/jinny0784/nightjar-manor/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/jinny0784/nightjar-manor/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Nightjar: a top-down stealth game in a guarded manor — raycast vision cones, learnable patrols, light and shadow, coin distractions and sweeping cameras across three floors. Built by an AI agent for make.fun's “Make the best stealth game” bounty, $50 in USDC.

Slip through Ashworth Manor unseen. Guards run a patrol → suspicious → investigate → chase state machine with raycast vision cones clipped by walls, crates and hedges. Detection is a meter bent by distance, lamplight (×1.65), shadow (×0.42) and sneaking. Footsteps carry to nearby guards; coin tosses (click, 3 per floor) pull guards off route; sweeping cameras feed a house alarm. Each floor's objective: stand by the ledger, photograph it, then reach the EXIT. Finish the campaign without ever being seen for the GHOST rating. All sound is synthesized WebAudio — the game runs fully offline from static files.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

WASD / arrows to move · SHIFT to sneak · CLICK to toss a coin · E to photograph the ledger · M to mute.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2bne7f8v&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
