// ── Color helpers ──────────────────────────────────────────────
const COLORS = {
  0: '#00e5a0',
  1: '#f5c842',
  2: '#ff7c2a',
  3: '#ff2d55',
  4: '#ff0066',
};

const LABELS = {
  0: 'No Stress',
  1: 'Bleach Watch',
  2: 'Bleach Alert 1',
  3: 'Bleach Alert 2',
  4: 'Critical',
};

function stressColor(level) {
  return COLORS[Math.min(level, 4)] || COLORS[0];
}

function stressLabel(level) {
  return LABELS[Math.min(level, 4)] || LABELS[0];
}

// ── Heatmap color ramp ──────────────────────────────────────────
// heatmapColorFn is called with the layer object and must RETURN a (t => color) fn.
// r_ unwraps it as: A = colorFn(layerObj), then A(t/99) for each color stop.
const HEATMAP_COLOR_STOPS = [
  { t: 0.00, r: 0,   g: 229, b: 160 },  // #00e5a0 healthy teal
  { t: 0.33, r: 245, g: 200, b: 66  },  // #f5c842 watch gold
  { t: 0.66, r: 255, g: 124, b: 42  },  // #ff7c2a alert orange
  { t: 1.00, r: 255, g: 0,   b: 102 },  // #ff0066 critical pink
];

function reefColorRamp(t) {
  const stops = HEATMAP_COLOR_STOPS;
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const f = lo.t === hi.t ? 0 : (t - lo.t) / (hi.t - lo.t);
  const lerp = (a, b) => Math.round(a + (b - a) * f);
  const alpha = Math.min(1, t * 1.5 + 0.1);
  return `rgba(${lerp(lo.r, hi.r)},${lerp(lo.g, hi.g)},${lerp(lo.b, hi.b)},${alpha.toFixed(2)})`;
}

// heatmapColorFn(layerObj) → (t) => color  — the required higher-order shape
function heatmapColorFactory(_layerObj) {
  return reefColorRamp;
}

// ── Heat stress plain-English summary ──────────────────────────
function dhwSummary(dhw, stress) {
  if (stress === 0) return 'No heat stress detected. This reef appears healthy.';
  if (stress === 1) return 'Some heat stress is building. Corals may show early signs of stress.';
  if (stress === 2) return `Significant heat stress. Bleaching is likely at this reef.`;
  if (stress === 3) return `Severe heat stress. Bleaching is occurring at this reef.`;
  return `Critical heat stress (Alert ${stress}! Coral death is possible at this reef.`;
}

// ── Tooltip (defined before Globe so it can be passed as callback) ──
const tooltip = document.getElementById('tooltip');
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

function handleHover(point) {
  if (!point) { tooltip.classList.remove('visible'); return; }

  const stress = point.stress_level ?? 0;
  const color  = stressColor(stress);

  document.getElementById('tt-name').textContent      = point.name;
  document.getElementById('tt-region').textContent    = `${point.subregion} · ${point.region}`;
  document.getElementById('tt-sst').textContent       = point.sst_max != null ? `${point.sst_max.toFixed(2)} °C` : '—';
  document.getElementById('tt-threshold').textContent = `${point.bleaching_threshold.toFixed(2)} °C`;
  document.getElementById('tt-dhw').textContent       = point.dhw != null ? point.dhw.toFixed(1) : '—';

  const badge = document.getElementById('tt-stress-badge');
  badge.textContent      = stressLabel(stress);
  badge.style.background = color + '22';
  badge.style.color      = color;
  badge.style.border     = `1px solid ${color}55`;

  document.getElementById('tt-summary').textContent = dhwSummary(point.dhw, stress);

  let x = mouseX + 16, y = mouseY - 16;
  if (x + 260 > window.innerWidth)  x = mouseX - 260 - 32;
  if (y + 200 > window.innerHeight) y = window.innerHeight - 208;
  if (y < 8) y = 8;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
  tooltip.classList.add('visible');
}

// ── Globe setup ─────────────────────────────────────────────────
const globe = Globe()
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
  .atmosphereColor('#1a4a7a')
  .atmosphereAltitude(0.18)
  // Points
  .pointsData([])
  .pointLat(d => d.latitude)
  .pointLng(d => d.longitude)
  .pointColor(d => stressColor(d.stress_level ?? 0))
  .pointRadius(d => 0.3 + (d.stress_level ?? 0) * 0.15)
  .pointLabel(() => '')
  .pointAltitude(0.01)
  .pointResolution(24)
  // Heatmap — accessors are called with each layer object (not point objects).
  // heatmapPoints(layerObj) → the array of points for that layer (we store them on .points)
  // heatmapPointLat/Lng/Weight(point) → extract coords from each point object
  .heatmapsData([])
  .heatmapPoints(layer => layer.points)
  .heatmapPointLat(p => p.latitude)
  .heatmapPointLng(p => p.longitude)
  .heatmapPointWeight(p => p.weight)
  .heatmapBandwidth(2.5)
  .heatmapColorSaturation(1.8)
  .heatmapBaseAltitude(0.01)
  .heatmapTopAltitude(0.12)
  .heatmapColorFn(heatmapColorFactory)
  .onPointHover(handleHover)
  (document.getElementById('globe-container'));

// Auto-rotate
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.4;
globe.controls().enableZoom = true;

let idleTimer;
const IDLE_MS = 60000;
function resetIdleTimer() {
  clearTimeout(idleTimer);
  globe.controls().autoRotate = false;
  idleTimer = setTimeout(() => { globe.controls().autoRotate = true; }, IDLE_MS);
}
globe.controls().addEventListener('start', resetIdleTimer);
window.addEventListener('resize', () => globe.width(window.innerWidth).height(window.innerHeight));

// ── View toggle ─────────────────────────────────────────────────
let isHeatmapMode = false;
let currentPoints = [];

function buildHeatmapLayer(points) {
  // Wrap in a layer object — heatmapPoints accessor reads layer.points
  return {
    points: points.map(p => ({
      latitude:  p.latitude,
      longitude: p.longitude,
      weight:    0.1 + ((p.stress_level ?? 0) / 4) * 0.9,
    })),
  };
}

function applyStationsView(points) {
  globe.heatmapsData([]).pointsData(points);
  globe.onPointHover(handleHover);
}

function applyHeatmapView(points) {
  globe.pointsData([]).heatmapsData([buildHeatmapLayer(points)]);
  tooltip.classList.remove('visible');
  globe.onPointHover(null);
}

document.getElementById('view-toggle').addEventListener('change', function () {
  isHeatmapMode = this.checked;
  isHeatmapMode ? applyHeatmapView(currentPoints) : applyStationsView(currentPoints);
});

// ── Fetch data ──────────────────────────────────────────────────
async function fetchStations() {
  const res = await fetch('https://api.allorigins.win/raw?url=https://api.coral.tsr.lol/stations');
  return res.json();
}

async function fetchCurrentBatch(stations) {
  const results = await Promise.allSettled(
    stations.map(s =>
      fetch(`https://api.allorigins.win/raw?url=https://api.coral.tsr.lol/stations/${s.slug}/current`)
        .then(r => r.json())
    )
  );
  return results.map((r, i) => {
    const base = stations[i];
    if (r.status === 'fulfilled' && r.value.current) {
      const c = r.value.current;
      return { ...base, stress_level: c.stress_level ?? 0, sst_max: c.sst_max, dhw: c.dhw };
    }
    return { ...base, stress_level: 0 };
  });
}

// ── Stats ───────────────────────────────────────────────────────
function updateStats(points) {
  const counts = { healthy: 0, watch: 0, alert: 0, severe: 0 };
  points.forEach(p => {
    const l = p.stress_level ?? 0;
    if (l === 0) counts.healthy++;
    else if (l === 1) counts.watch++;
    else if (l === 2) counts.alert++;
    else counts.severe++;
  });
  document.getElementById('stat-total').textContent   = points.length;
  document.getElementById('stat-healthy').textContent = counts.healthy;
  document.getElementById('stat-watch').textContent   = counts.watch;
  document.getElementById('stat-alert').textContent   = counts.alert;
  document.getElementById('stat-severe').textContent  = counts.severe;

  const threatened = counts.watch + counts.alert + counts.severe;
  document.getElementById('status-text').textContent =
    threatened > 0 ? `${threatened} REEFS UNDER STRESS` : 'ALL STATIONS STABLE';
}

// ── Main ────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5 * 60 * 1000;
let cachedStations = null;

async function refresh() {
  if (document.hidden) return;
  try {
    if (!cachedStations) {
      cachedStations = await fetchStations();
      cachedStations.sort((a, b) => b.avg_max_monthly_mean - a.avg_max_monthly_mean);
    }
    const withStress = await fetchCurrentBatch(cachedStations);
    currentPoints = withStress;
    isHeatmapMode ? applyHeatmapView(currentPoints) : applyStationsView(currentPoints);
    updateStats(withStress);
    const hhmm = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusEl = document.getElementById('status-text');
    statusEl.textContent = statusEl.textContent.replace(/ · .*/, '') + ` · ${hhmm}`;
  } catch (err) {
    console.error('Refresh failed:', err);
  }
}

async function main() {
  try {
    await refresh();
    document.getElementById('loading').classList.add('hidden');
  } catch (err) {
    console.error('Failed to load reef data:', err);
    document.getElementById('loading').querySelector('p').textContent =
      'ERROR LOADING DATA — CHECK CONSOLE';
    return;
  }
  setInterval(refresh, POLL_INTERVAL_MS);
}

main();