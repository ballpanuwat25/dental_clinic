// Draws the clinic's map from OpenStreetMap: the streets round the mouth of Chok Chai 4 Road, the MRT Yellow
// Line over Lat Phrao Road, and the walk from MRT Chok Chai 4 (YL03) to the clinic, routed along real streets.
// Adapted from Pak's map builder (D:/bai-liang). Writes src/content/map.ts.
//   node scripts/build-map.mjs            (uses the cached download when there is one)
//   node scripts/build-map.mjs --refresh  (downloads again)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const WIDTH = 640, HEIGHT = 640;
// round the junction of Lat Phrao and Chok Chai 4, so the station and the clinic sit near the middle
const CENTER = { lat: 13.7955, lon: 100.5946 };
const METRES_ACROSS = 700;
// the clinic (fictional): a shophouse on the east side of Chok Chai 4 Road, a few doors up from where it turns
// north off Lat Phrao (the way runs east along Lat Phrao for its first 125 m)
const CLINIC_ROAD = 481978378;
const CLINIC_UP_ROAD_M = 175;
const CLINIC_SIDE_M = 14;
const WALK_METRES_PER_MIN = 75;
const CACHE = new URL('./.cache/chokchai.osm.json', import.meta.url);
const OUT = new URL('../src/content/map.ts', import.meta.url);
const OVERPASS = 'https://overpass-api.de/api/interpreter';

const CLASS = {
  major: ['primary', 'secondary', 'tertiary'],
  street: ['residential', 'unclassified', 'living_street'],
  lane: ['service', 'pedestrian', 'footway', 'steps', 'path'],
};

// equirectangular is exact enough across a kilometre and a half
const M_LAT = 110574, M_LON = 111320 * Math.cos((CENTER.lat * Math.PI) / 180);
const SCALE = WIDTH / METRES_ACROSS;
const project = ({ lat, lon }) => [WIDTH / 2 + (lon - CENTER.lon) * M_LON * SCALE, HEIGHT / 2 - (lat - CENTER.lat) * M_LAT * SCALE];
const metres = (a, b) => Math.hypot((a.lat - b.lat) * M_LAT, (a.lon - b.lon) * M_LON);

function bbox(marginM) {
  const dLat = (HEIGHT / SCALE / 2 + marginM) / M_LAT, dLon = (WIDTH / SCALE / 2 + marginM) / M_LON;
  return [CENTER.lat - dLat, CENTER.lon - dLon, CENTER.lat + dLat, CENTER.lon + dLon].map((n) => n.toFixed(5)).join(',');
}

async function download() {
  const b = bbox(250);
  const query = `[out:json][timeout:90];(way["highway"](${b});way["railway"](${b});node["railway"="station"](${b}););out geom;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'User-Agent': 'fahsai-portfolio-map', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}`);
  const text = await res.text();
  mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true });
  writeFileSync(CACHE, text);
  return JSON.parse(text);
}

const osm = existsSync(CACHE) && !process.argv.includes('--refresh') ? JSON.parse(readFileSync(CACHE, 'utf8')) : await download();
const allWays = osm.elements.filter((e) => e.type === 'way' && e.geometry);
const ways = allWays.filter((e) => e.tags?.highway);
const classOf = (hw) => Object.keys(CLASS).find((k) => CLASS[k].includes(hw));
// sidewalks, crossings and car parks still carry the walking routes but would draw every road twice
const drawn = (w) => !['sidewalk', 'crossing'].includes(w.tags.footway) && w.tags.service !== 'parking_aisle';

// Liang-Barsky against a rectangle; a polyline leaves as the pieces that stay inside
function clipLine(points, [x0, y0, x1, y1]) {
  const pieces = [];
  let cur = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) { if (q < 0) ok = false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; }
    }
    if (!ok) { if (cur.length > 1) pieces.push(cur); cur = []; continue; }
    const a = [ax + t0 * dx, ay + t0 * dy], b = [ax + t1 * dx, ay + t1 * dy];
    if (!cur.length) cur.push(a);
    cur.push(b);
    if (t1 < 1) { pieces.push(cur); cur = []; }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points.at(-1)];
  let worst = 0, at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const d = Math.abs((b[0] - a[0]) * (a[1] - py) - (a[0] - px) * (b[1] - a[1])) / len;
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tolerance) return [a, b];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

const r1 = (n) => Math.round(n * 10) / 10;
const line = (pts) => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L');
const PAD = [-20, -20, WIDTH + 20, HEIGHT + 20];

const roads = {};
for (const k of Object.keys(CLASS)) {
  const pieces = ways.filter((w) => drawn(w) && classOf(w.tags.highway) === k).flatMap((w) => clipLine(w.geometry.map(project), PAD));
  roads[k] = pieces.map((p) => line(simplify(p, 0.5))).join('');
}

// the MRT Yellow Line, a monorail above Lat Phrao Road; OpenStreetMap may draw it as two beams
const rail = allWays
  .filter((w) => ['monorail', 'subway', 'light_rail'].includes(w.tags.railway))
  .flatMap((w) => clipLine(w.geometry.map(project), PAD))
  .map((p) => line(simplify(p, 0.8)))
  .join('');
const stationNode = osm.elements.find((e) => e.type === 'node' && e.tags?.railway === 'station' && e.tags['name:en'] === 'Chok Chai 4');

// the clinic's door: CLINIC_UP_ROAD_M along Chok Chai 4 Road from Lat Phrao, then CLINIC_SIDE_M to its east side
function clinicAt() {
  const road = allWays.find((w) => w.id === CLINIC_ROAD).geometry;
  let left = CLINIC_UP_ROAD_M;
  for (let i = 1; i < road.length; i++) {
    const d = metres(road[i - 1], road[i]);
    if (d < left) { left -= d; continue; }
    const t = left / d;
    const lat = road[i - 1].lat + (road[i].lat - road[i - 1].lat) * t;
    const lon = road[i - 1].lon + (road[i].lon - road[i - 1].lon) * t;
    // the road's direction in metres, turned a right angle clockwise, points to its east side here
    const e = (road[i].lon - road[i - 1].lon) * M_LON, n = (road[i].lat - road[i - 1].lat) * M_LAT;
    const len = Math.hypot(e, n);
    return [lat + (-e / len) * CLINIC_SIDE_M / M_LAT, lon + (n / len) * CLINIC_SIDE_M / M_LON];
  }
}
const STUDIO_AT = clinicAt();

// walking graph over every way that carries people; nodes are OSM node ids
const graph = new Map();
const where = new Map();
for (const w of ways) {
  w.nodes.forEach((id, j) => {
    where.set(id, w.geometry[j]);
    if (!graph.has(id)) graph.set(id, []);
    if (j) {
      const prev = w.nodes[j - 1], d = metres(w.geometry[j - 1], w.geometry[j]);
      const name = w.tags['name:en'] ?? w.tags.name ?? '';
      graph.get(id).push([prev, d, name]);
      graph.get(prev).push([id, d, name]);
    }
  });
}
function nearestNode([lat, lon]) {
  let best, bestD = Infinity;
  for (const [id, p] of where) {
    const d = metres(p, { lat, lon });
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}
function shortest(from, to) {
  const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
  const queue = [[0, from]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, id] = queue.shift();
    if (done.has(id)) continue;
    if (id === to) break;
    done.add(id);
    for (const [next, w, name] of graph.get(id)) {
      if (d + w < (dist.get(next) ?? Infinity)) { dist.set(next, d + w); prev.set(next, [id, name, w]); queue.push([d + w, next]); }
    }
  }
  const path = [to], steps = [];
  while (path[0] !== from) { const [id, name, w] = prev.get(path[0]); steps.unshift({ name, metres: w, at: path[0] }); path.unshift(id); }
  // the walk street by street: consecutive steps on the same street make one leg, which ends where it turns
  // a few metres of unnamed pavement across a side street do not make a leg of their own
  const legs = [];
  for (const s of steps) {
    if (!s.name && s.metres < 20 && legs.length) { legs.at(-1).metres += s.metres; legs.at(-1).to = s.at; continue; }
    const last = legs.at(-1);
    if (last && last.name === s.name) { last.metres += s.metres; last.to = s.at; }
    else legs.push({ name: s.name, metres: s.metres, to: s.at });
  }
  return { metres: dist.get(to), points: path.map((id) => where.get(id)), legs };
}

const studio = nearestNode(STUDIO_AT);
// the walk starts at the street above the station, the nearest walkable point to it
const mouth = nearestNode([stationNode.lat, stationNode.lon]);
const at = (p) => project(p).map(r1);
const w = shortest(mouth, studio);
// from the platform up to the street, as the crow flies
const total = w.metres + metres(stationNode, where.get(mouth));
const walk = {
  route: line(simplify(w.points.map(project), 0.8)),
  metres: Math.round(total),
  minutes: Math.max(1, Math.round(total / WALK_METRES_PER_MIN)),
  // each leg to the nearest ten metres, and the point on the map where it ends
  legs: w.legs.map((l) => ({ street: l.name, metres: Math.round(l.metres / 10) * 10, to: at(where.get(l.to)) })),
};

const data = { width: WIDTH, height: HEIGHT, roads, rail, station: at(stationNode), clinic: at({ lat: STUDIO_AT[0], lon: STUDIO_AT[1] }), door: at(where.get(studio)), walk };
writeFileSync(
  OUT,
  `// Generated by scripts/build-map.mjs from OpenStreetMap data (© OpenStreetMap contributors, ODbL). Do not edit by hand.
` +
    `export const clinicMap = ${JSON.stringify(data, null, 2)} as const;
`,
);
console.log(`clinic at ${STUDIO_AT.map((n) => n.toFixed(5))}; MRT Chok Chai 4 to the clinic: ${walk.metres} m, ${walk.minutes} min`);
console.log(walk.legs.map((l) => `${l.street || '(unnamed)'} ${l.metres} m`).join(' / '));
console.log(`roads ${Object.values(roads).join('').length} chars, rail ${rail.length} chars`);
