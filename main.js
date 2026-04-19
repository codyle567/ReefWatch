// ── Color helpers ──────────────────────────────────────────────
const COLORS = {
  0: '#00e5a0',  // healthy
  1: '#f5c842',  // watch
  2: '#ff7c2a',  // alert 1
  3: '#ff2d55',  // alert 2
  4: '#ff0066',  // critical
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

// ── Globe setup ─────────────────────────────────────────────────
const globe = Globe()
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
  .atmosphereColor('#1a4a7a')
  .atmosphereAltitude(0.18)
  .pointsData([])
  .pointLat(d => d.latitude)
  .pointLng(d => d.longitude)
  .pointColor(d => stressColor(d.stress_level ?? 0))
  .pointRadius(d => 0.3 + (d.stress_level ?? 0) * 0.15)
  .pointLabel(() => '')
  .pointAltitude(0.01)
  .pointResolution(8)
  .onPointHover(handleHover)
  (document.getElementById('globe-container'));

// Auto-rotate
globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.4;
globe.controls().enableZoom = true;

let idleTimer;
const IDLE_MS = 60000; // resume rotation after a minute of inactivity

function resetIdleTimer() {
  clearTimeout(idleTimer);
  globe.controls().autoRotate = false;
  idleTimer = setTimeout(() => {
    globe.controls().autoRotate = true;
  }, IDLE_MS);
}

globe.controls().addEventListener('start', resetIdleTimer);

function onResize() {
  globe.width(window.innerWidth).height(window.innerHeight);
}
window.addEventListener('resize', onResize);

// ── Tooltip ─────────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

// Track mouse position independently — onPointHover doesn't always pass a valid event
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

function handleHover(point) {
  if (!point) {
    tooltip.classList.remove('visible');
    return;
  }

  const stress = point.stress_level ?? 0;
  const color  = stressColor(stress);

  document.getElementById('tt-name').textContent      = point.name;
  document.getElementById('tt-region').textContent    = `${point.subregion} · ${point.region}`;
  document.getElementById('tt-sst').textContent       = point.sst_max != null ? `${point.sst_max.toFixed(2)} °C` : '—';
  document.getElementById('tt-threshold').textContent = `${point.bleaching_threshold.toFixed(2)} °C`;
  document.getElementById('tt-dhw').textContent       = point.dhw != null ? `${point.dhw} °C-weeks` : '—';

  const badge = document.getElementById('tt-stress-badge');
  badge.textContent  = stressLabel(stress);
  badge.style.background = color + '22';
  badge.style.color      = color;
  badge.style.border     = `1px solid ${color}55`;

  // Position tooltip near cursor
  let x = mouseX + 16, y = mouseY - 16;
  if (x + 260 > window.innerWidth)  x = mouseX - 260 - 32;
  if (y + 200 > window.innerHeight) y = window.innerHeight - 208;
  if (y < 8) y = 8;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
  tooltip.classList.add('visible');
}

// ── Fetch data ──────────────────────────────────────────────────
async function fetchStations() {
  const res = await fetch('https://api.allorigins.win/raw?url=https://api.coral.tsr.lol/stations');
  const data = await res.json();
  return data;
}

// Fetch current data for all stations
// We batch them so we don't fire hundreds of requests at once
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
      return {
        ...base,
        stress_level: c.stress_level ?? 0,
        sst_max:      c.sst_max,
        dhw:          c.dhw,
      };
    }
    return { ...base, stress_level: 0 };
  });
}

// ── Stats updater ───────────────────────────────────────────────
function updateStats(points) {
  const counts = { healthy: 0, watch: 0, alert: 0, severe: 0 };
  points.forEach(p => {
    const l = p.stress_level ?? 0;
    if (l === 0)      counts.healthy++;
    else if (l === 1) counts.watch++;
    else if (l === 2) counts.alert++;
    else              counts.severe++;
  });

  document.getElementById('stat-total').textContent   = points.length;
  document.getElementById('stat-healthy').textContent = counts.healthy;
  document.getElementById('stat-watch').textContent   = counts.watch;
  document.getElementById('stat-alert').textContent   = counts.alert;
  document.getElementById('stat-severe').textContent  = counts.severe;

  const threatened = counts.watch + counts.alert + counts.severe;
  document.getElementById('status-text').textContent =
    threatened > 0
      ? `${threatened} REEFS UNDER STRESS`
      : 'ALL STATIONS STABLE';
}

// ── Main ────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 2 minutes
let cachedStations = null;
 
async function refresh() {
  if (document.hidden) return;
 
  try {
    // Only fetch the station list once — it doesn't change
    if (!cachedStations) {
      cachedStations = await fetchStations();
      cachedStations.sort((a, b) => b.avg_max_monthly_mean - a.avg_max_monthly_mean);
      globe.pointsData(cachedStations); // show pins immediately, stress loads next
    }
 
    const withStress = await fetchCurrentBatch(cachedStations);
    globe.pointsData(withStress);
    updateStats(withStress);
 
    // Append last-refreshed time to status badge
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
 
  // Poll every 5 min, skipping when tab is hidden
  setInterval(refresh, POLL_INTERVAL_MS);
}

main();
