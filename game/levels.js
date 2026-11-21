// Nightjar — the three floors of Ashworth Manor.
//
// Map legend (every row is 40 tiles, every floor 25 rows):
//   #  wall (blocks movement and sight)      H  hedge (blocks movement and sight)
//   B  crate (blocks movement and sight)     .  wooden floor
//   ,  shadow floor (dark — detection x0.42) *  lamp floor (a lamp burns here — x1.65)
//   P  the player starts here                O  the ledger (photograph it)
//   X  the EXIT (opens once the ledger is photographed)
//   K  a security camera mounts here (sweep data below, in reading order)
//
// Guards spawn at their first waypoint and patrol the rest, pausing at
// each. Cameras sweep an arc from their mount. Waypoints and camera arcs
// are tile coordinates.

const TILE = 32;

const FLOORS = [
  {
    name: 'FLOOR 1 — THE GALLERY',
    sub: 'Ashworth Manor · ground floor',
    intro: 'Two guards walk the gallery. The ledger waits in the west study.',
    // Columns: border 1 | wing A 7 | wall 1 | wing B 9 | wall 1 | wing C 8 | wall 1 | wing D 11 | border 1
    map: [
      '########################################',
      '#.......#.........#........#..........X#',
      '#.......#.........#........#.....B.....#',
      '#.......#.....,,,,#....***.#...........#',
      '#.......#.....,,,,#....***.#...........#',
      '#......................................#',
      '#.......#.........#........#...........#',
      '#...B...#....B....#...B....#.....B.....#',
      '#.......#.........#........#...........#',
      '#.......#.....,,,,#....***.#...........#',
      '#.......#.....,,,,#....***.#...........#',
      '#......................................#',
      '#.......#.........#........#...........#',
      '#...H...#....B....#...H....#.....H.....#',
      '#.......#.........#........#...........#',
      '#.......#.....,,,,#....***.#...........#',
      '#.......#.....,,,,#....***.#...........#',
      '#......................................#',
      '#.......#.........#........#...........#',
      '#...B...#....H....#...B....#.....B.....#',
      '#.......#.........#........#...........#',
      '#.......#...P.,,,,#....***.#...........#',
      '#...O...#.....,,,,#....***.#......K....#',
      '#.......#.........#........#...........#',
      '########################################',
    ],
    guards: [
      { waypoints: [[10, 2], [10, 12], [16, 12], [16, 2]], pause: 1.4 },
      { waypoints: [[30, 20], [30, 8], [36, 8], [36, 20]], pause: 1.1 },
    ],
    cameras: [
      { angle: Math.PI, sweep: 1.1, range: 300, speed: 0.45 },
    ],
  },
  {
    name: 'FLOOR 2 — THE LIBRARY',
    sub: 'Ashworth Manor · first floor',
    intro: 'Three guards among the shelves. Two cameras watch the reading room.',
    // Same column structure as floor 1.
    map: [
      '########################################',
      '#.......#.........#........#..........X#',
      '#...B...#.........#.....,,,#...........#',
      '#.......#....H....#.....,,,#....***....#',
      '#.......#....H....#.....,,,#....***....#',
      '#......................................#',
      '#.......#.........#........#...........#',
      '#...B...#....B....#...B....#.....B.....#',
      '#.......#.........#........#...........#',
      '#.......#....H....#.....,,,#....***....#',
      '#.......#....H....#.....,,,#....***....#',
      '#......................................#',
      '#.......#.........#........#...........#',
      '#...B...#....B....#...B....#.....B.....#',
      '#.......#.........#........#...........#',
      '#.......#....H....#.....,,,#....***....#',
      '#.......#....H....#.....,,,#....***....#',
      '#......................................#',
      '#.......#.........#........#...........#',
      '#...B...#....B....#...B....#.....B.....#',
      '#.......#.........#........#...........#',
      '#.......#...P.....#........#...........#',
      '#...O...#....K....#.....,,,#......K....#',
      '#.......#.........#........#...........#',
      '########################################',
    ],
    guards: [
      { waypoints: [[10, 4], [10, 14], [16, 14], [16, 4]], pause: 1.2 },
      { waypoints: [[22, 3], [22, 14], [30, 14], [30, 3]], pause: 1.0 },
      { waypoints: [[34, 21], [34, 10], [28, 10], [28, 21]], pause: 1.5 },
    ],
    cameras: [
      { angle: Math.PI / 2, sweep: 1.3, range: 300, speed: 0.5 },
      { angle: Math.PI, sweep: 1.0, range: 280, speed: 0.4 },
    ],
  },
  {
    name: 'FLOOR 3 — THE STUDY',
    sub: 'Ashworth Manor · second floor',
    intro: 'Four guards, three cameras, and the master ledger. Stay in the dark.',
    // Columns: border 1 | wing A 4 | wall 1 | wing B 8 | wall 1 | wing C 9 | wall 1 | wing D 7 | wall 1 | wing E 6 | border 1
    map: [
      '########################################',
      '#....#........#.........#.......#.....X#',
      '#....#...B....#.....,,,,#....***#......#',
      '#....#........#.....,,,,#....***#...B..#',
      '#....#...H....#.....,,,,#.......#......#',
      '#......................................#',
      '#....#........#.........#...H...#......#',
      '#....#...B....#....B....#.......#...H..#',
      '#....#........#.........#....***#......#',
      '#....#...H....#.....,,,,#....***#...B..#',
      '#......................................#',
      '#....#........#.........#.......#......#',
      '#....#...B....#....B....#...H...#...H..#',
      '#....#........#.........#.......#......#',
      '#....#...H....#.....,,,,#....***#...B..#',
      '#......................................#',
      '#....#........#.....,,,,#....***#......#',
      '#....#...B....#....B....#.......#...H..#',
      '#....#........#.........#.......#......#',
      '#....#...H....#.....,,,,#....***#...B..#',
      '#......................................#',
      '#....#...P....#.........#...H...#......#',
      '#...O#...K....#.....,,,,#...K...#...K..#',
      '#....#........#.........#.......#......#',
      '########################################',
    ],
    guards: [
      { waypoints: [[8, 3], [8, 13], [12, 13], [12, 3]], pause: 1.0 },
      { waypoints: [[17, 4], [17, 14], [22, 14], [22, 4]], pause: 0.9 },
      { waypoints: [[28, 3], [28, 13], [35, 13], [35, 3]], pause: 1.2 },
      { waypoints: [[20, 21], [20, 10], [28, 10], [27, 21]], pause: 1.1 },
    ],
    cameras: [
      { angle: Math.PI / 2, sweep: 1.2, range: 300, speed: 0.55 },
      { angle: Math.PI, sweep: 1.1, range: 300, speed: 0.45 },
      { angle: -Math.PI / 2, sweep: 1.0, range: 280, speed: 0.5 },
    ],
  },
];

// ---- Map queries shared by every system in the game ----

function tileAt(floor, tx, ty) {
  if (ty < 0 || ty >= floor.map.length) return '#';
  const row = floor.map[ty];
  if (tx < 0 || tx >= row.length) return '#';
  return row[tx];
}

function tileIsSolid(ch) {
  return ch === '#' || ch === 'H' || ch === 'B';
}

// Solid for movement and for sight.
function isBlocked(floor, tx, ty) {
  return tileIsSolid(tileAt(floor, tx, ty));
}

function isShadowTile(floor, tx, ty) {
  return tileAt(floor, tx, ty) === ',';
}

function findMarkers(floor, ch) {
  const out = [];
  for (let y = 0; y < floor.map.length; y++) {
    for (let x = 0; x < floor.map[y].length; x++) {
      if (floor.map[y][x] === ch) out.push({ x, y });
    }
  }
  return out;
}

function lampTiles(floor) {
  return findMarkers(floor, '*');
}

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function playerStart(floor) {
  const p = findMarkers(floor, 'P');
  return p.length ? tileCenter(p[0].x, p[0].y) : tileCenter(19, 22);
}

function ledgerPos(floor) {
  const o = findMarkers(floor, 'O');
  return o.length ? tileCenter(o[0].x, o[0].y) : tileCenter(2, 22);
}

function exitPos(floor) {
  const x = findMarkers(floor, 'X');
  return x.length ? tileCenter(x[0].x, x[0].y) : tileCenter(37, 1);
}
